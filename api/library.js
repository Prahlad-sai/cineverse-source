import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET", "POST", "DELETE"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to use your cinema library." });
  if (req.method === "POST") {
    const { movie, kind } = req.body || {};
    if (!movie || !Number.isFinite(Number(movie.id)) || !["watchlist","watched","favourites"].includes(kind)) return res.status(400).json({ error: "A valid movie and library category are required." });
    await db.query("INSERT INTO user_library (user_id, movie_id, movie_data, kind) VALUES ($1,$2,$3::jsonb,$4) ON CONFLICT (user_id,movie_id,kind) DO NOTHING", [user.id, Number(movie.id), JSON.stringify(movie), kind]);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await db.query("DELETE FROM user_library WHERE user_id=$1 AND movie_id=$2 AND kind=$3", [user.id, Number(req.body?.movie_id), req.body?.kind]);
    return res.json({ ok: true });
  }
  const kind = ["watchlist","watched","favourites"].includes(req.query.kind) ? req.query.kind : "watchlist";
  const { rows } = await db.query("SELECT movie_data AS movie, created_at FROM user_library WHERE user_id=$1 AND kind=$2 ORDER BY created_at DESC LIMIT 100", [user.id, kind]);
  res.json({ results: rows });
}