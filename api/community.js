import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET", "POST", "PUT"];

async function ensureProfile(user) {
  const uid = String(user.id);
  const suggested = String(user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14);
  const handle = (suggested.length >= 3 ? suggested : "cinephile") + "_" + uid.replace(/[^a-z0-9]/gi, "").slice(-5).toLowerCase();
  const display = String(user.name || user.display_name || user.email?.split("@")[0] || "Cinephile").slice(0, 40);
  await db.query(
    "INSERT INTO community_profiles(user_id,handle,display_name) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING",
    [uid, handle.slice(0,24), display || "Cinephile"]
  );
  return uid;
}

export default async function(req,res) {
  const user = await auth.getUser(req);
  const uid = user ? String(user.id) : null;

  if (req.method === "GET") {
    const view = String(req.query?.view || "feed");
    if (view === "feed") {
      const scope = req.query?.scope === "following" ? "following" : "all";
      if (scope === "following" && !uid) return res.status(401).json({error:"Sign in to see posts from people you follow."});
      const {rows} = await db.query(
        `SELECT r.id,r.user_id,r.movie_id,r.movie_title,r.rating,r.content,r.spoiler,r.created_at,
          p.handle,p.display_name,COALESCE(l.likes,0)::int AS likes,
          CASE WHEN $2::text IS NULL THEN FALSE ELSE EXISTS(SELECT 1 FROM review_likes mine WHERE mine.review_id=r.id AND mine.user_id=$2) END AS liked_by_me,
          CASE WHEN $2::text IS NULL THEN FALSE ELSE EXISTS(SELECT 1 FROM community_follows f WHERE f.follower_id=$2 AND f.following_id=r.user_id) END AS followed_by_me
         FROM reviews r
         LEFT JOIN community_profiles p ON p.user_id=r.user_id
         LEFT JOIN (SELECT review_id,COUNT(*) AS likes FROM review_likes GROUP BY review_id) l ON l.review_id=r.id
         WHERE ($1::text='all' OR r.user_id IN (SELECT following_id FROM community_follows WHERE follower_id=$2))
         ORDER BY r.created_at DESC LIMIT 40`,
        [scope, uid]
      );
      return res.json({posts:rows,scope});
    }

    if (view === "people") {
      const search = String(req.query?.q || "").trim().slice(0,50);
      const {rows} = await db.query(
        `SELECT p.user_id,p.handle,p.display_name,p.bio,p.favorite_genres,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.following_id=p.user_id) AS followers,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.follower_id=p.user_id) AS following,
          CASE WHEN $2::text IS NULL THEN FALSE ELSE EXISTS(SELECT 1 FROM community_follows mine WHERE mine.follower_id=$2 AND mine.following_id=p.user_id) END AS is_following
         FROM community_profiles p
         WHERE p.user_id<>COALESCE($2::text,'') AND ($1='' OR p.handle ILIKE '%'||$1||'%' OR p.display_name ILIKE '%'||$1||'%')
         ORDER BY followers DESC,p.created_at DESC LIMIT 30`,
        [search,uid]
      );
      return res.json({people:rows});
    }

    if (view === "profile") {
      const target = String(req.query?.user_id || "");
      if (!target) return res.status(400).json({error:"A profile id is required."});
      const {rows} = await db.query(
        `SELECT p.user_id,p.handle,p.display_name,p.bio,p.favorite_genres,p.created_at,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.following_id=p.user_id) AS followers,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.follower_id=p.user_id) AS following,
          CASE WHEN $2::text IS NULL THEN FALSE ELSE EXISTS(SELECT 1 FROM community_follows f WHERE f.follower_id=$2 AND f.following_id=p.user_id) END AS is_following
         FROM community_profiles p WHERE p.user_id=$1`,
        [target,uid]
      );
      if (!rows.length) return res.status(404).json({error:"Cinephile profile not found."});
      const {rows:reviews} = await db.query("SELECT id,movie_id,movie_title,rating,content,spoiler,created_at FROM reviews WHERE user_id=$1 ORDER BY created_at DESC LIMIT 12",[target]);
      return res.json({profile:rows[0],reviews});
    }

    if (view === "me") {
      if (!user) return res.status(401).json({error:"Sign in to create your cinephile profile."});
      await ensureProfile(user);
      const {rows} = await db.query(
        `SELECT p.user_id,p.handle,p.display_name,p.bio,p.favorite_genres,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.following_id=p.user_id) AS followers,
          (SELECT COUNT(*)::int FROM community_follows f WHERE f.follower_id=p.user_id) AS following
         FROM community_profiles p WHERE p.user_id=$1`,
        [uid]
      );
      return res.json({profile:rows[0]});
    }
    return res.status(400).json({error:"Unknown community view."});
  }

  if (!user) return res.status(401).json({error:"Sign in to use community features."});
  await ensureProfile(user);

  if (req.method === "PUT") {
    const display = String(req.body?.display_name || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const genres = Array.isArray(req.body?.favorite_genres) ? req.body.favorite_genres.map(x=>String(x).trim()).filter(Boolean).slice(0,8) : [];
    if (display.length < 1 || display.length > 40 || bio.length > 240 || genres.some(x=>x.length>30))
      return res.status(400).json({error:"Name must be 1–40 characters, bio up to 240, and up to 8 favourite genres."});
    const {rows} = await db.query(
      "UPDATE community_profiles SET display_name=$1,bio=$2,favorite_genres=$3::jsonb,updated_at=NOW() WHERE user_id=$4 RETURNING user_id,handle,display_name,bio,favorite_genres",
      [display,bio,JSON.stringify(genres),uid]
    );
    return res.json({ok:true,profile:rows[0]});
  }

  if (req.method === "POST") {
    const target = String(req.body?.user_id || "");
    if (!target || target === uid) return res.status(400).json({error:"Choose another cinephile to follow."});
    const exists = await db.query("SELECT user_id FROM community_profiles WHERE user_id=$1",[target]);
    if (!exists.rows.length) return res.status(404).json({error:"Cinephile profile not found."});
    if (req.body?.follow === true) {
      await db.query("INSERT INTO community_follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT(follower_id,following_id) DO NOTHING",[uid,target]);
    } else if (req.body?.follow === false) {
      await db.query("DELETE FROM community_follows WHERE follower_id=$1 AND following_id=$2",[uid,target]);
    } else return res.status(400).json({error:"A follow state is required."});
    const {rows} = await db.query("SELECT COUNT(*)::int AS followers FROM community_follows WHERE following_id=$1",[target]);
    return res.json({ok:true,following:req.body.follow,followers:rows[0]?.followers||0});
  }
}