import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to view your cinema statistics." });
  const a = await db.query("SELECT COUNT(*)::int AS watched FROM user_library WHERE user_id=$1 AND kind='watched'", [user.id]);
  const b = await db.query("SELECT COUNT(*)::int AS reviews, AVG(rating)::numeric(4,1) AS average_rating FROM reviews WHERE user_id=$1", [user.id]);
  res.json({ watched: a.rows[0]?.watched || 0, reviews: b.rows[0]?.reviews || 0, average_rating: b.rows[0]?.average_rating || null, genres: [] });
}