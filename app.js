
(() => {
  const els = {
    setup: document.getElementById('setup'),
    scorecard: document.getElementById('scorecard'),
    summary: document.getElementById('summary'),
    celebration: document.getElementById('celebration'),
    playerCount: document.getElementById('playerCount'),
    playerCountLive: document.getElementById('playerCountLive'),
    playerNames: document.getElementById('playerNames'),
    startBtn: document.getElementById('startBtn'),
    wakeLockToggle: document.getElementById('wakeLockToggle'),
    thead: document.getElementById('thead'),
    tbody: document.getElementById('tbody'),
    tfoot: document.getElementById('tfoot'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    clearLastBtn: document.getElementById('clearLastBtn'),
    resetBtn: document.getElementById('resetBtn'),
    themeToggle: document.getElementById('themeToggle'),
    endRoundBtn: document.getElementById('endRoundBtn'),
    finalScores: document.getElementById('finalScores'),
    winnerBanner: document.getElementById('winnerBanner'),
    toSummaryBtn: document.getElementById('toSummaryBtn'),
    celebrationCountdown: document.getElementById('celebrationCountdown'),
    totalsPanel: document.getElementById('totalsPanel')
  };

  const STATE_KEY = 'golfState.v4'; const THEME_KEY = 'golfTheme'; const PALETTE_KEY = 'golfPalette';
  let state = { holes:9, pars:Array(9).fill(4), courseRating:72.0, courseSlope:113, players:[{name:'Player 1',scores:[],hi:0,fir:[],gir:[]},{name:'Player 2',scores:[],hi:0,fir:[],gir:[]}], history:[], redo:[], started:false, theme:'dark', palette:'original', course:'custom' };

  function applyTheme(t){ document.body.setAttribute('data-theme', t); if(els.themeToggle) els.themeToggle.textContent = (t==='dark')?'Light':'Dark'; }
  function loadTheme(){ const t = localStorage.getItem(THEME_KEY) || state.theme || 'dark'; state.theme=t; applyTheme(t); }
  function toggleTheme(){ state.theme=(state.theme==='dark')?'light':'dark'; localStorage.setItem(THEME_KEY, state.theme); applyTheme(state.theme); }
  els.themeToggle?.addEventListener('click', toggleTheme);

  function applyPalette(p){ document.body.setAttribute('data-palette', p); const sel = document.getElementById('paletteToggle'); if(sel) sel.value=p; }
  function loadPalette(){ const p = localStorage.getItem(PALETTE_KEY) || state.palette || 'original'; state.palette=p; applyPalette(p); }
  document.getElementById('paletteToggle')?.addEventListener('change', (e)=>{ state.palette=e.target.value; localStorage.setItem(PALETTE_KEY, state.palette); applyPalette(state.palette); });

  function vibrate(ms=10){ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch{} }
  function announce(msg){ const a=document.getElementById('announcer'); if(a){ a.textContent=''; setTimeout(()=>{ a.textContent=msg; }, 10); } }

  const PRESETS = {
    beechwood9: { holes:9, pars:[4,4,3,4,5,4,3,4,5] },
    beechwood18: { holes:18, pars:[4,4,3,4,5,4,3,4,5, 4,4,3,4,5,4,3,4,5] }
  };

  // Wake Lock
  let wakeLock=null; async function requestWakeLock(){ try{ if('wakeLock' in navigator && (els.wakeLockToggle?.checked)){ wakeLock=await navigator.wakeLock.request('screen'); } }catch{} }
  function releaseWakeLock(){ if(wakeLock){ wakeLock.release(); wakeLock=null; } }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') requestWakeLock(); });
  els.wakeLockToggle?.addEventListener('change', ()=>{ if(els.wakeLockToggle.checked){ requestWakeLock(); } else { releaseWakeLock(); } });

  // Persistence
  function save(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); updateActionButtons(); }
  function load(){ try{ const raw=localStorage.getItem(STATE_KEY); if(!raw) return; const parsed=JSON.parse(raw); state=Object.assign(state, parsed); if(!Array.isArray(state.history)) state.history=[]; if(!Array.isArray(state.redo)) state.redo=[]; }catch{} }

  // Setup name + HI fields
  function resetNamesInputs(){
    els.playerNames.innerHTML='';
    const count=parseInt(els.playerCount.value,10);
    for(let i=0;i<count;i++){
      const wrapper=document.createElement('div'); wrapper.className='row'; wrapper.style.gap='8px';
      const nameInp=document.createElement('input'); nameInp.type='text'; nameInp.className='name-input'; nameInp.placeholder=`Player ${i+1}`; nameInp.value=state.players[i]?.name ?? `Player ${i+1}`;
      nameInp.addEventListener('change', (e)=>{ const nm=(e.target.value||`Player ${i+1}`).trim(); if(!state.players[i]) state.players[i]={name:nm,scores:[],hi:0,fir:[],gir:[]}; else state.players[i].name=nm; save(); });
      const hiInp=document.createElement('input'); hiInp.type='number'; hiInp.step='0.1'; hiInp.placeholder='HI'; hiInp.value=state.players[i]?.hi ?? 0; hiInp.style.width='90px'; hiInp.setAttribute('data-field','hi');
      hiInp.addEventListener('change', (e)=>{ const val=Number(e.target.value)||0; if(!state.players[i]) state.players[i]={name:`Player ${i+1}`,scores:[],hi:val,fir:[],gir:[]}; else state.players[i].hi=val; save(); });
      wrapper.appendChild(nameInp); wrapper.appendChild(hiInp);
      els.playerNames.appendChild(wrapper);
    }
  }

  function cell(tag,text){ const el=document.createElement(tag); el.textContent=text; return el; }
  function sum(arr){ return arr.reduce((a,b)=>a+(Number(b)||0),0); }
  function totalForPlayer(pi){ return (state.players[pi].scores||[]).reduce((a,b)=>a+(Number(b)||0),0); }
  function totalForHole(h){ return state.players.reduce((a,p)=>a+(Number(p.scores[h])||0),0); }
  function grandTotal(){ return state.players.reduce((a,_,i)=>a+totalForPlayer(i),0); }
  function computeVsParForPlayer(pi){
    const scores = state.players[pi].scores||[];
    let diff = 0;
    for(let i=0;i<state.holes;i++){
      const s = Number(scores[i]||0);
      const par = Number(state.pars[i]||4);
      if(scores[i] !== '') diff += (s - par);
    }
    return diff;
  }
  function outInTotalsForPlayer(pi){
    const scores = state.players[pi].scores||[];
    const out = sum(scores.slice(0, Math.min(9, state.holes)));
    const inn = state.holes>9 ? sum(scores.slice(9, state.holes)) : 0;
    return { out, inn, total: out + inn };
  }
  function outInPars(){
    const out = sum(state.pars.slice(0, Math.min(9, state.holes)));
    const inn = state.holes>9 ? sum(state.pars.slice(9, state.holes)) : 0;
    return { out, inn, total: out + inn };
  }
  function badgeClassByDelta(delta){
    if(delta <= -2) return 'badge-eagle';
    if(delta === -1) return 'badge-birdie';
    if(delta === 0) return 'badge-par';
    if(delta === 1) return 'badge-bogey';
    if(delta === 2) return 'badge-double';
    return 'badge-triple';
  }

  // Course Handicap & Net (simplified)
  function courseHandicapFor(player){
    const hi = Number(player.hi)||0;
    const slope = Number(state.courseSlope)||113;
    const rating = Number(state.courseRating)||72.0;
    const parTot = sum(state.pars || []);
    const ch = Math.round( hi * (slope/113) + (rating - parTot/ (state.holes/9)) );
    return ch;
  }
  function netScoreFor(playerIndex){
    const gross = totalForPlayer(playerIndex);
    const ch = courseHandicapFor(state.players[playerIndex]);
    return gross - ch;
  }

  function renderTotalsPanel(){
    const panel = document.getElementById('totalsPanel'); if(!panel) return;
    panel.innerHTML = '';
    const parAgg = outInPars();
    state.players.forEach((p,pi)=>{
      const agg = outInTotalsForPlayer(pi);
      const vs = computeVsParForPlayer(pi);
      const card = document.createElement('div');
      card.className = 'totals-card';
      const sign = vs>0?`+${vs}`:String(vs);
      card.innerHTML = `<h4>${p.name}</h4>
        <div class="line"><span>Out</span><span>${agg.out} / ${parAgg.out}</span></div>
        <div class="line"><span>In</span><span>${state.holes>9?agg.inn:'—'}${state.holes>9?(' / '+parAgg.inn):''}</span></div>
        <div class="line"><span>Total</span><span>${agg.total} / ${parAgg.total}</span></div>
        <div class="line"><span>± Par</span><span class="badge ${badgeClassByDelta(vs)}">${sign}</span></div>`;
      panel.appendChild(card);
    });
  }

  function buildTable(){
    const holes=state.holes;
    // Header
    const trh=document.createElement('tr'); trh.appendChild(cell('th','Player'));
    for(let h=1;h<=holes;h++){ trh.appendChild(cell('th',String(h))); }
    trh.appendChild(cell('th','Total')); trh.appendChild(cell('th','±')); trh.appendChild(cell('th','Net'));
    els.thead.innerHTML=''; els.thead.appendChild(trh);

    // Par row
    els.tbody.innerHTML='';
    const parRow = document.createElement('tr'); parRow.className = 'par-row';
    parRow.appendChild(cell('th','Par'));
    for(let h=0;h<holes;h++){
      const td = document.createElement('td');
      const inp = document.createElement('input'); inp.type='number'; inp.min='3'; inp.max='6'; inp.step='1'; inp.className='par-input';
      inp.value = state.pars[h] ?? 4; inp.dataset.h = String(h);
      inp.addEventListener('change', (e)=>{ const idx = Number(e.target.dataset.h); const val = Math.max(3, Math.min(6, Number(e.target.value)||4)); state.pars[idx] = val; save(); recomputeTotals(); renderTotalsPanel(); });
      td.appendChild(inp); parRow.appendChild(td);
    }
    parRow.appendChild(cell('td', String(sum(state.pars)))); parRow.appendChild(cell('td','—')); parRow.appendChild(cell('td','—'));
    els.tbody.appendChild(parRow);

    // Players
    state.players.forEach((p,pi)=>{
      // ensure arrays sized
      if(!Array.isArray(p.scores)) p.scores = Array(holes).fill('');
      if(!Array.isArray(p.fir)) p.fir = Array(holes).fill(false);
      if(!Array.isArray(p.gir)) p.gir = Array(holes).fill(false);

      const tr=document.createElement('tr');
      const tdName=document.createElement('td'); const nameInput=document.createElement('input'); nameInput.type='text'; nameInput.className='name-input'; nameInput.value=p.name; nameInput.dataset.pi=String(pi); nameInput.addEventListener('change', e=>{ const i=Number(e.target.dataset.pi); state.players[i].name=(e.target.value||`Player ${i+1}`).trim().slice(0,40); save(); renderTotalsPanel(); }); tdName.appendChild(nameInput); tr.appendChild(tdName);
      for(let h=0;h<holes;h++){
        const td=document.createElement('td');
        const wrap=document.createElement('div'); wrap.className='cell-controls';
        const dec=document.createElement('button'); dec.type='button'; dec.textContent='−'; dec.setAttribute('aria-label','decrease'); dec.addEventListener('click', ()=> adjustScore(pi,h,-1));
        const inp=document.createElement('input'); inp.type='number'; inp.className='score-input'; inp.min='0'; inp.step='1'; inp.inputMode='numeric'; inp.pattern='[0-9]*'; inp.value=(p.scores[h]??''); inp.dataset.pi=String(pi); inp.dataset.h=String(h); inp.addEventListener('input', onScoreInput);
        const inc=document.createElement('button'); inc.type='button'; inc.textContent='+'; inc.setAttribute('aria-label','increase'); inc.addEventListener('click', ()=> adjustScore(pi,h,1));
        inp.addEventListener('focus', ()=> openKeypad(inp));
        wrap.appendChild(dec); wrap.appendChild(inp); wrap.appendChild(inc); td.appendChild(wrap);
        buildMiniToggles(pi,h,td);
        tr.appendChild(td);
      }
      tr.appendChild(cell('td', String(totalForPlayer(pi))));
      const vs = computeVsParForPlayer(pi);
      const vsCell = document.createElement('td'); const span = document.createElement('span'); span.className = 'badge ' + badgeClassByDelta(vs); span.textContent = (vs>0?`+${vs}`:String(vs)); vsCell.appendChild(span); tr.appendChild(vsCell);
      tr.appendChild(cell('td', String(netScoreFor(pi))));
      els.tbody.appendChild(tr);
    });

    // Footer: Out/In & Grand totals
    const trOut=document.createElement('tr'); trOut.appendChild(cell('th','Out (1–9)'));
    for(let h=0;h<holes;h++){ trOut.appendChild(cell('td', h<9? String(totalForHole(h)) : '')); }
    trOut.appendChild(cell('th', String(state.players.reduce((acc,_,i)=> acc + sum((state.players[i].scores||[]).slice(0, Math.min(9, holes))), 0))));
    trOut.appendChild(cell('td','')); trOut.appendChild(cell('td',''));
    const trIn=document.createElement('tr'); trIn.appendChild(cell('th','In (10–18)'));
    for(let h=0;h<holes;h++){ trIn.appendChild(cell('td', h>=9? String(totalForHole(h)) : '')); }
    const inSum = holes>9 ? state.players.reduce((acc,_,i)=> acc + sum((state.players[i].scores||[]).slice(9, holes)), 0) : 0;
    trIn.appendChild(cell('th', holes>9? String(inSum) : '—'));
    trIn.appendChild(cell('td','')); trIn.appendChild(cell('td',''));
    const trGrand=document.createElement('tr'); trGrand.appendChild(cell('th','Grand Total'));
    for(let h=0;h<holes;h++){ trGrand.appendChild(cell('td', String(totalForHole(h)))); }
    trGrand.appendChild(cell('th', String(grandTotal())));
    trGrand.appendChild(cell('td','')); trGrand.appendChild(cell('td',''));
    els.tfoot.innerHTML=''; els.tfoot.appendChild(trOut); els.tfoot.appendChild(trIn); els.tfoot.appendChild(trGrand);

    if(els.playerCountLive) els.playerCountLive.value = String(state.players.length);
    renderTotalsPanel();
  }

  function recomputeTotals(){
    const rows = [...els.tbody.querySelectorAll('tr')].slice(1);
    rows.forEach((tr,pi)=>{
      tr.children[state.holes+1].textContent = String(totalForPlayer(pi));
      const vs = computeVsParForPlayer(pi);
      const vsCell = tr.children[state.holes+2];
      vsCell.innerHTML = ''; const span = document.createElement('span');
      span.className = 'badge ' + badgeClassByDelta(vs); span.textContent = (vs>0?`+${vs}`:String(vs));
      vsCell.appendChild(span);
      tr.children[state.holes+3].textContent = String(netScoreFor(pi));
    });
    const tfootRows = els.tfoot.querySelectorAll('tr');
    const trOut = tfootRows[0], trIn = tfootRows[1], trGrand = tfootRows[2];
    for(let h=0; h<state.holes; h++){
      if(trOut && h<9) trOut.children[h+1].textContent = String(totalForHole(h));
      if(trIn && h>=9) trIn.children[h+1].textContent = String(totalForHole(h));
      trGrand.children[h+1].textContent = String(totalForHole(h));
    }
    trOut && (trOut.children[state.holes+1].textContent = String(state.players.reduce((acc,_,i)=> acc + sum((state.players[i].scores||[]).slice(0, Math.min(9, state.holes))), 0)));
    trIn && (trIn.children[state.holes+1].textContent = state.holes>9 ? String(state.players.reduce((acc,_,i)=> acc + sum((state.players[i].scores||[]).slice(9, state.holes)), 0)) : '—');
    trGrand.children[state.holes+1].textContent = String(grandTotal());
    renderTotalsPanel();
  }

  function onScoreInput(e){
    const inp=e.target; const pi=Number(inp.dataset.pi), h=Number(inp.dataset.h);
    const prev=state.players[pi].scores[h] ?? ''; const next=inp.value;
    if(String(prev)===String(next)) return;
    state.players[pi].scores[h] = next==='' ? '' : Number(next);
    state.history.push({player:pi, holeIdx:h, prev, next}); state.redo=[]; vibrate(5); announce(`${state.players[pi].name} hole ${h+1} ${next}`); save(); recomputeTotals(); updateActionButtons();
  }
  function adjustScore(pi,h,delta){
    const cur = state.players[pi].scores[h];
    const prev = cur === '' ? '' : Number(cur);
    const next = Math.max(0, (cur===''?0:Number(cur)) + delta);
    state.players[pi].scores[h] = next;
    const inp = els.tbody.querySelector(`input.score-input[data-pi="${pi}"][data-h="${h}"]`);
    if(inp) inp.value = String(next);
    state.history.push({player:pi, holeIdx:h, prev, next}); state.redo = []; vibrate(10); announce(`${state.players[pi].name} hole ${h+1} set to ${next}`); save(); recomputeTotals(); updateActionButtons();
  }

  function undo(){ const le=state.history.pop(); if(!le) return; state.players[le.player].scores[le.holeIdx]= le.prev===''?'':Number(le.prev); const inp=els.tbody.querySelector(`input.score-input[data-pi="${le.player}"][data-h="${le.holeIdx}"]`); if(inp) inp.value=le.prev; state.redo.push(le); vibrate(10); save(); recomputeTotals(); updateActionButtons(); }
  function redo(){ const re=state.redo.pop(); if(!re) return; state.players[re.player].scores[re.holeIdx]= re.next===''?'':Number(re.next); const inp=els.tbody.querySelector(`input.score-input[data-pi="${re.player}"][data-h="${re.holeIdx}"]`); if(inp) inp.value=re.next; state.history.push(re); vibrate(10); save(); recomputeTotals(); updateActionButtons(); }
  function clearLast(){
    if(state.history.length===0) return;
    let idx=state.history.length-1;
    while(idx>=0){ const top=state.history[idx]; const cur=state.players[top.player].scores[top.holeIdx] ?? ''; if(cur===''){ idx--; state.history.pop(); } else break; }
    if(idx<0){ save(); updateActionButtons(); return; }
    const top=state.history[state.history.length-1]; const pi=top.player, h=top.holeIdx; const prev=state.players[pi].scores[h] ?? '';
    state.players[pi].scores[h]=''; const inp=els.tbody.querySelector(`input.score-input[data-pi="${pi}"][data-h="${h}"]`); if(inp) inp.value='';
    state.history.push({player:pi, holeIdx:h, prev, next:''}); state.redo=[]; vibrate(10); save(); recomputeTotals(); updateActionButtons();
  }
  function updateActionButtons(){ els.undoBtn&&(els.undoBtn.disabled=state.history.length===0); els.clearLastBtn&&(els.clearLastBtn.disabled=state.history.length===0); els.redoBtn&&(els.redoBtn.disabled=state.redo.length===0); }

  function startRound(){
    const holes = Number(document.querySelector('input[name="holes"]:checked')?.value || 9);
    const count = Number(document.getElementById('playerCount').value || 2);
    const wrappers = [...els.playerNames.querySelectorAll('.row')];
    const players=[];
    for(let i=0;i<count;i++){
      const name = (wrappers[i]?.querySelector('input[type="text"]')?.value || `Player ${i+1}`).trim();
      const hi = Number(wrappers[i]?.querySelector('input[type="number"]')?.value || 0);
      players.push({name, hi, scores:Array(holes).fill(''), fir:Array(holes).fill(false), gir:Array(holes).fill(false)});
    }
    if(state.pars.length !== holes){
      if(holes===9) state.pars = state.pars.slice(0,9);
      else { while(state.pars.length<18) state.pars.push(4); state.pars = state.pars.slice(0,18); }
    }
    state.holes=holes; state.players=players; state.started=true; state.history=[]; state.redo=[]; save();
    els.setup.hidden=true; els.scorecard.hidden=false; els.summary.hidden=true; els.celebration.hidden=true;
    buildTable(); recomputeTotals();
  }

  function changePlayerCountLive(newCount){
    const current=state.players.length; if(newCount===current) return;
    if(newCount<current){
      if(!confirm('Reduce players? This removes players from the end and their scores.')){ els.playerCountLive.value=String(current); return; }
      state.players = state.players.slice(0,newCount);
    } else {
      for(let i=current;i<newCount;i++){ state.players.push({name:`Player ${i+1}`, hi:0, scores:Array(state.holes).fill(''), fir:Array(state.holes).fill(false), gir:Array(state.holes).fill(false)}); }
    }
    state.history=[]; state.redo=[]; save(); buildTable(); recomputeTotals();
  }

  
// Summary confetti (light burst on Summary screen)
let sumConfettiRAF=null;
function startSummaryConfetti(durationMs=1800){
  const canvas = document.getElementById('summaryConfetti');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.clientWidth * DPR;
  const H = canvas.clientHeight * DPR;
  canvas.width = W; canvas.height = H;
  const colors = ['#ffd700','#ff4d4d','#4dd2ff','#66ff66','#ff99ff'];
  const parts = Array.from({length: 120}, ()=>({
    x: Math.random()*W,
    y: Math.random()*H*0.2 + H*0.1,
    r: 3 + Math.random()*5,
    c: colors[Math.floor(Math.random()*colors.length)],
    vy: -(2 + Math.random()*2),
    vx: (Math.random()-0.5)*2
  }));
  const start = performance.now();
  function tick(now){
    sumConfettiRAF = requestAnimationFrame(tick);
    ctx.clearRect(0,0,W,H);
    for(const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.03;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    if(now - start > durationMs){ cancelSummaryConfetti(); }
  }
  cancelSummaryConfetti();
  sumConfettiRAF = requestAnimationFrame(tick);
}
function cancelSummaryConfetti(){ if(sumConfettiRAF){ cancelAnimationFrame(sumConfettiRAF); sumConfettiRAF=null; } }
// Confetti
  function startConfetti(){
    const canvas = document.getElementById('confettiCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    function resize(){ canvas.width = innerWidth * DPR; canvas.height = innerHeight * DPR; }
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffd700','#ff4d4d','#4dd2ff','#66ff66','#ff99ff'];
    const parts = Array.from({length: 160}, ()=>({
      x: Math.random()*canvas.width,
      y: -Math.random()*canvas.height,
      r: 4 + Math.random()*6,
      c: colors[Math.floor(Math.random()*colors.length)],
      vy: 1 + Math.random()*2,
      vx: -1 + Math.random()*2,
      rot: Math.random()*Math.PI,
      vr: -0.05 + Math.random()*0.1
    }));
    let raf=0;
    function tick(){
      raf=requestAnimationFrame(tick);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(const p of parts){
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if(p.y > canvas.height + 20){ p.y = -10; p.x = Math.random()*canvas.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
        ctx.restore();
      }
    }
    tick();
  }
  function stopConfetti(){
    const canvas = document.getElementById('confettiCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  let celebrationTimer = null;
  function startCelebrationCountdown(seconds=10){
    let remaining = seconds;
    const label = document.getElementById('celebrationCountdown');
    if(label) label.textContent = String(remaining);
    celebrationTimer = setInterval(()=>{
      remaining -= 1;
      if(label) label.textContent = String(Math.max(remaining,0));
      if(remaining <= 0){
        clearInterval(celebrationTimer);
        toSummary();
      }
    }, 1000);
  }
  function cancelCelebrationCountdown(){
    if(celebrationTimer){ clearInterval(celebrationTimer); celebrationTimer = null; }
  }
  function toSummary(){
    cancelCelebrationCountdown();
    els.celebration.hidden = true; stopConfetti();
    els.summary.hidden = false;
    const totals = state.players.map(p => ({ name: p.name, total: (p.scores||[]).reduce((a,b)=>a+(Number(b)||0),0) }));
    const min = Math.min(...totals.map(t=>t.total));
    const leaders = totals.filter(t => t.total === min).map(t=>t.name);
    if(leaders.length > 1){
      els.winnerBanner.hidden = false;
      els.winnerBanner.textContent = `Draw: ${leaders.join(', ')} (${min})`;
    } else {
      els.winnerBanner.hidden = false;
      els.winnerBanner.textContent = `Winner: ${leaders[0]} (${min})`;
    }
    els.finalScores.innerHTML='';
    totals.forEach(t=>{ const li=document.createElement('li'); li.textContent = `${t.name} (${t.total})`; els.finalScores.appendChild(li); });
    startSummaryConfetti(1800);
  }
  document.getElementById('toSummaryBtn')?.addEventListener('click', toSummary);

  // Export helpers
  function buildCsv(){
    const holes = state.holes;
    const headers = ["Player"].concat(Array.from({length:holes}, (_,i)=>"H"+(i+1))).concat(["Total","±Par","Net"]);
    const rows = [headers.join(",")];
    state.players.forEach((p,pi)=>{
      const scores = (p.scores||[]).map(v => (v === '' ? '' : Number(v)));
      const total = scores.reduce((a,b)=>a+(Number(b)||0),0);
      const vs = computeVsParForPlayer(pi);
      const net = netScoreFor(pi);
      const row = [p.name].concat(scores).concat([total, vs>0?`+${vs}`:String(vs), net]);
      rows.push(row.join(","));
    });
    return rows.join("\n");
  }
  function buildTextSummary(){
    let out = "Round Summary\n";
    state.players.forEach((p,pi)=>{
      const total = (p.scores||[]).reduce((a,b)=>a+(Number(b)||0),0);
      out += `${p.name} (${total})\n`;
    });
    return out;
  }

  // Shareable round link
  function encodeStateForShare(){
    const shareObj = {
      holes: state.holes,
      pars: state.pars,
      courseRating: state.courseRating,
      courseSlope: state.courseSlope,
      players: state.players.map(p=>({name:p.name, scores:p.scores, hi:p.hi})),
    };
    const jsonStr = JSON.stringify(shareObj);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const url = location.origin + location.pathname + '?s=' + b64;
    return url;
  }
  function tryLoadSharedState(){
    const params = new URLSearchParams(location.search);
    if(!params.has('s')) return;
    try{
      const b64 = params.get('s');
      const jsonStr = decodeURIComponent(escape(atob(b64)));
      const obj = JSON.parse(jsonStr);
      Object.assign(state, obj);
      state.players = (state.players||[]).map(p=>({ name:p.name, scores:p.scores||Array(state.holes).fill(''), hi: p.hi||0, fir:Array(state.holes).fill(false), gir:Array(state.holes).fill(false) }));
      save();
    }catch(e){}
  }

  // History
  const ROUNDS_KEY = 'golfRounds.v1';
  function saveRoundToHistory(){
    const rounds = JSON.parse(localStorage.getItem(ROUNDS_KEY) || '[]');
    const payload = {
      t: Date.now(),
      holes: state.holes,
      pars: state.pars,
      courseRating: state.courseRating,
      courseSlope: state.courseSlope,
      players: state.players.map((p,idx)=>({ name:p.name, gross: totalForPlayer(idx), net: netScoreFor(idx) }))
    };
    let winner = payload.players.slice().sort((a,b)=>a.gross-b.gross)[0];
    payload.winner = winner ? `${winner.name} (${winner.gross})` : '';
    rounds.unshift(payload);
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  }
  function renderHistory(){
    const list = document.getElementById('historyList'); if(!list) return;
    const rounds = JSON.parse(localStorage.getItem(ROUNDS_KEY) || '[]');
    list.innerHTML='';
    rounds.forEach(r=>{
      const li = document.createElement('li');
      const date = new Date(r.t).toLocaleString();
      li.innerHTML = `<div class="rowtop"><span>${date}</span><span>${r.winner}</span></div>` +
        `<div class="players">${r.players.map(p=>`${p.name} (G ${p.gross} / N ${p.net})`).join(' · ')}</div>`;
      list.appendChild(li);
    });
  }
  document.getElementById('historyIcon')?.addEventListener('click', ()=>{ els.setup.hidden=true; els.scorecard.hidden=true; els.summary.hidden=true; document.getElementById('history').hidden=false; renderHistory(); });
  document.getElementById('closeHistoryBtn')?.addEventListener('click', ()=>{ document.getElementById('history').hidden=true; els.setup.hidden = !state.started; els.scorecard.hidden = !els.setup.hidden; });
  document.getElementById('clearHistoryBtn')?.addEventListener('click', ()=>{ if(confirm('Clear all saved rounds?')){ localStorage.removeItem(ROUNDS_KEY); renderHistory(); } });

  // Summary actions
  (function attachSummaryActions(){
    const restart = document.getElementById('restartAppBtn');
    if(restart){
      restart.addEventListener('click', ()=>{
        const keepTheme = state.theme; const keepPalette = state.palette;
        localStorage.removeItem(STATE_KEY);
        state = { holes:9, pars:Array(9).fill(4), courseRating:72.0, courseSlope:113, players:[{name:'Player 1',scores:[],hi:0,fir:[],gir:[]},{name:'Player 2',scores:[],hi:0,fir:[],gir:[]}], history:[], redo:[], started:false, theme: keepTheme || 'dark', palette: keepPalette || 'original', course:'custom' };
        document.getElementById('coursePreset').value = 'custom';
        document.getElementById('holes9').checked = true; document.getElementById('holes18').checked = false;
        document.getElementById('playerCount').value = "2";
        els.playerNames.innerHTML = "";
        for(let i=0;i<2;i++){ const wrap=document.createElement('div'); wrap.className='row'; const name=document.createElement('input'); name.type='text'; name.className='name-input'; name.placeholder=`Player ${i+1}`; name.value=`Player ${i+1}`; const hi=document.createElement('input'); hi.type='number'; hi.step='0.1'; hi.placeholder='HI'; hi.value='0'; hi.style.width='90px'; wrap.appendChild(name); wrap.appendChild(hi); els.playerNames.appendChild(wrap); }
        const parWrap = document.getElementById('parInputs'); parWrap.innerHTML='';
        for(let i=0;i<9;i++){ const lab=document.createElement('label'); lab.style.display='flex'; lab.style.flexDirection='column'; lab.style.alignItems='center'; lab.style.minWidth='64px'; lab.innerHTML = `<span style="font-size:12px;margin-bottom:4px;">H${i+1}</span>`; const inp=document.createElement('input'); inp.type='number'; inp.min='3'; inp.max='6'; inp.step='1'; inp.className='par-input'; inp.value='4'; inp.dataset.h=String(i); lab.appendChild(inp); parWrap.appendChild(lab); }
        save();
        els.summary.hidden = true; els.celebration.hidden=true; els.scorecard.hidden=true; els.setup.hidden = false;
        window.scrollTo({top:0, behavior:"smooth"});
      });
    }
    const exportCsv = document.getElementById('exportCsvBtn');
    if(exportCsv){
      exportCsv.addEventListener('click', ()=>{
        const csv = buildCsv();
        const blob = new Blob([csv], {type:"text/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "golf_round.csv"; a.click();
        URL.revokeObjectURL(url);
      });
    }
    const exportText = document.getElementById('exportTextBtn');
    if(exportText){
      exportText.addEventListener('click', async ()=>{
        const text = buildTextSummary();
        if(navigator.clipboard){
          await navigator.clipboard.writeText(text);
          alert("Copied text summary to clipboard.");
        } else {
          alert(text);
        }
      });
    }
    const shareBtn = document.getElementById('shareResultsBtn');
    if(shareBtn){
      shareBtn.addEventListener('click', async ()=>{
        const text = buildTextSummary();
        try{
          if(navigator.share){ await navigator.share({ text }); }
          else if(navigator.clipboard){ await navigator.clipboard.writeText(text); alert("Copied results to clipboard."); }
          else { alert(text); }
        }catch(e){}
      });
    }
    const shareLinkBtn = document.getElementById('shareLinkBtn');
    if(shareLinkBtn){
      shareLinkBtn.addEventListener('click', async ()=>{
        const url = encodeStateForShare();
        try{ await navigator.clipboard.writeText(url); alert('Shareable link copied to clipboard.'); }catch{ alert(url); }
      });
    }
    const replay = document.getElementById('replayConfettiBtn');
    if(replay){
      replay.addEventListener('click', ()=>{ startSummaryConfetti(1800); });
    }
  })();

  // Setup enhancements
  const coursePreset = document.getElementById('coursePreset');
  coursePreset?.addEventListener('change', (e)=>{
    const val = e.target.value;
    if(val==='custom'){ state.course='custom'; }
    else {
      state.course = val;
      const p = PRESETS[val]; if(p){ state.holes=p.holes; state.pars=p.pars.slice(); }
      state.players = state.players.map(pl=>({ name: pl.name, hi: pl.hi||0, scores: Array(state.holes).fill(''), fir:Array(state.holes).fill(false), gir:Array(state.holes).fill(false) }));
      document.getElementById('holes9').checked = (state.holes===9);
      document.getElementById('holes18').checked = (state.holes===18);
    }
    save(); renderParInputs();
  });
  document.getElementById('holes9')?.addEventListener('change', ()=>{
    if(document.getElementById('holes9').checked){
      state.holes = 9; state.pars = state.pars.slice(0,9); if(state.pars.length<9){ while(state.pars.length<9) state.pars.push(4); }
      save(); renderParInputs();
    }
  });
  document.getElementById('holes18')?.addEventListener('change', ()=>{
    if(document.getElementById('holes18').checked){
      state.holes = 18; if(state.pars.length<18){ while(state.pars.length<18) state.pars.push(4); }
      save(); renderParInputs();
    }
  });

  // Par inputs render
  function renderParInputs(){
    const wrap = document.getElementById('parInputs'); if(!wrap) return;
    wrap.innerHTML = '';
    for(let h=0; h<state.holes; h++){
      const label = document.createElement('label');
      label.style.display='flex'; label.style.flexDirection='column'; label.style.alignItems='center';
      label.style.minWidth='64px';
      label.innerHTML = `<span style="font-size:12px;margin-bottom:4px;">H${h+1}</span>`;
      const inp = document.createElement('input');
      inp.type='number'; inp.min='3'; inp.max='6'; inp.step='1'; inp.className='par-input';
      inp.value = state.pars[h] ?? 4;
      inp.dataset.h = String(h);
      inp.addEventListener('change', (e)=>{
        const idx = Number(e.target.dataset.h);
        const val = Math.max(3, Math.min(6, Number(e.target.value)||4));
        state.pars[idx] = val;
        save();
        if(!els.setup.hidden){ /* still on setup */ }
        else { buildTable(); recomputeTotals(); renderTotalsPanel(); }
      });
      label.appendChild(inp);
      wrap.appendChild(label);
    }
  }

  // Keypad helpers
  let keypadTarget = null;
  const keypad = {
    overlay: document.getElementById('keypadOverlay'),
    clear: document.getElementById('keypadClear'),
    done: document.getElementById('keypadDone')
  };
  function openKeypad(inputEl){ keypadTarget = inputEl; keypad.overlay.classList.add('visible'); }
  function closeKeypad(){ keypad.overlay.classList.remove('visible'); keypadTarget = null; }
  keypad.overlay?.addEventListener('click', (e)=>{ if(e.target === keypad.overlay) closeKeypad(); });
  document.querySelector('[data-close="keypadOverlay"]')?.addEventListener('click', closeKeypad);
  document.querySelectorAll('#keypadOverlay .keypad button[data-k]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(!keypadTarget) return;
      const k = btn.getAttribute('data-k');
      let val = keypadTarget.value ? Number(keypadTarget.value) : 0;
      if(k==='+1') val = (Number(keypadTarget.value||0))+1;
      else if(k==='-1') val = Math.max(0,(Number(keypadTarget.value||0))-1);
      else { const s = (keypadTarget.value||'') + k; val = Number(s); }
      keypadTarget.value = String(val);
      keypadTarget.dispatchEvent(new Event('input', {bubbles:true}));
    });
  });
  keypad.clear?.addEventListener('click', ()=>{ if(!keypadTarget) return; keypadTarget.value=''; keypadTarget.dispatchEvent(new Event('input', {bubbles:true})); });
  keypad.done?.addEventListener('click', closeKeypad);

  // Mini toggles builder
  function buildMiniToggles(pi,h,td){
    const bar = document.createElement('div'); bar.className='mini-toggles';
    const firBtn = document.createElement('button'); firBtn.textContent='FIR'; if(state.players[pi].fir[h]) firBtn.classList.add('active');
    firBtn.addEventListener('click', ()=>{ state.players[pi].fir[h] = !state.players[pi].fir[h]; firBtn.classList.toggle('active'); save(); });
    const girBtn = document.createElement('button'); girBtn.textContent='GIR'; if(state.players[pi].gir[h]) girBtn.classList.add('active');
    girBtn.addEventListener('click', ()=>{ state.players[pi].gir[h] = !state.players[pi].gir[h]; girBtn.classList.toggle('active'); save(); });
    bar.appendChild(firBtn); bar.appendChild(girBtn);
    td.appendChild(bar);
  }

  function endRound(){
    const totals = state.players.map(p => ({ name: p.name, total: (p.scores||[]).reduce((a,b)=>a+(Number(b)||0),0) }));
    const sorted = [...totals].sort((a,b)=>a.total-b.total);
    const min = sorted.length ? sorted[0].total : 0;
    const leaders = totals.filter(t => t.total === min).map(t=>t.name);
    if(leaders.length > 1){
      document.getElementById('celebrationTitle').textContent = 'Draw!';
      document.getElementById('celebrationSubtitle').textContent = `${leaders.join(', ')} (${min})`;
    } else {
      document.getElementById('celebrationTitle').textContent = 'Winner!';
      document.getElementById('celebrationSubtitle').textContent = `${leaders[0]} (${min})`;
    }
    els.setup.hidden=true; els.scorecard.hidden=true; els.summary.hidden=true; els.celebration.hidden=false;
    startConfetti();
    startCelebrationCountdown(10);

    els.finalScores.innerHTML='';
    state.players.forEach(p=>{
      const total=(p.scores||[]).reduce((a,b)=>a+(Number(b)||0),0);
      const li=document.createElement('li'); li.textContent = `${p.name} (${total})`;
      els.finalScores.appendChild(li);
    });
    if(sorted.length){
      els.winnerBanner.hidden=false;
      if(leaders.length > 1){
        els.winnerBanner.textContent = `Draw: ${leaders.join(', ')} (${min})`;
      } else {
        els.winnerBanner.textContent = `Winner: ${leaders[0]} (${min})`;
      }
    } else {
      els.winnerBanner.hidden=true;
    }
    saveRoundToHistory();
  }

  // Events
  els.playerCount?.addEventListener('change', resetNamesInputs);
  els.startBtn?.addEventListener('click', startRound);
  els.undoBtn?.addEventListener('click', undo);
  els.redoBtn?.addEventListener('click', redo);
  els.clearLastBtn?.addEventListener('click', clearLast);
  els.resetBtn?.addEventListener('click', ()=>{ if(confirm('Clear all scores and restart?')){ state.players.forEach(p=>p.scores=Array(state.holes).fill('')); state.history=[]; state.redo=[]; save(); buildTable(); recomputeTotals(); } });
  els.playerCountLive?.addEventListener('change', (e)=> changePlayerCountLive(Number(e.target.value)));
  els.endRoundBtn?.addEventListener('click', endRound);

  // Init
  load(); loadTheme(); loadPalette(); tryLoadSharedState();
  if(document.getElementById('courseRating')) document.getElementById('courseRating').value = String(state.courseRating||72);
  if(document.getElementById('courseSlope')) document.getElementById('courseSlope').value = String(state.courseSlope||113);
  const initialCount = Number(document.getElementById('playerCount')?.value || 2);
  state.players = Array.from({length:initialCount}, (_,i)=> state.players[i] || {name:`Player ${i+1}`,hi:0,scores:[],fir:[],gir:[]});
  resetNamesInputs(); renderParInputs();
  if(state.started){
    els.setup.hidden=true; els.scorecard.hidden=false; buildTable(); recomputeTotals();
  }

  // Expose for debug (optional)
  window._golf = { state };
})();
