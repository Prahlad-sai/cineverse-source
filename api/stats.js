import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await auth.getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to view your cinema statistics." });

  const [watchedResult, reviewResult] = await Promise.all([
    db.query("SELECT movie_id, movie_data, COALESCE(watched_at, created_at) AS watched_at FROM user_library WHERE user_id=$1 AND kind='watched' ORDER BY COALESCE(watched_at, created_at) DESC LIMIT 500", [user.id]),
    db.query("SELECT COUNT(*)::int AS reviews, AVG(rating)::numeric(4,1) AS average_rating FROM reviews WHERE user_id=$1", [user.id])
  ]);

  const movies = watchedResult.rows || [];
  const genreCounts = new Map();
  const directorCounts = new Map();
  const monthCounts = new Map();

  for (const row of movies) {
    const movie = row.movie_data || {};
    let genres = Array.isArray(movie.genres) ? movie.genres.map(g => typeof g === "string" ? g : g?.name).filter(Boolean) : [];
    if (!genres.length && Array.isArray(movie.genre_names)) genres = movie.genre_names.filter(Boolean);
    for (const name of genres) genreCounts.set(name, (genreCounts.get(name) || 0) + 1);

    const crew = movie.credits?.crew || movie.credits?.results?.crew || [];
    const directors = crew.filter(person => person?.job === "Director").map(person => person.name).filter(Boolean);
    for (const name of directors) directorCounts.set(name, (directorCounts.get(name) || 0) + 1);

    if (row.watched_at) {
      const date = new Date(row.watched_at);
      if (!Number.isNaN(date.getTime())) {
        const key = date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
        monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
      }
    }
  }

  const genres = [...genreCounts.entries()].map(([name, count]) => ({ name, count, percent: movies.length ? Math.round(count / movies.length * 100) : 0 })).sort((a, b) => b.count - a.count).slice(0, 8);
  const directors = [...directorCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);

  const months = [];
  const now = new Date();
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
    months.push({ key, label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), count: monthCounts.get(key) || 0 });
  }

  const review = reviewResult.rows[0] || {};
  res.json({
    watched: movies.length,
    reviews: review.reviews || 0,
    average_rating: review.average_rating || null,
    genres,
    directors,
    months,
    taste_profile: genres.length
      ? "You lean towards " + genres.slice(0, 2).map(g => g.name.toLowerCase()).join(" and ") + " stories."
      : "Your taste profile will take shape as you mark films as watched."
  });
}