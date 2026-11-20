import { tmdb } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  try { const d = await tmdb("/genre/movie/list"); res.json(d); }
  catch (e) { res.status(503).json({ error: e.message }); }
}