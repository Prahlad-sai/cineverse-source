import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["POST"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to like reviews." });
  const reviewId = String(req.body?.review_id || "");
  if (!reviewId || typeof req.body?.liked !== "boolean") return res.status(400).json({ error: "A review id and liked state are required." });
  const exists = await db.query("SELECT id FROM reviews WHERE id=$1", [reviewId]);
  if (!exists.rows.length) return res.status(404).json({ error: "Review not found." });
  if (req.body.liked) {
    await db.query("INSERT INTO review_likes (review_id,user_id) VALUES ($1,$2) ON CONFLICT (review_id,user_id) DO NOTHING", [reviewId,String(user.id)]);
  } else {
    await db.query("DELETE FROM review_likes WHERE review_id=$1 AND user_id=$2", [reviewId,String(user.id)]);
  }
  const { rows } = await db.query("SELECT COUNT(*)::int AS likes FROM review_likes WHERE review_id=$1", [reviewId]);
  return res.json({ ok: true, likes: rows[0]?.likes || 0, liked: req.body.liked });
}