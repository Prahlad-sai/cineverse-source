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
function showView(view){state.view=view;$$(".view").forEach(v=>v.classList.toggle("active-view",v.id==="view-"+view));$$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.view===view));$("#pageLabel").textContent=({home:"Home",discover:"Discover",search:"Search",cineai:"CineAI",library:"My Library",reviews:"My Reviews",stats:"Statistics",collections:"Collections",community:"Community",quiz:"CineQuiz",leaderboard:"Leaderboard"})[view]||"Home";$("#sidebar").classList.remove("open");if(view==="discover"&&!$("#discoverGrid").dataset.loaded){loadDiscover();$("#discoverGrid").dataset.loaded="1"}if(view==="library")loadLibrary();if(view==="stats")loadStats();if(view==="reviews")loadReviews()}
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
    $$("[data-save]").forEach(b=>b.onclick=()=>saveMovie(m,b.dataset.save));
    $("#submitReview").onclick=()=>submitReview(m.id);
    $("#reviewSort").onchange=async e=>{try{const d=await api("/reviews?movie_id="+m.id+"&sort="+e.target.value);$(".community-reviews").innerHTML=renderCommunityReviews(d.results||[]);const label=$(".movie-section-heading h3 small");if(label)label.textContent=(d.total||0)+" reviews · average "+(d.average_rating??"—")+"/10";}catch(err){toast(err.message)}};
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
async function loadLibrary(){try{const d=await api("/library?kind="+state.library);$("#libraryGrid").innerHTML=(d.results||[]).length?d.results.map(x=>card(x.movie||x)).join(""):'<div class="empty-state">Nothing here yet. Explore movies and start collecting.</div>'}catch(e){$("#libraryGrid").innerHTML='<div class="empty-state">Sign in to build your personal cinema library.</div>'}}
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
async function loadStats(){try{const d=await api("/stats");$("#statsGrid").innerHTML=[["MOVIES WATCHED",d.watched||0],["REVIEWS WRITTEN",d.reviews||0],["AVERAGE RATING",d.average_rating?Number(d.average_rating).toFixed(1):"—"]].map(([a,b])=>`<div class="stat-card"><small>${a}</small><strong>${b}</strong><span>Your cinema journey</span></div>`).join("");$("#genreChart").innerHTML=(d.genres||[]).map(g=>`<div style="display:flex;align-items:center;gap:12px;margin:10px 0;font-size:10px"><span style="width:90px;color:#aaa">${escapeHTML(g.name)}</span><span style="height:7px;flex:1;background:#272335;border-radius:5px;overflow:hidden"><i style="display:block;width:${g.percent}%;height:100%;background:linear-gradient(90deg,#8b6ce9,#d8b77c)"></i></span><b>${g.count}</b></div>`).join("")||"Log watched movies to reveal your genre DNA."}catch{$("#genreChart").textContent="Sign in and log watched movies to see your statistics."}}
async function sendAI(text){if(!text.trim())return;const messages=$("#chatMessages");messages.insertAdjacentHTML("beforeend",`<div class="user-message">${escapeHTML(text)}</div>`);$("#chatInput").value="";messages.insertAdjacentHTML("beforeend",'<div class="ai-message pending"><span class="message-avatar">✳</span><div><small>CINEAI</small><p><span class="loader"></span>Thinking through the possibilities…</p></div></div>');messages.scrollTop=messages.scrollHeight;try{const d=await api("/cineai",{method:"POST",body:JSON.stringify({message:text})});$(".pending")?.remove();messages.insertAdjacentHTML("beforeend",`<div class="ai-message"><span class="message-avatar">✳</span><div><small>CINEAI</small><p>${escapeHTML(d.reply||"I couldn't find a strong match. Try describing the mood a little differently.")}</p>${(d.movies||[]).length?'<div class="movie-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px">'+d.movies.map(m=>`<div class="cineai-rec-card">${card(m)}${m.recommendation_reason?`<p class="cineai-rec-reason"><span>WHY THIS MATCHES</span>${escapeHTML(m.recommendation_reason)}</p>`:""}</div>`).join("")+'</div>':""}</div></div>`)}catch(e){$(".pending")?.remove();messages.insertAdjacentHTML("beforeend",`<div class="ai-message"><span class="message-avatar">✳</span><div><small>CINEAI</small><p>${escapeHTML(e.message||"CineAI is still warming up. Connect the AI provider in project Setup.")}</p></div></div>`)}messages.scrollTop=messages.scrollHeight}
async function loadUser(){try{const s=await window.hatchable?.auth?.getSession();if(s?.user){$("#userName").textContent=s.user.name||s.user.email.split("@")[0];$("#userStatus").textContent="Signed in · Cinephile";$("#signInButton").textContent="Account ↗";$("#signInButton").onclick=async()=>{await window.hatchable.auth.signOut();location.reload()}}}catch{}}
async function startQuiz(){const area=$("#quizArea");area.innerHTML='<div class="loading-state"><span class="loader"></span>Preparing your quiz…</div>';try{const d=await api("/quiz");state.quiz={questions:d.questions||[],index:0,score:0};renderQuiz()}catch(e){area.innerHTML='<div class="empty-state">Quiz service is being prepared. Try again soon.</div>'}}
function renderQuiz(){const q=state.quiz;if(!q||q.index>=q.questions.length){$("#quizArea").innerHTML=`<div class="quiz-question"><div class="eyebrow">QUIZ COMPLETE</div><h3>You scored ${q?.score||0} / ${q?.questions.length||0}</h3><button class="primary-button" onclick="document.querySelector('#startQuiz').click()">Play again ↗</button></div>`;return}const item=q.questions[q.index];$("#quizArea").innerHTML=`<div class="quiz-question"><div class="eyebrow">QUESTION ${q.index+1} / ${q.questions.length}</div><h3>${escapeHTML(item.question)}</h3>${item.options.map((o,i)=>`<button class="quiz-option" data-answer="${i}">${escapeHTML(o)}</button>`).join("")}</div>`;$$("[data-answer]").forEach(b=>b.onclick=()=>{const n=Number(b.dataset.answer);$$("[data-answer]").forEach(x=>{x.disabled=true;if(Number(x.dataset.answer)===item.answer)x.classList.add("correct")});if(n===item.answer)q.score++;else b.classList.add("wrong");setTimeout(()=>{q.index++;renderQuiz()},900)})}
$$("[data-view]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();go(a.dataset.view)}));$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));$("#menuToggle").onclick=()=>$("#sidebar").classList.toggle("open");$("#searchShortcut").onclick=()=>go("search");$("#profileButton").onclick=()=>{if(window.hatchable?.auth)location.href="/login";else toast("Sign-in will be available after setup.")};$("#signInButton").onclick=()=>location.href="/login";$("#movieModal").addEventListener("click",e=>{if(e.target.id==="movieModal")closeModal()});document.addEventListener("click",e=>{const c=e.target.closest("[data-movie]");if(c)openMovie(c.dataset.movie);const del=e.target.closest("[data-delete-review]");if(del)deleteOwnReview(del.dataset.deleteReview);const edit=e.target.closest("[data-edit-review]");if(edit)editOwnReview(edit.dataset.editReview);const like=e.target.closest("[data-like-review]");if(like)toggleReviewLike(like)});$$("[data-sort]").forEach(b=>b.onclick=()=>discoverSort(b.dataset.sort));$("#genreFilter").onchange=e=>{state.genre=e.target.value;discoverSort(state.sort)};$("#movieSearch").addEventListener("input",e=>{clearTimeout(state.queryTimer);state.queryTimer=setTimeout(()=>searchMovies(e.target.value),400)});$("#movieSearch").addEventListener("keydown",e=>{if(e.key==="Enter")searchMovies(e.target.value)});$("#chatForm").onsubmit=e=>{e.preventDefault();sendAI($("#chatInput").value)};$$("[data-prompt]").forEach(b=>b.onclick=()=>sendAI(b.dataset.prompt));$$("[data-library]").forEach(b=>b.onclick=()=>{state.library=b.dataset.library;$$("[data-library]").forEach(x=>x.classList.toggle("active",x===b));loadLibrary()});$("#startQuiz").onclick=startQuiz;
const initial=location.hash.replace("#","");if(initial&&$("#view-"+initial))showView(initial);loadUser();loadMovies("/movies/trending","#trendingGrid");loadMovies("/movies/hidden-gems","#hiddenGrid");