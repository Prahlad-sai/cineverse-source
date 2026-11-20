import { db, auth } from "hatchable";
export const access = "public";
export const methods = ["GET","POST","PUT","DELETE"];
export default async function(req,res){
 const user=await auth.getUser(req);
 if(!user)return res.status(401).json({error:"Sign in to manage your collections."});
 const uid=String(user.id);
 if(req.method==="GET"){
  const {rows}=await db.query(`SELECT c.id,c.name,c.description,c.created_at,COUNT(cm.id)::int AS movie_count
   FROM user_collections c LEFT JOIN collection_movies cm ON cm.collection_id=c.id AND cm.user_id=$1
   WHERE c.user_id=$1 GROUP BY c.id ORDER BY c.created_at DESC`,[uid]);
  const collectionId=String(req.query?.id||"");
  if(collectionId){
   const {rows:movies}=await db.query("SELECT movie_data AS movie,added_at FROM collection_movies WHERE collection_id=$1 AND user_id=$2 ORDER BY added_at DESC",[collectionId,uid]);
   return res.json({collections:rows,movies});
  }
  return res.json({collections:rows});
 }
 if(req.method==="POST"){
  if(req.body?.action==="add_movie"){
   const collectionId=String(req.body.collection_id||""),movie=req.body.movie;
   if(!collectionId||!movie||!Number.isSafeInteger(Number(movie.id)))return res.status(400).json({error:"Choose a collection and a valid movie."});
   const own=await db.query("SELECT id FROM user_collections WHERE id=$1 AND user_id=$2",[collectionId,uid]);
   if(!own.rows.length)return res.status(404).json({error:"Collection not found."});
   await db.query("INSERT INTO collection_movies(user_id,collection_id,movie_id,movie_data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(collection_id,movie_id) DO NOTHING",[uid,collectionId,Number(movie.id),JSON.stringify(movie)]);
   return res.json({ok:true});
  }
  const name=String(req.body?.name||"").trim(),description=String(req.body?.description||"").trim();
  if(!name||name.length>60||description.length>240)return res.status(400).json({error:"Collection name must be 1–60 characters; description up to 240."});
  try{const {rows}=await db.query("INSERT INTO user_collections(user_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,created_at",[uid,name,description]);return res.json({ok:true,collection:rows[0]});}
  catch(e){if(String(e.message||"").toLowerCase().includes("unique"))return res.status(409).json({error:"You already have a collection with that name."});throw e;}
 }
 if(req.method==="PUT"){
  const id=String(req.body?.id||""),name=String(req.body?.name||"").trim(),description=String(req.body?.description||"").trim();
  if(!id||!name||name.length>60||description.length>240)return res.status(400).json({error:"A collection id and valid name are required."});
  const {rows}=await db.query("UPDATE user_collections SET name=$1,description=$2 WHERE id=$3 AND user_id=$4 RETURNING id",[name,description,id,uid]);
  if(!rows.length)return res.status(404).json({error:"Collection not found."});
  return res.json({ok:true});
 }
 if(req.method==="DELETE"){
  if(req.body?.action==="remove_movie"){
   await db.query("DELETE FROM collection_movies WHERE collection_id=$1 AND movie_id=$2 AND user_id=$3",[String(req.body.collection_id),Number(req.body.movie_id),uid]);
   return res.json({ok:true});
  }
  const id=String(req.body?.id||"");
  const {rows}=await db.query("DELETE FROM user_collections WHERE id=$1 AND user_id=$2 RETURNING id",[id,uid]);
  if(!rows.length)return res.status(404).json({error:"Collection not found."});
  return res.json({ok:true});
 }
}