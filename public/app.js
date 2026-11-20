const API = window.__HATCHABLE__?.api || "/api";
const IMG = "https://image.tmdb.org/t/p/";
const state = { view:"home", sort:"trending", genre:"", queryTimer:null, currentMovie:null, library:"watchlist", quiz:null };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600)}
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function year(date){return date?String(date).slice(0,4):"—"}
function card(movie){const title=escapeHTML(movie.title||movie.name||"Untitled");const poster=movie.poster_path?IMG+"w500"+movie.poster_path:"";const rating=Number(movie.vote_average||0).toFixed(1);return `<article class="movie-card" data-movie="${movie.id}"><div class="poster-wrap">${poster?`<img loading="lazy" src="${poster}" alt="${title} poster">`:`<div class="poster-placeholder">CV</div>`}<span class="rating-pill"><b>★</b> ${rating}</span></div><div class="card-bottom"><span class="movie-title">${title}</span><span class="movie-year">${year(movie.release_date||movie.first_air_date)}</span></div><div class="movie-meta">${(movie.genre_names||[]).slice(0,2).join(" · ")||"FEATURE FILM"}</div></article>`}
async function api(path,options={}){const res=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.error||"Something went wrong");return data}
async function loadMovies(path,target){const el=$(target);if(!el)return;el.innerHTML='<div class="loading-state"><span class="loader"></span>Curating your cinema…</div>';try{const data=await api(path);const movies=data.results||[];el.innerHTML=movies.length?movies.map(card).join(""):'<div class="empty-state">No films found just yet.</div>'}catch(e){el.innerHTML='<div class="empty-state">Movie service is being connected. Add your TMDB API key in project Setup to bring the catalogue to life.</div>'}}
function showView(view){state.view=view;$$(".view").forEach(v=>v.classList.toggle("active-view",v.id==="view-"+view));$$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.view===view));$("#pageLabel").textContent=({home:"Home",discover:"Discover",search:"Search",cineai:"CineAI",library:"My Library",reviews:"My Reviews",stats:"Statistics",collections:"Collections",community:"Community",quiz:"CineQuiz",leaderboard:"Leaderboard"})[view]||"Home";$("#sidebar").classList.remove("open");if(view==="discover"&&!$("#discoverGrid").dataset.loaded){loadDiscover();$("#discoverGrid").dataset.loaded="1"}if(view==="library")loadLibrary();if(view==="collections")loadCollections();if(view==="stats")loadStats();if(view==="reviews")loadReviews();if(view==="community")loadCommunityFeed()}
function go(view){location.hash=view;showView(view)}
function openMovie(id){
  $("#movieModal").classList.add("open");
  $("#movieModalContent").innerHTML='<button class="modal-close" id="modalClose">×</button><div class="modal-loading"><span class="loader"></span>Loading movie file…</div>';
  $("#modalClose").onclick=closeModal;
  Promise.all([api("/movies/"+encodeURIComponent(id)),api("/reviews?movie_id="+encodeURIComponent(id)).catch(()=>({results:[]}))]).then(([m,reviewData])=>{
    state.currentMovie=m;
    const title=escapeHTML(m.title||m.name||"Untitled");
    const poster=m.poster_path?IMG+"w500"+m.poster_path:"";
    const backdrop=m.backdrop_path?IMG+"w1280"+m.backdrop_path:"";
    const director=(m.credits?.crew||[]).find(p=>p.job==="Director");
    const trailer=(m.videos?.results||[]).filter(v=>v.site==="YouTube"&&v.type==="Trailer").sort((a,b)=>Number(b.official)-Number(a.official))[0];
    const cast=(m.credits?.cast||[]).slice(0,10);
    const similar=(m.similar?.results||[]).slice(0,6);
    const reviews=reviewData.results||[];
    const avg=reviews.length?(reviews.reduce((n,r)=>n+Number(r.rating||0),0)/reviews.length).toFixed(1):"—";
    const castHTML=cast.length?cast.map(p=>`<div class="cast-person">${p.profile_path?`<img src="${IMG}w185${p.profile_path}" alt="">`:'<div class="cast-placeholder">✦</div>'}<b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.character||"Cast")}</small></div>`).join(""):'<p class="muted-copy">Cast information is not available.</p>';
    const similarHTML=similar.length?similar.map(card).join(""):'<p class="muted-copy">No similar titles found yet.</p>';
    const reviewsHTML=renderCommunityReviews(reviews);
    $("#movieModalContent").innerHTML=`<button class="modal-close" id="modalClose">×</button>
      <div class="movie-file-hero" ${backdrop?`style="background-image:linear-gradient(90deg,#10121af2 5%,#10121ad9 55%,#10121a88),url('${backdrop}')"`:""}>
        <div class="movie-file-poster">${poster?`<img src="${poster}" alt="${title} poster">`:'<div class="poster-placeholder">CV</div>'}</div>
        <div class="movie-file-copy"><div class="eyebrow">CINEVERSE MOVIE FILE</div><h2>${title}</h2><p class="movie-tagline">${escapeHTML(m.tagline||"")}</p>
          <div class="movie-facts"><span>★ ${Number(m.vote_average||0).toFixed(1)} <small>TMDB</small></span><span>${year(m.release_date)}</span><span>${m.runtime?m.runtime+" min":"Runtime N/A"}</span><span>${escapeHTML(m.original_language||"").toUpperCase()}</span></div>
          <div class="movie-genres">${(m.genres||[]).map(g=>`<span>${escapeHTML(g.name)}</span>`).join("")}</div>
          <p class="movie-overview">${escapeHTML(m.overview||"No synopsis available.")}</p>
          <div class="detail-actions"><button data-save="watchlist">＋ Watchlist</button><button data-save="watched">✓ Mark watched</button><button data-save="favourites">♡ Favourite</button>${trailer?`<a class="trailer-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}" target="_blank" rel="noopener noreferrer">▶ Watch trailer</a>`:""}</div>
          <div class="collection-quick-add"><select id="movieCollectionSelect"><option value="">Add to a collection…</option></select><button id="addMovieToCollection">＋ Add</button></div>
          <div class="movie-credit-line">${director?`Directed by <b>${escapeHTML(director.name)}</b>`:"Director information unavailable"} · ${escapeHTML(m.status||"")}</div>
        </div>
      </div>
      <div class="movie-file-content">
        <section class="movie-section"><div class="movie-section-heading"><div><span>01 / THE PEOPLE</span><h3>Cast & performers</h3></div></div><div class="cast-strip">${castHTML}</div></section>
        <section class="movie-section"><div class="movie-section-heading"><div><span>02 / THE COMMUNITY</span><h3>Audience reviews <small>${reviewData.total||0} reviews · average ${reviewData.average_rating??"—"}/10</small></h3></div><select id="reviewSort" class="dark-select review-sort"><option value="newest">Newest first</option><option value="helpful">Most helpful</option></select></div><div class="community-reviews">${reviewsHTML}</div></section>
        <section class="movie-section"><div class="movie-section-heading"><div><span>03 / YOUR TAKE</span><h3>Write a review</h3></div></div><div class="review-form"><p class="muted-copy">Rate this film and share your thoughts with the CINEVERSE community.</p><select id="reviewRating"><option value="10">10 — Masterpiece</option><option value="9">9 — Exceptional</option><option value="8" selected>8 — Great</option><option value="7">7 — Good</option><option value="6">6 — Worth a watch</option><option value="5">5 — Average</option><option value="4">4 — Disappointing</option><option value="3">3 — Poor</option><option value="2">2 — Bad</option><option value="1">1 — Terrible</option></select><textarea id="reviewText" maxlength="3000" placeholder="What did this film make you feel?"></textarea><label class="spoiler-check"><input type="checkbox" id="reviewSpoiler"> This review contains spoilers</label><button style="margin-top:10px" id="submitReview">Publish review ↗</button></div></section>
        <section class="movie-section"><div class="movie-section-heading"><div><span>04 / KEEP EXPLORING</span><h3>Similar films</h3></div></div><div class="movie-grid similar-movie-grid">${similarHTML}</div></section>
      </div>`;
    $("#modalClose").onclick=closeModal;
    api("/collections").then(d=>{$("#movieCollectionSelect").innerHTML='<option value="">Add to a collection…</option>'+(d.collections||[]).map(c=>'<option value="'+c.id+'">'+escapeHTML(c.name)+'</option>').join("");}).catch(()=>{});
    // Modal actions use delegated click handling so dynamically rendered controls remain active.
    $("#reviewSort").dataset.movieId=String(m.id);
    $$(".spoiler-copy").forEach(el=>{el.style.filter="blur(5px)";el.title="Spoiler hidden — click to reveal";el.onclick=()=>{el.style.filter="none";el.title=""}});
  }).catch(e=>{
    $("#movieModalContent").innerHTML='<button class="modal-close" id="modalClose">×</button><div class="empty-state">Could not load this movie. '+escapeHTML(e.message)+'</div>';
    $("#modalClose").onclick=closeModal;
  });
}
function closeModal(){$("#movieModal").classList.remove("open")}
async function saveMovie(movie,kind){try{await api("/library",{method:"POST",body:JSON.stringify({movie,kind})});toast("Added to your "+kind+" ✓")}catch(e){toast(e.message.includes("sign")?"Sign in to save films.":e.message)}}
function renderCommunityReviews(reviews){
 if(!reviews.length)return '<p class="muted-copy">Be the first to review this movie.</p>';
 return reviews.map(function(r){
  return '<article class="community-review"><div class="review-score">★ '+Number(r.rating).toFixed(1)+'/10 <span class="review-like-count">· '+(r.likes||0)+' helpful</span></div><p>'+(r.spoiler?'<span class="spoiler-label">SPOILER</span> ':'')+(r.spoiler?'<span class="spoiler-copy">'+escapeHTML(r.content)+'</span>':escapeHTML(r.content))+'</p><div class="community-review-foot"><small>'+new Date(r.created_at).toLocaleDateString()+'</small><button class="helpful-button '+(r.liked_by_me?'liked':'')+'" data-like-review="'+r.id+'" data-liked="'+(r.liked_by_me?'1':'0')+'">'+(r.liked_by_me?'♥ Helpful':'♡ Helpful')+'</button></div></article>';
 }).join("");
}
async function toggleReviewLike(button){
 const liked=button.dataset.liked!=="1";
 try{
  const d=await api("/reviews/like",{method:"POST",body:JSON.stringify({review_id:button.dataset.likeReview,liked})});
  button.dataset.liked=liked?"1":"0";button.classList.toggle("liked",liked);button.textContent=liked?"♥ Helpful":"♡ Helpful";
  const count=button.closest(".community-review").querySelector(".review-like-count");if(count)count.textContent="· "+d.likes+" helpful";
 }catch(e){toast(e.message)}
}
async function submitReview(movieId){try{await api("/reviews",{method:"POST",body:JSON.stringify({movie_id:movieId,movie_title:state.currentMovie?.title||"Movie",rating:Number($("#reviewRating").value),content:$("#reviewText").value,spoiler:$("#reviewSpoiler")?.checked||false})});toast("Your review is live ✓");$("#reviewText").value="";openMovie(movieId);}catch(e){toast(e.message)}}
async function loadDiscover(){await loadMovies("/movies/trending","#discoverGrid");try{const d=await api("/movies/genres");$("#genreFilter").innerHTML='<option value="">All genres</option>'+(d.genres||[]).map(g=>`<option value="${g.id}">${escapeHTML(g.name)}</option>`).join("")}catch{}}
async function discoverSort(sort){state.sort=sort;$$("[data-sort]").forEach(b=>b.classList.toggle("selected",b.dataset.sort===sort));const params=new URLSearchParams({sort});if(state.genre)params.set("genre",state.genre);await loadMovies("/movies/discover?"+params.toString(),"#discoverGrid")}
async function searchMovies(q){if(!q.trim()){ $("#searchGrid").innerHTML='<div class="empty-state">Start with a title, actor, director, or genre.</div>';return}await loadMovies("/movies/search?q="+encodeURIComponent(q),"#searchGrid")}
async function loadLibrary(){
 try{
  const d=await api("/library?kind=all"),all=d.results||[],rows=all.filter(x=>x.kind===state.library);
  $("#librarySummary").innerHTML=[["WATCHLIST","watchlist"],["WATCHED","watched"],["FAVOURITES","favourites"]].map(([label,k])=>'<div class="library-stat"><small>'+label+'</small><b>'+all.filter(x=>x.kind===k).length+'</b></div>').join("");
  $("#libraryGrid").innerHTML=rows.length?rows.map(x=>'<div class="library-entry">'+card(x.movie||x)+(state.library==="watched"?'<div class="library-entry-meta"><label>Watched on <input type="date" data-watched-date="'+x.movie.id+'" value="'+(x.watched_at?new Date(x.watched_at).toISOString().slice(0,10):"")+'"></label></div>':'')+'<textarea class="library-note" data-library-note="'+x.movie.id+'" maxlength="1000" placeholder="Personal note — what did you think?">'+escapeHTML(x.notes||"")+'</textarea><div class="library-entry-actions"><button data-save-library-note="'+x.movie.id+'">Save note</button><button data-remove-library="'+x.movie.id+'" class="danger-action">Remove</button></div></div>').join(""):'<div class="empty-state">Nothing here yet. Explore movies and start collecting.</div>';
 }catch(e){$("#libraryGrid").innerHTML='<div class="empty-state">Sign in to build your personal cinema library.</div>'}
}
async function saveLibraryNote(movieId){
 const notes=document.querySelector('[data-library-note="'+CSS.escape(String(movieId))+'"]')?.value||"";
 const date=document.querySelector('[data-watched-date="'+CSS.escape(String(movieId))+'"]')?.value||null;
 try{await api("/library",{method:"PATCH",body:JSON.stringify({movie_id:Number(movieId),kind:state.library,notes,watched_at:date})});toast("Your cinema notes were saved.");}
 catch(e){toast(e.message)}
}
async function removeLibraryMovie(movieId){
 try{await api("/library",{method:"DELETE",body:JSON.stringify({movie_id:Number(movieId),kind:state.library})});toast("Removed from "+state.library+".");loadLibrary();}
 catch(e){toast(e.message)}
}
async function loadCollections(){
 try{
  const d=await api("/collections"),rows=d.collections||[];
  $("#collectionsGrid").innerHTML=rows.length?rows.map(c=>'<article class="collection-card" data-collection-card="'+c.id+'"><div class="collection-card-art">✦</div><div class="collection-card-copy"><b>'+escapeHTML(c.name)+'</b><p>'+escapeHTML(c.description||"A personal collection")+'</p><small>'+c.movie_count+' films</small></div><div class="collection-actions"><button data-open-collection="'+c.id+'">Open collection</button><button data-edit-collection="'+c.id+'" data-name="'+escapeHTML(c.name)+'" data-description="'+escapeHTML(c.description||"")+'">Edit</button><button data-delete-collection="'+c.id+'" class="danger-action">Delete</button></div></article>').join(""):'<div class="empty-state">No collections yet. Create your first themed collection above.</div>';
 }catch(e){$("#collectionsGrid").innerHTML='<div class="empty-state">Sign in to create personal collections.</div>'}
}
async function openCollection(id){
 try{
  const d=await api("/collections?id="+encodeURIComponent(id)),c=(d.collections||[]).find(x=>x.id===id),movies=d.movies||[];
  $("#collectionDetail").innerHTML='<div class="collection-detail-heading"><div><div class="eyebrow">YOUR CURATED SHELF</div><h2>'+escapeHTML(c?.name||"Collection")+'</h2><p>'+escapeHTML(c?.description||"")+'</p></div><button data-close-collection>Close</button></div><div class="movie-grid discover-grid">'+(movies.length?movies.map(x=>card(x.movie)).join(""):'<div class="empty-state">This collection is waiting for its first film.</div>')+'</div>'+(movies.length?'<div class="collection-remove-list">'+movies.map(x=>'<button data-remove-collection-movie="'+x.movie.id+'" data-collection-id="'+id+'">Remove '+escapeHTML(x.movie.title||"film")+'</button>').join("")+'</div>':'');
  $("#collectionDetail").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){toast(e.message)}
}
async function deleteCollection(id){if(!confirm("Delete this collection? The movies will remain in your main library."))return;try{await api("/collections",{method:"DELETE",body:JSON.stringify({id})});$("#collectionDetail").innerHTML="";toast("Collection deleted.");loadCollections()}catch(e){toast(e.message)}}
async function addMovieToCollection(movie,id){try{await api("/collections",{method:"POST",body:JSON.stringify({action:"add_movie",collection_id:id,movie})});toast("Added to your collection.");}catch(e){toast(e.message)}}
async function loadReviews(){
 try{
  const d=await api("/reviews/mine");
  const rows=d.results||[];
  $("#reviewsContent").innerHTML=rows.length?rows.map(function(r){
   return '<article class="own-review stat-card" data-review-id="'+escapeHTML(r.id)+'"><div class="own-review-top"><b>'+escapeHTML(r.movie_title||"Movie")+'</b><span>★ '+r.rating+'/10</span></div><p>'+ (r.spoiler?'<span class="spoiler-label">SPOILER</span> ':'') +escapeHTML(r.content)+'</p><small>'+new Date(r.created_at).toLocaleDateString()+'</small><div class="review-actions"><button data-edit-review="'+escapeHTML(r.id)+'">Edit</button><button data-delete-review="'+escapeHTML(r.id)+'" class="danger-action">Delete</button></div></article>';
  }).join(""):"No reviews yet. Open a movie to write your first review.";
 }catch(e){$("#reviewsContent").textContent="Sign in to see your reviews."}
}
async function deleteOwnReview(id){
 if(!confirm("Delete this review permanently?"))return;
 try{await api("/reviews?id="+encodeURIComponent(id),{method:"DELETE"});toast("Review deleted.");loadReviews()}catch(e){toast(e.message)}
}
async function editOwnReview(id){
 const article=document.querySelector('[data-review-id="'+CSS.escape(id)+'"]');
 if(!article)return;
 const oldText=article.querySelector("p").textContent.replace(/^SPOILER /,"");
 const content=prompt("Edit your review:",oldText);
 if(content===null)return;
 const oldRating=Number((article.querySelector(".own-review-top span").textContent.match(/[0-9]+/)||["8"])[0]);
 const rating=Number(prompt("Rating from 1 to 10:",oldRating));
 if(!Number.isInteger(rating)||rating<1||rating>10||!content.trim()){toast("Enter valid review text and a rating from 1 to 10.");return}
 try{await api("/reviews",{method:"PUT",body:JSON.stringify({id,rating,content:content.trim(),spoiler:oldText!==article.querySelector("p").textContent})});toast("Review updated.");loadReviews()}catch(e){toast(e.message)}
}
async function loadStats(){
 try{
  const d=await api("/stats");
  $("#statsGrid").innerHTML=[["MOVIES WATCHED",d.watched||0,"Your logged cinema history"],["REVIEWS WRITTEN",d.reviews||0,"Films you have rated"],["AVERAGE RATING",d.average_rating?Number(d.average_rating).toFixed(1)+"/10":"—","Your personal score"]].map(([a,b,c])=>`<div class="stat-card"><small>${a}</small><strong>${b}</strong><span>${c}</span></div>`).join("");
  const genres=d.genres||[];
  $("#genreChart").innerHTML=genres.length?genres.map(g=>`<div class="stats-bar-row"><span>${escapeHTML(g.name)}</span><span class="stats-bar-track"><i style="width:${Math.min(100,Math.max(0,g.percent))}%"></i></span><b>${g.count}</b></div>`).join(""):'<div class="stats-empty">Log watched movies to reveal your genre DNA.</div>';
  const months=d.months||[];
  const maxMonth=Math.max(1,...months.map(m=>m.count));
  const monthHtml=months.map(m=>`<div class="month-column" title="${m.label}: ${m.count} watched"><div class="month-bar-wrap"><i style="height:${m.count?Math.max(5,m.count/maxMonth*100):3}%"></i></div><small>${escapeHTML(m.label)}</small><b>${m.count||""}</b></div>`).join("");
  const directors=d.directors||[];
  $("#statsExtra").innerHTML=`<div class="stats-panel"><div class="eyebrow">YOUR WATCHING RHYTHM</div><h2>The last <em>12 months.</em></h2><div class="monthly-chart">${monthHtml||'<span class="stats-empty">Your monthly activity will appear here.</span>'}</div></div><div class="stats-panel stats-bottom-panel"><div><div class="eyebrow">DIRECTORS YOU RETURN TO</div><h2>Your favourite <em>storytellers.</em></h2>${directors.length?'<div class="director-list">'+directors.map((x,i)=>'<div class="director-row"><span class="director-rank">0'+(i+1)+'</span><b>'+escapeHTML(x.name)+'</b><small>'+x.count+' watched</small></div>').join("")+'</div>':'<p class="stats-empty">Director favourites appear when your watched movie records include credits.</p>'}</div><div class="taste-card"><span class="taste-orbit">✦</span><div class="eyebrow">YOUR CINEMA DNA</div><h3>Your taste, <em>in a sentence.</em></h3><p>${escapeHTML(d.taste_profile||"Your taste profile is taking shape.")}</p></div></div>`;
 }catch(e){
  $("#statsGrid").innerHTML='<div class="empty-state">Sign in to see your cinema statistics.</div>';
  $("#genreChart").textContent="Your genre profile will appear here.";
  $("#statsExtra").innerHTML="";
 }
}
async function sendAI(text){if(!text.trim())return;const messages=$("#chatMessages");messages.insertAdjacentHTML("beforeend",`<div class="user-message">${escapeHTML(text)}</div>`);$("#chatInput").value="";messages.insertAdjacentHTML("beforeend",'<div class="ai-message pending"><span class="message-avatar">✳</span><div><small>CINEAI</small><p><span class="loader"></span>Thinking through the possibilities…</p></div></div>');messages.scrollTop=messages.scrollHeight;try{const d=await api("/cineai",{method:"POST",body:JSON.stringify({message:text})});$(".pending")?.remove();messages.insertAdjacentHTML("beforeend",`<div class="ai-message"><span class="message-avatar">✳</span><div><small>CINEAI</small><p>${escapeHTML(d.reply||"I couldn't find a strong match. Try describing the mood a little differently.")}</p>${(d.movies||[]).length?'<div class="movie-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px">'+d.movies.map(m=>`<div class="cineai-rec-card">${card(m)}${m.recommendation_reason?`<p class="cineai-rec-reason"><span>WHY THIS MATCHES</span>${escapeHTML(m.recommendation_reason)}</p>`:""}</div>`).join("")+'</div>':""}</div></div>`)}catch(e){$(".pending")?.remove();messages.insertAdjacentHTML("beforeend",`<div class="ai-message"><span class="message-avatar">✳</span><div><small>CINEAI</small><p>${escapeHTML(e.message||"CineAI is still warming up. Connect the AI provider in project Setup.")}</p></div></div>`)}messages.scrollTop=messages.scrollHeight}
async function loadUser(){try{const s=await window.hatchable?.auth?.getSession();if(s?.user){$("#userName").textContent=s.user.name||s.user.email.split("@")[0];$("#userStatus").textContent="Signed in · Cinephile";$("#signInButton").textContent="Account ↗";$("#signInButton").onclick=async()=>{await window.hatchable.auth.signOut();location.reload()}}}catch{}}
async function startQuiz(){
 const area=$("#quizArea"),mode=state.quizMode||"mixed";
 clearInterval(state.quizTimer);
 area.innerHTML='<div class="loading-state"><span class="loader"></span>Preparing your cinema challenge…</div>';
 try{
  const d=await api("/quiz?mode="+encodeURIComponent(mode));
  state.quiz={questions:d.questions||[],index:0,score:0,mode,startedAt:Date.now(),timeLeft:15,locked:false};
  if(!state.quiz.questions.length)throw new Error("No quiz questions were returned.");
  renderQuiz();
 }catch(e){area.innerHTML='<div class="empty-state">'+escapeHTML(e.message||"Quiz service is temporarily unavailable.")+'</div>'}
}
function renderQuiz(){
 const q=state.quiz;clearInterval(state.quizTimer);if(!q)return;
 if(q.index>=q.questions.length){finishQuiz();return}
 const item=q.questions[q.index];q.timeLeft=15;q.locked=false;
 $("#quizArea").innerHTML=`<div class="quiz-question quiz-live"><div class="quiz-progress-row"><span class="eyebrow">${String(q.mode).toUpperCase()} · QUESTION ${q.index+1} / ${q.questions.length}</span><span class="quiz-timer" id="quizTimer">00:15</span></div><div class="quiz-progress"><span style="width:${(q.index/q.questions.length)*100}%"></span></div>${item.image?`<img class="quiz-poster-clue" src="${escapeHTML(item.image)}" alt="Movie poster clue">`:""}<h3>${escapeHTML(item.question)}</h3>${item.clue?`<p class="quiz-plot-clue">“${escapeHTML(item.clue)}”</p>`:""}<div class="quiz-options-grid">${item.options.map((o,i)=>`<button class="quiz-option" data-answer="${i}">${escapeHTML(o)}</button>`).join("")}</div><p class="quiz-feedback" id="quizFeedback">Choose your answer before the timer runs out.</p></div>`;
 $$("[data-answer]").forEach(b=>b.onclick=()=>answerQuiz(Number(b.dataset.answer)));
 state.quizTimer=setInterval(()=>{if(!state.quiz||state.quiz.locked)return;q.timeLeft--;const timer=$("#quizTimer");if(timer)timer.textContent="00:"+String(Math.max(0,q.timeLeft)).padStart(2,"0");if(q.timeLeft<=5&&timer)timer.classList.add("urgent");if(q.timeLeft<=0)answerQuiz(-1)},1000);
}
function answerQuiz(selected){
 const q=state.quiz;if(!q||q.locked)return;q.locked=true;clearInterval(state.quizTimer);
 const item=q.questions[q.index];
 $$("[data-answer]").forEach(b=>{b.disabled=true;const n=Number(b.dataset.answer);if(n===item.answer)b.classList.add("correct");if(n===selected&&n!==item.answer)b.classList.add("wrong")});
 if(selected===item.answer)q.score++;
 const feedback=$("#quizFeedback");
 if(feedback)feedback.textContent=selected===item.answer?"Correct! +1 point":selected===-1?"Time's up! The answer was "+item.reveal:"Not quite — the answer was "+item.reveal;
 setTimeout(()=>{q.index++;renderQuiz()},1100);
}
async function finishQuiz(){
 const q=state.quiz;if(!q)return;clearInterval(state.quizTimer);
 const duration=Math.max(1,Math.round((Date.now()-q.startedAt)/1000)),percent=Math.round((q.score/q.questions.length)*100);
 $("#quizArea").innerHTML=`<div class="quiz-question quiz-results"><div class="quiz-result-orb">✦</div><div class="eyebrow">CHALLENGE COMPLETE</div><h2>${q.score} <span>/ ${q.questions.length}</span></h2><p class="quiz-result-message">${percent===100?"Perfect score. A true cinema legend!":percent>=60?"Impressive film knowledge. Keep that streak alive!":"Every cinephile keeps learning. Ready for a rematch?"}</p><div class="quiz-result-stats"><div><b>${percent}%</b><small>ACCURACY</small></div><div><b>${duration}s</b><small>TIME TAKEN</small></div><div><b>${q.mode.toUpperCase()}</b><small>QUIZ MODE</small></div></div><button class="primary-button" id="playAgainQuiz">Play again ↗</button></div>`;
 $("#playAgainQuiz").onclick=startQuiz;
 try{await api("/quiz",{method:"POST",body:JSON.stringify({score:q.score,total:q.questions.length,mode:q.mode,duration_seconds:duration})});toast("Quiz result saved to your history ✓")}
 catch(e){toast(e.message.toLowerCase().includes("sign")?"Sign in to save your quiz history.":"Quiz finished. Sign in to keep your score.")}
 loadQuizHistory();
}
async function loadQuizHistory(){
 const el=$("#quizHistory");if(!el)return;
 try{
  const d=await api("/quiz?history=1"),rows=d.attempts||[];
  el.innerHTML=rows.length?rows.map(a=>`<article class="quiz-history-card"><div class="quiz-history-score">${a.score}<small>/ ${a.total}</small></div><div class="quiz-history-copy"><b>${escapeHTML(String(a.mode||"mixed").toUpperCase())} CHALLENGE</b><small>${new Date(a.created_at).toLocaleString()} · ${a.duration_seconds||0}s</small></div><div class="quiz-history-percent">${Math.round((a.score/a.total)*100)}%</div></article>`).join(""):'<div class="empty-state">No saved attempts yet. Complete a quiz to start your record.</div>';
 }catch(e){el.innerHTML='<div class="empty-state">Sign in to save and view your quiz history.</div>'}
}
$$("[data-view]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();go(a.dataset.view)}));$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));$("#menuToggle").onclick=()=>$("#sidebar").classList.toggle("open");$("#searchShortcut").onclick=()=>go("search");$("#profileButton").onclick=()=>{if(window.hatchable?.auth)location.href="/login";else toast("Sign-in will be available after setup.")};$("#signInButton").onclick=()=>location.href="/login";$("#movieModal").addEventListener("click",e=>{if(e.target.id==="movieModal"||e.target.closest("#modalClose"))closeModal()});document.addEventListener("change",async e=>{if(e.target.matches("#reviewSort")){try{const d=await api("/reviews?movie_id="+encodeURIComponent(e.target.dataset.movieId)+"&sort="+encodeURIComponent(e.target.value));$(".community-reviews").innerHTML=renderCommunityReviews(d.results||[]);const label=$(".movie-section-heading h3 small");if(label)label.textContent=(d.total||0)+" reviews · average "+(d.average_rating??"—")+"/10";}catch(err){toast(err.message)}}});document.addEventListener("click",e=>{const c=e.target.closest("[data-movie]");if(c)openMovie(c.dataset.movie);const del=e.target.closest("[data-delete-review]");if(del)deleteOwnReview(del.dataset.deleteReview);const edit=e.target.closest("[data-edit-review]");if(edit)editOwnReview(edit.dataset.editReview);const like=e.target.closest("[data-like-review]");if(like)toggleReviewLike(like);const note=e.target.closest("[data-save-library-note]");if(note){e.preventDefault();e.stopPropagation();saveLibraryNote(note.dataset.saveLibraryNote)}const remove=e.target.closest("[data-remove-library]");if(remove){e.preventDefault();e.stopPropagation();removeLibraryMovie(remove.dataset.removeLibrary)}const libraryTab=e.target.closest("[data-library]");if(libraryTab){e.preventDefault();state.library=libraryTab.dataset.library;$("[data-library]").forEach(x=>x.classList.toggle("active",x===libraryTab));loadLibrary()}const saveAction=e.target.closest("[data-save]");if(saveAction){e.preventDefault();e.stopPropagation();if(state.currentMovie)saveMovie(state.currentMovie,saveAction.dataset.save)}const addCollection=e.target.closest("#addMovieToCollection");if(addCollection){e.preventDefault();e.stopPropagation();const select=$("#movieCollectionSelect");if(select?.value&&state.currentMovie)addMovieToCollection(state.currentMovie,select.value);else toast("Create or select a collection first.")}const publishReview=e.target.closest("#submitReview");if(publishReview){e.preventDefault();e.stopPropagation();if(state.currentMovie)submitReview(state.currentMovie.id)}const open=e.target.closest("[data-open-collection]");if(open)openCollection(open.dataset.openCollection);const removeCollection=e.target.closest("[data-delete-collection]");if(removeCollection)deleteCollection(removeCollection.dataset.deleteCollection);const editCollection=e.target.closest("[data-edit-collection]");if(editCollection){const name=prompt("Collection name:",editCollection.dataset.name);if(name===null)return;const description=prompt("Collection description:",editCollection.dataset.description);if(description===null)return;api("/collections",{method:"PUT",body:JSON.stringify({id:editCollection.dataset.editCollection,name,description})}).then(()=>{toast("Collection updated.");loadCollections()}).catch(err=>toast(err.message))}const removeFilm=e.target.closest("[data-remove-collection-movie]");if(removeFilm){e.preventDefault();api("/collections",{method:"DELETE",body:JSON.stringify({action:"remove_movie",collection_id:removeFilm.dataset.collectionId,movie_id:Number(removeFilm.dataset.removeCollectionMovie)})}).then(()=>openCollection(removeFilm.dataset.collectionId)).catch(err=>toast(err.message))}if(e.target.closest("[data-close-collection]"))$("#collectionDetail").innerHTML="";});$$("[data-sort]").forEach(b=>b.onclick=()=>discoverSort(b.dataset.sort));$("#genreFilter").onchange=e=>{state.genre=e.target.value;discoverSort(state.sort)};$("#movieSearch").addEventListener("input",e=>{clearTimeout(state.queryTimer);state.queryTimer=setTimeout(()=>searchMovies(e.target.value),400)});$("#movieSearch").addEventListener("keydown",e=>{if(e.key==="Enter")searchMovies(e.target.value)});$("#chatForm").onsubmit=e=>{e.preventDefault();sendAI($("#chatInput").value)};$$("[data-prompt]").forEach(b=>b.onclick=()=>sendAI(b.dataset.prompt));$("#collectionForm").onsubmit=async e=>{e.preventDefault();try{await api("/collections",{method:"POST",body:JSON.stringify({name:$("#collectionName").value,description:$("#collectionDescription").value})});$("#collectionName").value="";$("#collectionDescription").value="";toast("Collection created.");loadCollections()}catch(err){toast(err.message)}};$("#startQuiz").onclick=startQuiz;$$("[data-quiz-mode]").forEach(b=>b.onclick=()=>{state.quizMode=b.dataset.quizMode;$$("[data-quiz-mode]").forEach(x=>x.classList.toggle("active",x===b))});$("#refreshQuizHistory").onclick=loadQuizHistory;loadQuizHistory();
async function loadCommunityFeed(){
 const el=$("#communityFeed");if(!el)return;
 const scope=$("#communityScope")?.value||"all";
 el.innerHTML='<div class="loading-state"><span class="loader"></span>Gathering the latest takes…</div>';
 try{
  const d=await api("/community?view=feed&scope="+encodeURIComponent(scope)),posts=d.posts||[];
  el.innerHTML=posts.length?posts.map(r=>'<article class="community-post community-review"><div class="community-post-top"><div class="community-avatar">'+escapeHTML((r.display_name||r.handle||"C").slice(0,1).toUpperCase())+'</div><div class="community-author"><b>'+escapeHTML(r.display_name||"Cinephile")+'</b><small>@'+escapeHTML(r.handle||"cinephile")+' · '+new Date(r.created_at).toLocaleDateString()+'</small></div><span class="community-rating">★ '+Number(r.rating).toFixed(1)+'/10</span></div><button class="community-movie-title" data-movie="'+Number(r.movie_id)+'">'+escapeHTML(r.movie_title)+' <span>↗</span></button><p class="community-post-copy">'+(r.spoiler?'<span class="spoiler-label">SPOILER</span> ':'')+escapeHTML(r.content)+'</p><div class="community-post-actions"><span>✦ '+(r.likes||0)+' helpful</span><button class="helpful-button '+(r.liked_by_me?'liked':'')+'" data-like-review="'+r.id+'" data-liked="'+(r.liked_by_me?'1':'0')+'">'+(r.liked_by_me?'♥ Helpful':'♡ Helpful')+'</button>'+(r.followed_by_me?'':'<button class="community-follow-inline" data-community-follow="'+escapeHTML(r.user_id)+'">＋ Follow</button>')+'</div></article>').join(""):'<div class="community-empty"><span>✧</span><h3>No reviews in the spotlight yet</h3><p>Be the first to share a film you love. Your next review will appear here.</p><button class="primary-button" data-go="discover">Explore movies ↗</button></div>';
 }catch(e){el.innerHTML='<div class="empty-state">'+escapeHTML(e.message||"Could not load the community feed.")+'</div>'}
}
async function loadCommunityPeople(){
 const el=$("#communityPeople");if(!el)return;
 const q=$("#communitySearch")?.value||"";
 el.innerHTML='<div class="loading-state"><span class="loader"></span>Finding your film people…</div>';
 try{
  const d=await api("/community?view=people&q="+encodeURIComponent(q)),people=d.people||[];
  el.innerHTML=people.length?people.map(p=>'<article class="community-person-card"><div class="community-person-avatar">'+escapeHTML((p.display_name||"C").slice(0,1).toUpperCase())+'</div><h3>'+escapeHTML(p.display_name)+'</h3><small>@'+escapeHTML(p.handle)+'</small><p>'+escapeHTML(p.bio||"A fellow lover of stories on screen.")+'</p><div class="community-person-stats"><span><b>'+p.followers+'</b> followers</span><span><b>'+p.following+'</b> following</span></div><div class="community-genres">'+(Array.isArray(p.favorite_genres)?p.favorite_genres:[]).slice(0,3).map(g=>'<span>'+escapeHTML(g)+'</span>').join("")+'</div><button class="community-follow-button '+(p.is_following?'following':'')+'" data-community-follow="'+escapeHTML(p.user_id)+'">'+(p.is_following?'✓ Following':'＋ Follow')+'</button></article>').join(""):'<div class="community-empty"><span>◎</span><h3>No cinephiles found</h3><p>Try another name or handle.</p></div>';
 }catch(e){el.innerHTML='<div class="empty-state">'+escapeHTML(e.message||"Could not find cinephiles.")+'</div>'}
}
async function loadMyCommunityProfile(){
 const el=$("#myCommunityProfile");if(!el)return;
 try{
  const d=await api("/community?view=me"),p=d.profile;
  const genres=["Action","Adventure","Animation","Comedy","Crime","Documentary","Drama","Fantasy","Horror","Mystery","Romance","Science Fiction","Thriller"];
  el.innerHTML='<div class="community-profile-layout"><div class="community-profile-card"><div class="community-profile-cover">✦ CINEVERSE CINEPHILE ✦</div><div class="community-profile-avatar">'+escapeHTML((p.display_name||"C").slice(0,1).toUpperCase())+'</div><h2>'+escapeHTML(p.display_name)+'</h2><p>@'+escapeHTML(p.handle)+'</p><div class="community-person-stats"><span><b>'+p.followers+'</b> followers</span><span><b>'+p.following+'</b> following</span></div><div class="community-profile-note">'+escapeHTML(p.bio||"Your cinema story starts here.")+'</div></div><form id="communityProfileForm" class="community-profile-form"><span class="community-kicker">YOUR LITTLE CORNER OF CINEMA</span><h3>Edit your profile</h3><label>Display name<input id="communityDisplayName" maxlength="40" required value="'+escapeHTML(p.display_name)+'"></label><label>About you<textarea id="communityBio" maxlength="240" placeholder="Tell everyone what kind of stories you love…">'+escapeHTML(p.bio||"")+'</textarea></label><label>Favourite genres <small>Choose up to 8</small></label><div class="community-genre-picker">'+genres.map(g=>'<label><input type="checkbox" name="communityGenre" value="'+escapeHTML(g)+'" '+((p.favorite_genres||[]).includes(g)?'checked':'')+'><span>'+escapeHTML(g)+'</span></label>').join("")+'</div><button class="primary-button" type="submit">Save my profile ↗</button></form></div>';
 }catch(e){el.innerHTML='<div class="community-empty"><span>♡</span><h3>Sign in to create your profile</h3><p>Your profile lets other cinephiles discover and follow you.</p><a class="primary-button" href="/login">Sign in ↗</a></div>'}
}
async function communityFollow(userId,button){
 const follow=button.classList.contains("following")?false:true;
 try{
  const d=await api("/community",{method:"POST",body:JSON.stringify({user_id:userId,follow})});
  button.classList.toggle("following",follow);button.textContent=follow?"✓ Following":"＋ Follow";
  toast(follow?"You're following a new cinephile!":"Unfollowed cinephile.");
  if($("#community-feed-panel")&&!$("#community-feed-panel").hidden)loadCommunityFeed();
  if($("#community-people-panel")&&!$("#community-people-panel").hidden)loadCommunityPeople();
 }catch(e){toast(e.message)}
}
function switchCommunityTab(tab){
 $$(".community-tab").forEach(b=>b.classList.toggle("active",b.dataset.communityTab===tab));
 ["feed","people","profile"].forEach(k=>$("#community-"+k+"-panel").hidden=k!==tab);
 if(tab==="feed")loadCommunityFeed();if(tab==="people")loadCommunityPeople();if(tab==="profile")loadMyCommunityProfile();
}
document.addEventListener("click",e=>{
 const tab=e.target.closest("[data-community-tab]");if(tab)switchCommunityTab(tab.dataset.communityTab);
 const follow=e.target.closest("[data-community-follow]");if(follow){e.preventDefault();e.stopPropagation();communityFollow(follow.dataset.communityFollow,follow)}
});
document.addEventListener("submit",async e=>{
 if(e.target.id!=="communityProfileForm")return;
 e.preventDefault();
 const selected=$$("input[name='communityGenre']:checked").map(x=>x.value);
 if(selected.length>8){toast("Choose up to 8 favourite genres.");return}
 try{
  await api("/community",{method:"PUT",body:JSON.stringify({display_name:$("#communityDisplayName").value,bio:$("#communityBio").value,favorite_genres:selected})});
  toast("Your cinephile profile is saved ✦");loadMyCommunityProfile();
 }catch(err){toast(err.message)}
});
$("#communityScope")?.addEventListener("change",loadCommunityFeed);
$("#communitySearch")?.addEventListener("input",()=>{clearTimeout(window.communitySearchTimer);window.communitySearchTimer=setTimeout(loadCommunityPeople,250)});

const initial=location.hash.replace("#","");if(initial&&$("#view-"+initial))showView(initial);loadUser();loadMovies("/movies/trending","#trendingGrid");loadMovies("/movies/hidden-gems","#hiddenGrid");