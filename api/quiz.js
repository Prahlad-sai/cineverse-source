import { tmdb, movieList } from "lib/tmdb";
import { db, auth } from "hatchable";

export const access = "public";
export const methods = ["GET", "POST"];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function yearOptions(correct, pool) {
  const years = new Set([correct]);
  const nearby = shuffle(pool.filter(y => y !== correct));
  for (const y of nearby) {
    years.add(y);
    if (years.size === 4) break;
  }
  for (const delta of [-1, 1, -2, 2, -3, 3, -4, 4]) {
    if (years.size === 4) break;
    years.add(correct + delta);
  }
  return shuffle([...years].map(String));
}

export default async function (req, res) {
  if (req.method === "POST") {
    const user = await auth.requireUser(req, res);
    if (!user) return;
    const score = Number(req.body?.score);
    const total = Number(req.body?.total);
    const duration = Number(req.body?.duration_seconds || 0);
    const mode = ["mixed", "poster", "year", "plot"].includes(req.body?.mode) ? req.body.mode : "mixed";
    if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 10 || score < 0 || score > total || !Number.isFinite(duration) || duration < 0 || duration > 3600) {
      return res.status(400).json({ error: "Invalid quiz result." });
    }
    const saved = await db.query(
      "INSERT INTO quiz_attempts (user_id, score, total, mode, duration_seconds) VALUES ($1,$2,$3,$4,$5) RETURNING id, score, total, mode, duration_seconds, created_at",
      [user.id, score, total, mode, Math.round(duration)]
    );
    return res.status(201).json({ attempt: saved.rows[0] });
  }

  if (req.query.history === "1") {
    const user = await auth.getUser(req);
    if (!user) return res.json({ signedIn: false, attempts: [] });
    const result = await db.query(
      "SELECT id, score, total, mode, duration_seconds, created_at FROM quiz_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",
      [user.id]
    );
    return res.json({ signedIn: true, attempts: result.rows });
  }

  try {
    const mode = ["mixed", "poster", "year", "plot"].includes(req.query.mode) ? req.query.mode : "mixed";
    const trending = await tmdb("/trending/movie/week", { page: 1 });
    const popular = await tmdb("/movie/popular", { page: 1 });
    const films = [...new Map([...movieList(trending), ...movieList(popular)].filter(m => m.title && m.release_date && m.poster_path && m.overview).map(m => [m.id, m])).values()];
    if (films.length < 4) throw new Error("Not enough movie data to build a quiz.");
    const chosen = shuffle(films).slice(0, 5);
    const allYears = films.map(m => Number(String(m.release_date).slice(0, 4))).filter(y => y > 1900);
    const questions = chosen.map((movie, index) => {
      const type = mode === "mixed" ? ["poster", "year", "plot"][index % 3] : mode;
      if (type === "poster") {
        const options = shuffle([movie.title, ...shuffle(films.filter(m => m.id !== movie.id)).slice(0, 3).map(m => m.title)]);
        return { type, question: "Which movie is shown in this poster?", image: "https://image.tmdb.org/t/p/w500" + movie.poster_path, options, answer: options.indexOf(movie.title), reveal: movie.title };
      }
      if (type === "year") {
        const correct = Number(movie.release_date.slice(0, 4));
        const options = yearOptions(correct, allYears);
        return { type, question: "In which year was " + movie.title + " released?", options, answer: options.indexOf(String(correct)), reveal: movie.title + " (" + correct + ")" };
      }
      const clue = movie.overview.length > 240 ? movie.overview.slice(0, 237).trimEnd() + "…" : movie.overview;
      const options = shuffle([movie.title, ...shuffle(films.filter(m => m.id !== movie.id)).slice(0, 3).map(m => m.title)]);
      return { type: "plot", question: "Which movie matches this plot clue?", clue, options, answer: options.indexOf(movie.title), reveal: movie.title };
    });
    return res.json({ mode, questions, time_per_question: 15 });
  } catch (e) {
    return res.status(503).json({ error: e.message || "Quiz service is temporarily unavailable." });
  }
}