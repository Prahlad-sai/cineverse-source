import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  try { const d = await tmdb("/discover/movie", { sort_by: "vote_average.desc", "vote_count.gte": 180, "vote_count.lte": 1800, "vote_average.gte": 7.4, "vote_average.lte": 8.5, with_original_language: "en", page: 1 }); res.json({ results: movieList(d).slice(0, 10) }); }
  catch (e) { res.status(503).json({ error: e.message }); }
}