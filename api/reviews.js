import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET", "POST"];
export default async function (req, res) {
  if (req.method === "GET") {
    const movieId = Number(req.query?.movie_id);
    if (!Number.isSafeInteger(movieId) || movieId <= 0) return res.status(400).json({ error: "A valid movie_id is required." });
    const { rows } = await db.query("SELECT id,rating,content,spoiler,created_at FROM reviews WHERE movie_id=$1 ORDER BY created_at DESC LIMIT 30", [movieId]);
    return res.json({ results: rows });
  }
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to publish a review." });
  const movieId = Number(req.body?.movie_id), rating = Number(req.body?.rating), content = String(req.body?.content || "").trim();
  if (!Number.isSafeInteger(movieId) || movieId <= 0 || !Number.isInteger(rating) || rating < 1 || rating > 10 || !content || content.length > 3000) return res.status(400).json({ error: "Enter a rating and a review (up to 3,000 characters)." });
  const spoiler = req.body?.spoiler === true;
  const { rows } = await db.query("INSERT INTO reviews (user_id,movie_id,movie_title,rating,content,spoiler) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,movie_id) DO UPDATE SET rating=EXCLUDED.rating, content=EXCLUDED.content, spoiler=EXCLUDED.spoiler, created_at=NOW() RETURNING id", [user.id, movieId, String(req.body?.movie_title || "Movie").slice(0,200), rating, content, spoiler]);
  res.json({ ok: true, id: rows[0]?.id });
}