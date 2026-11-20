import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  try { const d = await tmdb("/movie/top_rated", { page: req.query.page || 1 }); res.json({ results: movieList(d) }); }
  catch (e) { res.status(503).json({ error: e.message }); }
}