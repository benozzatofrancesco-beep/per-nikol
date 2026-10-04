/* ============ logica comune ai capitoli ============ */
(function(){
  const $ = s => document.querySelector(s);
  const song = $("#song"), cover = $("#cover"), musicBtn = $("#music"), card = $(".canzone");

  /* --- foto: se manca il file resta il gradiente rosa/verde --- */
  document.querySelectorAll(".foto img").forEach(img=>{
    img.addEventListener("error", ()=> img.remove());
  });
  const bgp = $(".bg-photo");
  if(bgp && bgp.dataset.src){
    const im = new Image();
    im.onload = ()=> bgp.style.backgroundImage = `url(${bgp.dataset.src})`;
    im.src = bgp.dataset.src;
  }

  /* --- audio con fade (su iPhone il volume è fisso: parte/stacca e basta) --- */
  function fade(to, ms){
    clearInterval(song._f); const from = song.volume, t0 = Date.now();
    song._f = setInterval(()=>{ const k = Math.min(1,(Date.now()-t0)/ms); try{ song.volume = from + (to-from)*k; }catch(_){}
      if(k>=1) clearInterval(song._f); }, 40);
  }
  function setPaused(p){
    musicBtn.classList.toggle("paused", p);
    card && card.classList.toggle("paused", p);
  }
  function toggle(){
    if(song.paused){ song.play(); fade(.85,800); setPaused(false); }
    else { song.pause(); setPaused(true); }
  }
  musicBtn.addEventListener("click", toggle);
  card && card.querySelector(".pp").addEventListener("click", toggle);
  song.addEventListener("timeupdate", ()=>{
    const bar = card && card.querySelector(".prog i");
    if(bar && song.duration) bar.style.width = (song.currentTime/song.duration*100)+"%";
  });

  /* --- "tocca qui per iniziare": parte la canzone del capitolo --- */
  $("#tap").addEventListener("click", ()=>{
    song.volume = 0;
    song.play().then(()=>{ fade(.85, 2500); musicBtn.classList.add("show"); setPaused(false); })
               .catch(()=> setPaused(true));
    burst($("#tap"));
    cover.classList.add("gone");
    document.body.classList.remove("locked");
    setTimeout(()=> cascade("main .reveal", 170), 350);
  });

  /* --- transizione animata verso il capitolo successivo --- */
  const num = (location.pathname.match(/capitolo-(\d+)/) || [])[1];
  let trans = null;
  if(num){
    trans = document.createElement("div"); trans.className = "trans";
    trans.innerHTML = `<video src="transizioni/t${num}.mp4?v=1" muted playsinline webkit-playsinline preload="auto" disableremoteplayback></video>`;
    document.body.appendChild(trans);
    const tv = trans.querySelector("video"); tv.muted = true; tv.defaultMuted = true; tv.volume = 0;
  }
  function playTrans(href){
    const v = trans && trans.querySelector("video");
    if(!v){ location.href = href; return; }
    let andato = false; const vai = ()=>{ if(andato) return; andato = true; location.href = href; };
    trans.classList.add("on");
    v.currentTime = 0;
    v.muted = true;
    // iPhone: se parte il video, Safari può mettere in pausa la canzone. La teniamo viva.
    const suonava = !song.paused;
    const tieniViva = ()=>{ if(suonava && song.paused && !andato) song.play().catch(()=>{}); };
    v.addEventListener("playing", tieniViva);
    const guardia = setInterval(tieniViva, 500);
    setTimeout(()=> clearInterval(guardia), 6500);
    v.play().catch(vai);
    v.addEventListener("ended", ()=>{ v.classList.add("out"); setTimeout(vai, 450); }, {once:true});
    v.addEventListener("error", vai, {once:true});
    trans.addEventListener("click", vai, {once:true});   // un tocco salta la transizione
    setTimeout(vai, 6000);
  }

  /* --- a fine capitolo: il successivo parte da solo, in dissolvenza --- */
  const nextLink = document.querySelector("a.next");
  if(nextLink && "IntersectionObserver" in window){
    const nav = nextLink.closest("nav");
    const nota = document.createElement("p");
    nota.className = "auto-next"; nota.textContent = "il prossimo capitolo arriva…";
    nav.after(nota);
    let timer = null, partito = false;
    const ATTESA = 4000;
    const ferma = ()=>{ clearTimeout(timer); timer = null; nextLink.classList.remove("carica"); nota.classList.remove("on"); };
    new IntersectionObserver(es=>{
      if(partito || document.body.classList.contains("locked")) return;
      if(es[0].isIntersecting){
        if(timer) return;
        nextLink.classList.add("carica"); nota.classList.add("on");
        timer = setTimeout(()=>{ partito = true; vaiAvanti(nextLink.href); }, ATTESA);
      } else ferma();
    },{threshold:.9}).observe(nav);
  }
  let avviato = false;
  function vaiAvanti(href){
    if(avviato) return; avviato = true;
    // la canzone continua durante la transizione e sfuma insieme al video
    playTrans(href);
    if(!song.paused){
      const v = trans && trans.querySelector("video");
      const durata = (v && v.duration && isFinite(v.duration) ? v.duration : 3) * 1000;
      setTimeout(()=> fade(0, Math.max(1200, durata - 400)), 400);
    }
  }

  /* --- uscendo dal capitolo la canzone sfuma --- */
  document.addEventListener("click", e=>{
    const a = e.target.closest("a[href]"); if(!a || a.getAttribute("href").startsWith("#")) return;
    const next = a.classList.contains("next");
    if(song.paused && !next) return;
    e.preventDefault();
    if(next){ vaiAvanti(a.href); return; }
    if(!song.paused) fade(0, 700);
    setTimeout(()=> location.href = a.href, 750);
  });

  /* --- comparsa in ordine, dal primo all'ultimo --- */
  function cascade(sel, gap){
    const els=[...document.querySelectorAll(sel)];
    els.forEach(e=> e.style.transitionDelay="0s");
    let i=0;
    (function next(){ if(i>=els.length) return; els[i++].classList.add("in"); setTimeout(next, gap); })();
    /* se scorre più veloce della cascata, compare subito tutto fino a dove è arrivata */
    addEventListener("scroll", ()=>{
      while(i<els.length && els[i].getBoundingClientRect().top < innerHeight*0.95) els[i++].classList.add("in");
    }, {passive:true});
  }

  /* --- petali --- */
  const cv = $("#petals"), cx = cv.getContext("2d");
  let W,H,DPR = Math.min(devicePixelRatio||1,2);
  function size(){ W=innerWidth; H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+"px"; cv.style.height=H+"px"; cx.setTransform(DPR,0,0,DPR,0,0); }
  size(); addEventListener("resize",size);
  const palette = ["232,23,127","255,90,165","255,255,255","200,20,110","255,140,190"];
  const green = ["95,227,154","23,168,92","214,255,226"];
  function petal(x,y,fast,pal){
    pal = pal || palette;
    return { x: x ?? Math.random()*W, y: y ?? -20 - Math.random()*H, r: 5+Math.random()*8,
      vx: fast ? (Math.random()-.5)*9 : -.3+Math.random()*.6, vy: fast ? -4-Math.random()*6 : .3+Math.random()*.6,
      rot: Math.random()*6.28, vr:(Math.random()-.5)*.03, sway: Math.random()*6.28,
      c: pal[Math.random()*pal.length|0], a: .45+Math.random()*.4, fast };
  }
  let petals = Array.from({length: 22}, ()=>petal());
  petals.forEach(p=>{ p.y = Math.random()*H; });
  function burst(el){
    const r = el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/3;
    for(let i=0;i<50;i++) petals.push(petal(x,y,true, i%3 ? palette : green));
  }
  function drawPetal(p){
    cx.save(); cx.translate(p.x,p.y); cx.rotate(p.rot); cx.fillStyle = `rgba(${p.c},${p.a})`;
    cx.beginPath(); cx.moveTo(0,-p.r);
    cx.bezierCurveTo(p.r*.9,-p.r*.6, p.r*.7,p.r*.6, 0,p.r);
    cx.bezierCurveTo(-p.r*.7,p.r*.6, -p.r*.9,-p.r*.6, 0,-p.r);
    cx.fill(); cx.restore();
  }
    /* qualche petalo diventa 23:23 e si dissolve */
  let morphing = 0;
  const FRASI = [
    {t:'23:23', font:'300 19px Jost, sans-serif'},
    {t:'23:23', font:'300 19px Jost, sans-serif'},
    {t:'oggi la luna è bella, vero?', font:'italic 400 19px "Cormorant Garamond", serif'},
    {t:'月が綺麗ですね', font:'300 16px "Hiragino Mincho ProN", serif'},
    {t:'un giorno, tre autunni', font:'italic 400 19px "Cormorant Garamond", serif'},
    {t:'一日三秋', font:'300 17px "Hiragino Mincho ProN", serif'}
  ];
  function draw(p){
    if(p.m === undefined) p.m = -1;
    if(p.m < 0 && !p.fast && morphing < 5 && p.y > H*.08 && p.y < H*.85 && Math.random() < .009){ p.m = 0; morphing++; }
    if(p.m < 0){ drawPetal(p); return; }
    p.m++;
    const T1 = 90, T2 = 110, T3 = 140;
    let pa = 0, ta = 0, sc = 1;
    if(p.m < T1){ pa = 1 - p.m/T1; ta = p.m/T1; }
    else if(p.m < T1+T2){ ta = 1; }
    else if(p.m < T1+T2+T3){ const k = (p.m-T1-T2)/T3; ta = 1-k; sc = 1 + k*.25; }
    else { p.m = -1; p.f = null; morphing--; p.y = -20; p.x = Math.random()*W; return; }
    if(pa > 0){ const a0 = p.a; p.a = a0*pa; drawPetal(p); p.a = a0; }
    cx.save(); cx.translate(p.x, p.y); cx.scale(sc, sc); cx.globalAlpha = ta*.42;
    const fr = p.f || (p.f = FRASI[Math.random()*FRASI.length|0]);
    cx.font = fr.font; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const w = cx.measureText(fr.t).width/2 + 12;
    if(p.x < w) p.x = w; if(p.x > W - w) p.x = W - w;
    cx.fillStyle = (p.x|0) % 2 ? 'rgb(214,40,128)' : 'rgb(40,150,92)';
    cx.fillText(fr.t, 0, 0); cx.restore();
  }
  (function loop(){
    cx.clearRect(0,0,W,H);
    petals.forEach(p=>{
      p.sway += .015; if(p.fast){ p.vy += .18; p.vx *= .985; }
      p.x += p.vx + Math.sin(p.sway)*.4; p.y += p.vy; p.rot += p.vr; draw(p);
    });
    petals = petals.filter(p=> !(p.fast && p.y>H+30));
    petals.forEach(p=>{ if(!p.fast && p.y>H+30){ p.y=-20; p.x=Math.random()*W; } });
    requestAnimationFrame(loop);
  })();
})();

/* --- il voto che sale (capitolo VI) --- */
(function(){
  const v = document.querySelector(".voto"); if(!v) return;
  const steps = JSON.parse(v.dataset.steps), n = v.querySelector(".n b"), bar = v.querySelector(".bar i"), lab = v.querySelector(".lab");
  let started = false;
  new IntersectionObserver(es=>{
    if(started || !es[0].isIntersecting || document.body.classList.contains("locked")) return;
    started = true;
    steps.forEach((s,i)=> setTimeout(()=>{
      n.textContent = s[0]; bar.style.width = s[0]*10+"%"; lab.textContent = s[1];
      n.parentNode.classList.add("pop"); setTimeout(()=>n.parentNode.classList.remove("pop"),350);
      if(i === steps.length-1) v.classList.add("done");
    }, 600 + i*1500));
  },{threshold:.6}).observe(v);
})();

/* --- le note: piccole e chiuse, si aprono col tocco --- */
(function(){
  document.querySelectorAll(".note-app").forEach(n=>{
    const body = n.querySelector(".body"); if(!body) return;
    n.classList.add("chiusa");
    const b = document.createElement("button");
    b.className = "apri"; b.textContent = "tocca per aprire la nota";
    n.appendChild(b);
    n.addEventListener("click", e=>{
      if(n.classList.contains("chiusa")){
        body.style.maxHeight = "118px";
        n.classList.remove("chiusa");
        requestAnimationFrame(()=> body.style.maxHeight = body.scrollHeight + "px");
        b.textContent = "chiudi la nota";
      } else if(e.target === b){
        body.style.maxHeight = body.scrollHeight + "px";
        requestAnimationFrame(()=>{ n.classList.add("chiusa"); body.style.maxHeight = ""; });
        b.textContent = "tocca per aprire la nota";
        n.scrollIntoView({block:"center"});
      }
    });
  });
})();

/* --- barra di lettura in alto --- */
(function(){
  const b = document.createElement("div"); b.className = "lettura"; document.body.appendChild(b);
  const upd = ()=>{ const h = document.documentElement.scrollHeight - innerHeight;
    b.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + "%"; };
  addEventListener("scroll", upd, {passive:true}); addEventListener("resize", upd); upd();
})();
