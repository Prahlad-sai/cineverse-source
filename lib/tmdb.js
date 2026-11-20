import { config } from "hatchable";
const BASE = "https://api.themoviedb.org/3";
export async function tmdb(path, params = {}) {
  const key = await config.get("TMDB_API_KEY");
  if (!key) throw new Error("TMDB_API_KEY is not configured yet. Add your TMDB API key in Hatchable project Setup.");
  const url = new URL(BASE + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("TMDB request failed (" + response.status + "). Please try again.");
  return response.json();
}
export function movieList(data) {
  return (data.results || []).map(m => ({
    id: m.id, title: m.title || m.name, overview: m.overview || "",
    poster_path: m.poster_path, backdrop_path: m.backdrop_path,
    release_date: m.release_date || m.first_air_date || "",
    vote_average: m.vote_average || 0, vote_count: m.vote_count || 0,
    genre_ids: m.genre_ids || [], media_type: m.media_type || "movie"
  }));
}