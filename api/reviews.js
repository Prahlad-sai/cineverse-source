import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["POST"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to publish a review." });
  const movieId = Number(req.body?.movie_id), rating = Number(req.body?.rating), content = String(req.body?.content || "").trim();
  if (!Number.isInteger(movieId) || !Number.isInteger(rating) || rating < 1 || rating > 10 || !content || content.length > 3000) return res.status(400).json({ error: "Enter a rating and a review (up to 3,000 characters)." });
  const { rows } = await db.query("INSERT INTO reviews (user_id,movie_id,movie_title,rating,content) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,movie_id) DO UPDATE SET rating=EXCLUDED.rating, content=EXCLUDED.content, created_at=NOW() RETURNING id", [user.id, movieId, String(req.body?.movie_title || "Movie").slice(0,200), rating, content]);
  res.json({ ok: true, id: rows[0]?.id });
}