import { tmdb } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  try {
    const id = encodeURIComponent(req.params.id);
    const d = await tmdb("/movie/" + id, { append_to_response: "credits,videos,similar" });
    res.json(d);
  } catch (e) { res.status(503).json({ error: e.message }); }
}