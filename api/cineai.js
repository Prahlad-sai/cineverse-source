import { ai, config } from "hatchable";
import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["POST"];
export default async function (req, res) {
  const message = String(req.body?.message || "").trim();
  if (!message || message.length > 1200) return res.status(400).json({ error: "Tell CineAI what kind of film you're looking for (up to 1,200 characters)." });
  try {
    const d = await tmdb("/movie/popular", { page: 1 });
    const candidates = movieList(d).slice(0, 18);
    const compact = candidates.map(m => ({ id:m.id,title:m.title,year:(m.release_date||"").slice(0,4),rating:m.vote_average,overview:m.overview.slice(0,240) }));
    const result = await ai.generateText({
      model: (await config.get("ai_model")) || "gpt",
      system: "You are CineAI, a thoughtful and spoiler-conscious film curator. Recommend only films present in the supplied candidate list. Never invent a title, cast member, plot detail, runtime, rating, or availability. If the list does not contain a strong match, say so and ask for a refined clue. Keep the response warm, concise, and useful. Explain why the best matches fit the user's mood. Avoid spoilers.",
      prompt: "Viewer request: " + message + "\n\nVerified TMDB candidates (the only films you may recommend):\n" + JSON.stringify(compact) + "\n\nRecommend up to three candidates by exact title, explaining each fit. If none fit, say that honestly."
    });
    res.json({ reply: result.text || result.output || "I found a few possibilities in the movie catalogue. Take a look below and tell me what direction feels right.", movies: candidates.slice(0, 6) });
  } catch (e) { res.status(503).json({ error: e.message || "CineAI is unavailable right now. Check the AI provider setup." }); }
}