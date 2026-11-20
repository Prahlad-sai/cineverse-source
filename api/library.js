import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET", "POST", "PATCH", "DELETE"];
export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to use your cinema library." });
  if (req.method === "PATCH") {
    const movieId=Number(req.body?.movie_id),kind=req.body?.kind;
    const notes=String(req.body?.notes||"").trim();
    const watchedAt=req.body?.watched_at?new Date(req.body.watched_at):null;
    if(!Number.isSafeInteger(movieId)||movieId<=0||!["watchlist","watched","favourites"].includes(kind)||notes.length>1000||(watchedAt&&Number.isNaN(watchedAt.getTime())))return res.status(400).json({error:"Invalid movie details."});
    const {rows}=await db.query("UPDATE user_library SET notes=$1,watched_at=$2 WHERE user_id=$3 AND movie_id=$4 AND kind=$5 RETURNING movie_id",[notes,kind==="watched"?(watchedAt||new Date()):null,user.id,movieId,kind]);
    if(!rows.length)return res.status(404).json({error:"Movie not found in this library section."});
    return res.json({ok:true});
  }
  if (req.method === "POST") {
    const { movie, kind } = req.body || {};
    if (!movie || !Number.isFinite(Number(movie.id)) || !["watchlist","watched","favourites"].includes(kind)) return res.status(400).json({ error: "A valid movie and library category are required." });
    await db.query("INSERT INTO user_library (user_id, movie_id, movie_data, kind, watched_at) VALUES ($1,$2,$3::jsonb,$4,CASE WHEN $4='watched' THEN NOW() ELSE NULL END) ON CONFLICT (user_id,movie_id,kind) DO UPDATE SET watched_at=CASE WHEN $4='watched' THEN COALESCE(user_library.watched_at,NOW()) ELSE user_library.watched_at END", [user.id, Number(movie.id), JSON.stringify(movie), kind]);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await db.query("DELETE FROM user_library WHERE user_id=$1 AND movie_id=$2 AND kind=$3", [user.id, Number(req.body?.movie_id), req.body?.kind]);
    return res.json({ ok: true });
  }
  const kind = ["watchlist","watched","favourites"].includes(req.query.kind) ? req.query.kind : "all";
  const { rows } = kind === "all"
    ? await db.query("SELECT movie_data AS movie, created_at, watched_at, notes, kind FROM user_library WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300", [user.id])
    : await db.query("SELECT movie_data AS movie, created_at, watched_at, notes, kind FROM user_library WHERE user_id=$1 AND kind=$2 ORDER BY created_at DESC LIMIT 100", [user.id, kind]);
  res.json({ results: rows });
}