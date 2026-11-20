import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ results: [] });
  try { const d = await tmdb("/search/multi", { query: q, include_adult: false, page: req.query.page || 1 }); res.json({ results: movieList(d).filter(m => m.media_type !== "person") }); }
  catch (e) { res.status(503).json({ error: e.message }); }
}