import { ai } from "hatchable";
import { tmdb, movieList } from "lib/tmdb";

export const access = "public";
export const methods = ["POST"];

const GENRES = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  sciencefiction: 878, scifi: 878, thriller: 53, war: 10752, western: 37
};

export default async function (req, res) {
  const message = String(req.body?.message || "").trim();
  if (!message || message.length > 1200) {
    return res.status(400).json({ error: "Tell CineAI what kind of film you're looking for (up to 1,200 characters)." });
  }

  try {
    const normalized = message.toLowerCase().replace(/[^a-z]/g, "");
    const genreIds = [...new Set(Object.entries(GENRES)
      .filter(([name]) => normalized.includes(name))
      .map(([, id]) => id))];

    const params = { sort_by: "popularity.desc", include_adult: false, page: 1 };
    if (genreIds.length) params.with_genres = genreIds.join(",");
    if (/under\s*(2|two)\s*hours?|less than\s*120\s*minutes?|120\s*min/i.test(message)) {
      params["with_runtime.lte"] = 120;
    }

    let data = await tmdb("/discover/movie", params);
    let candidates = movieList(data).filter(m => m.title && m.overview).slice(0, 30);
    if (!candidates.length) {
      data = await tmdb("/movie/popular", { page: 1 });
      candidates = movieList(data).filter(m => m.title && m.overview).slice(0, 30);
    }

    if (!candidates.length) {
      return res.json({ reply: "I couldn't find suitable verified titles in the catalogue just now. Try another genre or mood.", movies: [] });
    }

    const compact = candidates.slice(0, 18).map(m => ({
      id: m.id,
      title: m.title,
      year: (m.release_date || "").slice(0, 4),
      overview: m.overview.slice(0, 260),
      rating: m.vote_average
    }));

    const result = await ai.generateText({
      model: "gemini",
      purpose: "cineai-recommendations",
      maxTokens: 2200,
      system: "You are CineAI, a careful film curator. You must select recommendations ONLY by numeric id from the supplied TMDB candidate list. Never invent or recommend a title absent from that list. Use only the supplied title, year, overview and rating. If no candidate genuinely fits, return an empty recommendations array. Return ONLY valid JSON, no markdown fences, with this exact shape: {\"message\":\"one short helpful intro or honest no-match message\",\"recommendations\":[{\"id\":123,\"reason\":\"one sentence grounded only in the supplied overview\"}]}. Return at most three recommendations. Never claim a runtime unless it is supplied.",
      prompt: "Viewer request: " + message + "\n\nVerified TMDB candidates (the only films you may select):\n" + JSON.stringify(compact)
    });

    if (result.finishReason === "length") {
      return res.status(502).json({ error: "CineAI's response was cut short. Please try again." });
    }

    let parsed;
    try {
      const raw = String(result.text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ reply: "I couldn't confidently match your request to verified titles this time. Try describing the genre or mood differently.", movies: [] });
    }

    const byId = new Map(candidates.map(m => [Number(m.id), m]));
    const seen = new Set();
    const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .filter(item => {
        const id = Number(item.id);
        if (!byId.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 3)
      .map(item => ({
        ...byId.get(Number(item.id)),
        recommendation_reason: String(item.reason || "").slice(0, 260)
      }));

    const intro = recommendations.length
      ? String(parsed.message || "Here are verified matches from the movie catalogue.")
      : String(parsed.message || "I couldn't find a strong match in the verified movie catalogue. Try another genre or mood.");

    const reply = recommendations.length
      ? intro + "\n\n" + recommendations.map(m => m.title + (m.release_date ? " (" + m.release_date.slice(0, 4) + ")" : "") + (m.recommendation_reason ? ": " + m.recommendation_reason : "")).join("\n")
      : intro;

    res.json({ reply, movies: recommendations });
  } catch (e) {
    res.status(503).json({ error: e.message || "CineAI is unavailable right now. Please try again." });
  }
}