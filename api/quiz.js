import { tmdb, movieList } from "lib/tmdb";
export const access = "public";
export const methods = ["GET"];
export default async function (req, res) {
  try {
    const d = await tmdb("/trending/movie/week", { page: 1 });
    const films = movieList(d).filter(m => /^\d{4}/.test(m.release_date)).slice(0, 5);
    const questions = films.map((m, i) => {
      const correct = Number(m.release_date.slice(0,4));
      const options = [...new Set([correct, correct-1, correct+2, correct-3])].sort(() => Math.random() - 0.5);
      return { question: "In which year was “" + m.title + "” released?", options: options.map(String), answer: options.indexOf(correct) };
    });
    res.json({ questions });
  } catch (e) { res.status(503).json({ error: e.message }); }
}