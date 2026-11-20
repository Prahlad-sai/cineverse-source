import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to view your reviews." });
  const { rows } = await db.query("SELECT id,movie_id,movie_title,rating,content,spoiler,created_at FROM reviews WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [user.id]);
  res.json({ results: rows });
}