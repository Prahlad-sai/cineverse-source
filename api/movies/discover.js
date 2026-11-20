import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  const sortMap = { trending: "popularity.desc", popular: "popularity.desc", top_rated: "vote_average.desc", upcoming: "primary_release_date.desc" };
  const sort = sortMap[String(req.query.sort || "trending")] || sortMap.trending;
  const params = { sort_by: sort, page: req.query.page || 1, include_adult: false, "vote_count.gte": 20 };
  if (req.query.genre) params.with_genres = String(req.query.genre);
  if (req.query.sort === "upcoming") params["primary_release_date.gte"] = new Date().toISOString().slice(0,10);
  if (req.query.sort === "top_rated") params["vote_count.gte"] = 300;
  try { const d = await tmdb("/discover/movie", params); res.json({ results: movieList(d) }); }
  catch (e) { res.status(503).json({ error: e.message }); }
}