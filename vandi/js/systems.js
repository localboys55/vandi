// Vandi — systems: voices, radio, weather, police checks, documents, GPS routing, ride app helpers
'use strict';

// =================== Voices (spoken shouts & radio DJ) ===================
const VOICE = {voices: [], ready: false};
function loadVoices(){ try { VOICE.voices = speechSynthesis.getVoices() || []; VOICE.ready = VOICE.voices.length > 0; } catch(e) {} }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function voiceFor(lang){
  const pref = {ml:['ml'], ta:['ta'], en:['en-IN','en']}[lang] || ['en-IN','en'];
  for (const p of pref) { const v = VOICE.voices.find(v => v.lang && v.lang.toLowerCase().replace('_','-').startsWith(p.toLowerCase())); if (v) return v; }
  return null;
}
function hasVoice(lang){ return !!voiceFor(lang); }
// lang: ml | ta | en | mg | tg. fallback = romanised text for en voice if the native voice is missing.
function sayAloud(text, lang, fallback, opts){
  if (!('speechSynthesis' in window) || !S || S.settings.voices === false) return;
  opts = opts || {};
  try {
    if (speechSynthesis.speaking && !opts.force) return;
    let useLang = (lang === 'mg' || lang === 'tg') ? 'en' : lang, say = text;
    let v = voiceFor(useLang);
    if (!v && (useLang === 'ml' || useLang === 'ta')) { useLang = 'en'; v = voiceFor('en'); say = fallback || text; }
    const u = new SpeechSynthesisUtterance(say);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = useLang === 'ml' ? 'ml-IN' : useLang === 'ta' ? 'ta-IN' : 'en-IN';
    u.rate = opts.rate || 1.05; u.pitch = opts.pitch || (0.8 + Math.random()*0.6); u.volume = opts.volume ?? 1;
    speechSynthesis.speak(u);
  } catch(e) {}
}

// =================== Weather: random showers & monsoon storms ===================
const WX = {rain: 0, target: 0, monsoon: false, until: 0, nextRoll: 0, flash: 0, thunderAt: -1};
function weatherRoll(){
  const KLs = W.city.st === 'KL';
  if (WX.target > 0) return;
  const chance = KLs ? 0.14 : 0.07;
  if (Math.random() < chance) {
    WX.monsoon = Math.random() < (KLs ? 0.4 : 0.25);
    WX.target = WX.monsoon ? 1 : rnd(0.35, 0.7);
    WX.until = S.min + rnd(30, WX.monsoon ? 200 : 120);
    toast(WX.monsoon ? '⛈ Monsoon storm rolling in! Roads are slippery.' : '🌧 It\'s starting to rain', 'info');
    phoneNote(WX.monsoon ? 'Monsoon alert: heavy rain and lightning' : 'Rain started. Drive slowly.');
  }
}
function updateWeather(dt){
  const m = S.min % 1440;
  WX.nextRoll -= dt;
  if (WX.nextRoll <= 0) { WX.nextRoll = 60; weatherRoll(); }
  if (WX.target > 0 && S.min > WX.until) { WX.target = 0; WX.monsoon = false; toast('☀ The rain has stopped', 'info'); }
  WX.rain += clamp(WX.target - WX.rain, -dt*0.08, dt*0.08);
  if (WX.monsoon && WX.rain > 0.6 && Math.random() < dt*0.08) { WX.flash = 0.25; WX.thunderAt = simT + rnd(0.6, 2.5); }
  if (WX.flash > 0) WX.flash -= dt;
  if (WX.thunderAt > 0 && simT > WX.thunderAt) { WX.thunderAt = -1; if (typeof playNoise === 'function') { playNoise(2.2, 0.55, 160); playNoise(1.2, 0.3, 90); } }
}
function rainLevel(){ return WX.rain; }

// =================== Documents, fatigue & police checks ===================
function defaultDocs(day){ return {lmv:false, transport:true, heavy:false, insUntil: day + 20, permitUntil: day + 20, pucUntil: day + 10}; }
function docStatus(){
  const d = S.docs, cat = P.def.cat;
  const need = LICENCE_NEEDS[cat];
  const out = [];
  need.forEach(k => out.push({key:'licence', label: LICENCE_NAMES[k], ok: !!d[k]}));
  out.push({key:'insurance', label:'Insurance (valid to Day ' + d.insUntil + ')', ok: S.day <= d.insUntil});
  if (cat !== 'car') out.push({key:'permit', label:'Commercial permit (to Day ' + d.permitUntil + ')', ok: S.day <= d.permitUntil});
  out.push({key:'puc', label:'Pollution certificate (to Day ' + d.pucUntil + ')', ok: S.day <= d.pucUntil});
  out.push({key:'unfit', label:'Fit to drive (' + Math.floor(S.fatigue) + ' h driving without rest)', ok: S.fatigue < 12});
  return out;
}
let CHECK = null;
function scheduleCheck(){ S.nextCheck = S.min + rnd(300, 600); }
function spawnCheckpoint(){
  if (onFoot || wanted || CHECK) return;
  const f = fwd(P.h);
  const line = W.roadAt(P.x, P.z, P.h); if (!line) return;
  const dir = line.axis === 'x' ? Math.sign(f.x || 1) : Math.sign(f.z || 1);
  const along = line.axis === 'x' ? P.x : P.z;
  let best = null;
  for (let d = 70; d < 200; d += T) {
    const s2 = along + dir*d, tx = line.axis === 'x' ? Math.round(s2/T) : line.idx, tz = line.axis === 'x' ? line.idx : Math.round(s2/T);
    if (W.isRoad(tx,tz) && !W.isInter(tx,tz) && W.tileAt(tx,tz) === ROAD) { best = {tx,tz}; break; }
  }
  if (!best) return;
  const g = new THREE.Group();
  const cx = best.tx*T, cz = best.tz*T;
  // checkpoint sits on the left side of the player's direction of travel
  const left = line.axis === 'x' ? {x:0, z:-dir} : {x:dir, z:0};
  const px = cx + left.x*4.3, pz = cz + left.z*4.3;
  const jeep = makeVehicle('police', {len:4.4, wid:1.8, id:'police'}, null);
  jeep.position.set(cx + left.x*7.2, 0, cz + left.z*7.2); jeep.rotation.y = line.axis === 'x' ? Math.PI/2 : 0; g.add(jeep);
  for (let i = -1; i <= 1; i++) { const b = new THREE.Mesh(boxGeo(line.axis==='x'?1.6:0.5, 0.9, line.axis==='x'?0.5:1.6), mat(i%2 ? 0xffffff : 0xd91e18)); b.position.set(px + (line.axis==='x'?i*1.7:0), 0.45, pz + (line.axis==='x'?0:i*1.7)); g.add(b); }
  const offs = [];
  for (let i = 0; i < 2; i++) {
    const o = makePerson(0xb08d57, 0x8a6d3b, 0x6b4430);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.12,10), mat(0xb08d57)); cap.position.y = 1.82; o.add(cap);
    o.position.set(px + left.x*1.2 + (line.axis==='x' ? (i?3:-3) : 0), 0, pz + left.z*1.2 + (line.axis==='x' ? 0 : (i?3:-3)));
    o.lookAt(cx, 0, cz); g.add(o); offs.push({mesh:o, x:o.position.x, z:o.position.z});
  }
  scene.add(g);
  CHECK = {g, x:cx, z:cz, offs, line, until: S.min + 90, closest: 1e9, stopT: 0, warned: false};
  phoneNote('🚓 Police check ahead on ' + line.name[0]);
}
function clearCheckpoint(){ if (CHECK) { scene.remove(CHECK.g); CHECK = null; } }
function updateChecks(dt){
  if (!onFoot && P.v > 0.5) S.fatigue = (S.fatigue || 0) + dt/60;
  if (S.fatigue > 10 && !S._tiredWarned) { S._tiredWarned = true; toast('😴 You\'ve been driving 10 hours. Have a chai break at a tea shop.', 'info'); }
  if (!S.nextCheck) scheduleCheck();
  if (!CHECK && S.min > S.nextCheck && !onFoot && !wanted) { spawnCheckpoint(); scheduleCheck(); }
  if (!CHECK) return;
  const M = me();
  const d = Math.hypot(M.x - CHECK.x, M.z - CHECK.z);
  if (d < 40 && !CHECK.warned) { CHECK.warned = true; speak(CHECK.offs[0], 'check', 2.3); }
  if (!onFoot && d < 14 && Math.abs(P.v) < 1) { CHECK.stopT += dt; if (CHECK.stopT > 0.8) { const c = CHECK; runCheck(); return; } }
  if (CHECK.closest < 11 && d > CHECK.closest + 6 && !onFoot) {
    clearCheckpoint(); addWanted(2, 'Drove past a police check'); return;
  }
  CHECK.closest = Math.min(CHECK.closest, d);
  if (S.min > CHECK.until && d > 80) clearCheckpoint();
}
function runCheck(){
  const items = docStatus();
  let fine = 0;
  items.forEach(it => { if (!it.ok) fine += FINES[it.key]; });
  const ok = fine === 0;
  S.money -= fine; S.stats.fines += fine; if (S.today) S.today.fines += fine;
  let html = '<h2>🚓 Police vehicle check</h2><p class="small">' + escapeHtml(CHECK.line.name[0]) + ' · ' + escapeHtml(W.city.en) + '</p><div class="checklist">';
  items.forEach(it => html += '<div class="ck ' + (it.ok ? 'ok' : 'bad') + '">' + (it.ok ? '✅' : '❌') + ' ' + escapeHtml(it.label) + (it.ok ? '' : ' <b>−₹' + FINES[it.key] + '</b>') + '</div>');
  html += '</div>' + (ok ? '<p><b>All in order. "Thank you, drive safely!"</b></p>' : '<p>You paid fines of <b>' + money(fine) + '</b>. Renew documents and licences at the RTO office. Pollution certificates are also sold at petrol pumps. Rest at a tea shop if you\'re tired.</p>');
  clearCheckpoint();
  persist();
  showModal(html, [{t:'Continue', f:closeModal}]);
}
function openRTO(){
  const d = S.docs, cat = P.def.cat;
  const insP = cat === 'bus' ? 1500 : cat === 'car' ? 900 : 600;
  const render = () => {
    let html = '<h2>🏛 ' + escapeHtml(W.city.en) + ' RTO Office</h2><p class="native">' + escapeHtml(PLACE_TYPES.rto[W.city.st]) + '</p><p class="small">You have <b>' + money(S.money) + '</b> · Today is Day ' + S.day + '</p><div class="vlist">';
    Object.keys(LICENCE_NAMES).forEach(k => html += '<div class="vrow"><div class="vinfo"><b>' + LICENCE_NAMES[k] + '</b><span>' + (k==='lmv'?'Cars & taxis':k==='heavy'?'Buses':'Autos, taxis & buses') + '</span></div>' + (d[k] ? '<span class="tag">Have it</span>' : '<button class="btn small" data-lic="' + k + '"' + (S.money < LICENCE_PRICE[k] ? ' disabled' : '') + '>' + money(LICENCE_PRICE[k]) + '</button>') + '</div>');
    html += '<div class="vrow"><div class="vinfo"><b>Insurance +30 days</b><span>Valid to Day ' + d.insUntil + '</span></div><button class="btn small" data-ren="ins"' + (S.money < insP ? ' disabled' : '') + '>' + money(insP) + '</button></div>';
    html += '<div class="vrow"><div class="vinfo"><b>Commercial permit +30 days</b><span>Valid to Day ' + d.permitUntil + '</span></div><button class="btn small" data-ren="permit"' + (S.money < 400 ? ' disabled' : '') + '>₹400</button></div>';
    html += '<div class="vrow"><div class="vinfo"><b>Pollution certificate +15 days</b><span>Valid to Day ' + d.pucUntil + '</span></div><button class="btn small" data-ren="puc"' + (S.money < 100 ? ' disabled' : '') + '>₹100</button></div></div>';
    showModal(html, [{t:'Leave', f:closeModal}]);
    $('modalBody').querySelectorAll('[data-lic]').forEach(b => b.onclick = () => { const k = b.dataset.lic; if (S.money < LICENCE_PRICE[k]) return; S.money -= LICENCE_PRICE[k]; d[k] = true; toast('Got your ' + LICENCE_NAMES[k], 'good'); persist(); render(); });
    $('modalBody').querySelectorAll('[data-ren]').forEach(b => b.onclick = () => { const k = b.dataset.ren; const cost = k==='ins'?insP:k==='permit'?400:100; if (S.money < cost) return; S.money -= cost;
      if (k==='ins') d.insUntil = Math.max(d.insUntil, S.day) + 30; if (k==='permit') d.permitUntil = Math.max(d.permitUntil, S.day) + 30; if (k==='puc') d.pucUntil = Math.max(d.pucUntil, S.day) + 15; toast('Renewed', 'good'); persist(); render(); });
  };
  render();
}
function chaiBreak(){
  if (S.money < 15) { toast('A chai costs ₹15', 'bad'); return; }
  S.money -= 15; S.fatigue = 0; S._tiredWarned = false; advanceTime(15);
  toast('☕ Chai break. You feel fresh again!', 'good'); persist();
}

// =================== GPS route on the road grid ===================
function nearestNode(x, z){
  const tx = Math.round(x/T), tz = Math.round(z/T);
  const onRow = W.rows.includes(tz), onCol = W.cols.includes(tx);
  let best = null, bd = 1e9;
  const consider = (c, r) => { const d = Math.hypot(c*T - x, r*T - z); if (d < bd) { bd = d; best = {c, r}; } };
  if (onRow) W.cols.forEach(c => consider(c, tz));
  if (onCol) W.rows.forEach(r => consider(tx, r));
  if (!best) W.cols.forEach(c => W.rows.forEach(r => consider(c, r)));
  return best;
}
function computeRoute(from, to){
  const a = nearestNode(from.x, from.z), b = nearestNode(to.x, to.z);
  if (!a || !b) return [from, to];
  const pts = [{x:from.x, z:from.z}, {x:a.c*T, z:a.r*T}];
  // L-shaped path: along the start row, then down the target column
  if (a.c !== b.c) pts.push({x:b.c*T, z:a.r*T});
  if (a.r !== b.r) pts.push({x:b.c*T, z:b.r*T});
  pts.push({x:to.x, z:to.z});
  return pts;
}
let ROUTE = null, routeT = 0;
function routeTarget(){
  if (onFoot) return null;
  if (RIDER) return RIDER.dest.stop;
  if (BUS) return BUS.stops[BUS.next];
  if (WAITING.length) return WAITING[0];
  return null;
}
function updateRoute(dt){
  routeT -= dt; if (routeT > 0) return; routeT = 0.5;
  const t = routeTarget(); ROUTE = t ? computeRoute(me(), t) : null;
  if (ROUTE) { let L = 0; for (let i = 1; i < ROUTE.length; i++) L += Math.abs(ROUTE[i].x-ROUTE[i-1].x) + Math.abs(ROUTE[i].z-ROUTE[i-1].z); ROUTE.len = L; }
}

// =================== Phone notifications ===================
const PHONE = {tab:'ride', note:'', noteT:0, open: true};
function phoneNote(msg){ PHONE.note = msg; PHONE.noteT = 6; }

// =================== Radio: made-up stations, generated music, DJ in local language ===================
const RADIO_SYS = {on:false, st:0, timer:null, nextT:0, step:0, song:null, songEnd:0, djUntil:0, gain:null};
function radioStations(){
  const c = W ? W.city : CITIES[6];
  if (!RADIO_SYS._list || RADIO_SYS._city !== c.id) { RADIO_SYS._list = stationsFor(c); RADIO_SYS._city = c.id; }
  return RADIO_SYS._list;
}
function radioEnsureGain(){ if (!AU.ctx) initAudio(); if (!AU.ctx) return false; if (!RADIO_SYS.gain) { RADIO_SYS.gain = AU.ctx.createGain(); RADIO_SYS.gain.gain.value = 0.5; RADIO_SYS.gain.connect(AU.master); } return true; }
function radioSet(i){
  if (!radioEnsureGain()) return;
  RADIO_SYS.song = null;
  if (i < 0) { RADIO_SYS.on = false; stopRadio(); }
  else { RADIO_SYS.on = true; RADIO_SYS.st = i; RADIO_SYS.curName = radioStations()[i].name; startRadio(); djTalk(true); }
  updateRadioChip();
}
// called when you arrive in a new city: keep the station if it reaches here
function radioCityChanged(){
  if (!RADIO_SYS.on) { RADIO_SYS._list = null; return; }
  const was = RADIO_SYS.curName; RADIO_SYS._list = null;
  const list = radioStations(); const i = list.findIndex(s => s.name === was);
  if (i >= 0) { RADIO_SYS.st = i; updateRadioChip(); return; }
  const loc = list.findIndex(s => s.local);
  toast('📻 ' + was + ' is out of range here. Tuned to ' + list[loc].name, 'info');
  radioSet(loc);
}
function openRadioPicker(){
  const list = radioStations();
  let html = '<h2>📻 Radio · ' + escapeHtml(W.city.en) + '</h2><p class="small">Statewide stations play everywhere in ' + STATE_NAME[W.city.st].en + '. Regional ones cover a group of districts. Every city has its own local station. All stations and music are made up.</p><div class="vlist">';
  list.forEach((st,i) => {
    const on = RADIO_SYS.on && RADIO_SYS.st === i;
    html += '<div class="vrow"><div class="sw" style="background:' + (st.scope==='Local'?'#19c3b8':st.scope==='Regional'?'#f5a623':'#7d3c98') + ';border-color:#222"></div><div class="vinfo"><b>' + st.freq + ' · ' + escapeHtml(st.name) + '</b><span>' + escapeHtml(st.nt) + ' · ' + st.scope + ' · ' + ({melody:'Melodies',backwater:'Easy listening',dance:'Dance hits',oldies:'Old classics',beats:'Folk beats'}[st.feel]) + '</span></div>' + (on ? '<span class="tag">Playing</span>' : '<button class="btn small" data-st="' + i + '">Tune in</button>') + '</div>';
  });
  html += '</div>';
  showModal(html, [{t: RADIO_SYS.on ? 'Turn radio off' : 'Close', f: () => { if (RADIO_SYS.on) radioSet(-1); closeModal(); }, ghost: true}, {t:'Done', f: closeModal}]);
  $('modalBody').querySelectorAll('[data-st]').forEach(b => b.onclick = () => { radioSet(+b.dataset.st); openRadioPicker(); });
}
function radioToggle(){
  const n = radioStations().length;
  if (!RADIO_SYS.on) radioSet(0);
  else if (RADIO_SYS.st < n - 1) radioSet(RADIO_SYS.st + 1);
  else radioSet(-1);
  if (RADIO_SYS.on) { const st = radioStations()[RADIO_SYS.st]; toast('📻 ' + st.freq + ' ' + st.name + ' · ' + st.scope, 'info'); }
}
function stopRadio(){ if (RADIO_SYS.timer) clearInterval(RADIO_SYS.timer); RADIO_SYS.timer = null; try { speechSynthesis.cancel(); } catch(e) {} }
function startRadio(){
  stopRadio();
  RADIO_SYS.nextT = AU.ctx.currentTime + 0.1; RADIO_SYS.step = 0;
  RADIO_SYS.timer = setInterval(radioTick, 30);
}
function newSong(){
  const st = radioStations()[RADIO_SYS.st];
  const seed = Math.floor(Math.random()*1e9);
  let s = seed; const r = () => { s = (s*16807) % 2147483647; return (s-1)/2147483646; };
  const words = SONG_WORDS[W.city.st];
  const w1 = words[Math.floor(r()*words.length)], w2 = words[Math.floor(r()*words.length)];
  const len = 16;
  const mel = []; let deg = 2;
  for (let i = 0; i < len; i++) { deg = clamp(deg + Math.floor(r()*5) - 2, 0, st.scale.length*2-1); mel.push(r() < 0.18 ? -1 : deg); }
  const mel2 = mel.map((d,i) => (i % 4 === 3 && r() < 0.5) ? clamp(d + (r()<0.5?1:-1), 0, st.scale.length*2-1) : d);
  RADIO_SYS.song = {st, mel, mel2, bpm: st.bpm + Math.round((r()-0.5)*12), title: w1[0] + ' ' + w2[0], titleNt: w1[1] + ' ' + w2[1], inst: ['flute','pluck','reed'][Math.floor(r()*3)], start: AU.ctx.currentTime};
  RADIO_SYS.songEnd = AU.ctx.currentTime + 70 + r()*30;
  updateRadioChip();
}
function noteFreq(st, deg){ const sc = st.scale; const oct = Math.floor(deg / sc.length); return st.root * Math.pow(2, (sc[deg % sc.length] + 12*oct)/12); }
function rTone(t, f, dur, type, vol, opts){
  const C = AU.ctx, o = C.createOscillator(), g = C.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (opts && opts.drop) o.frequency.exponentialRampToValueAtTime(Math.max(30, f*opts.drop), t + dur);
  if (opts && opts.vib) { const l = C.createOscillator(), lg = C.createGain(); l.frequency.value = 5.5; lg.gain.value = f*0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+0.05); }
  const att = (opts && opts.att) || 0.01;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (opts && opts.lp) { const fl = C.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = opts.lp; o.connect(fl); node = fl; }
  node.connect(g); g.connect(RADIO_SYS.gain); o.start(t); o.stop(t + dur + 0.05);
}
function rNoise(t, dur, vol, freq){ const C = AU.ctx, s = C.createBufferSource(); s.buffer = AU.noise; const f = C.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; const g = C.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t+dur); s.connect(f); f.connect(g); g.connect(RADIO_SYS.gain); s.start(t, Math.random()); s.stop(t+dur+0.02); }
function radioTick(){
  if (!RADIO_SYS.on || !AU.ctx) return;
  const C = AU.ctx;
  const active = playing && !paused && !INTERIOR;
  RADIO_SYS.gain.gain.setTargetAtTime(active ? (C.currentTime < RADIO_SYS.djUntil ? 0.12 : 0.45) : 0, C.currentTime, 0.2);
  if (!RADIO_SYS.song || C.currentTime > RADIO_SYS.songEnd) { if (RADIO_SYS.song) djTalk(false); newSong(); }
  const sg = RADIO_SYS.song, st = sg.st, spb = 60 / sg.bpm / 2; // eighth notes
  while (RADIO_SYS.nextT < C.currentTime + 0.15) {
    const t = RADIO_SYS.nextT, i = RADIO_SYS.step;
    const bar = Math.floor(i / 16), k = i % 16;
    if (active) {
      // drone / bass
      if (k % 8 === 0) rTone(t, st.root/2, spb*7.5, 'sawtooth', 0.05, {lp: 500, att: 0.08});
      if (k % 4 === 0) rTone(t, (k % 8 === 0 ? st.root : st.root*1.5)/2, spb*1.6, 'triangle', 0.16, {});
      // percussion by feel
      if (st.feel === 'dance') { if (k % 4 === 0) rTone(t, 120, 0.18, 'sine', 0.5, {drop: 0.35}); if (k % 8 === 4) rNoise(t, 0.12, 0.25, 1800); if (k % 2 === 1) rNoise(t, 0.04, 0.08, 6000); }
      else if (st.feel === 'melody') { if ([0,3,6,10,12].includes(k)) rTone(t, 180, 0.22, 'sine', 0.3, {drop: 0.5}); if ([4,12].includes(k)) rNoise(t, 0.08, 0.12, 3000); }
      else if (st.feel === 'beats') { if ([0,3,6,8,11,14].includes(k)) rTone(t, 150, 0.16, 'sine', 0.45, {drop: 0.4}); if (k % 2 === 0) rNoise(t, 0.05, 0.14, 2500); if ([4,12].includes(k)) rNoise(t, 0.14, 0.3, 900); }
      else if (st.feel === 'oldies') { if ([0,8].includes(k)) rTone(t, 130, 0.35, 'sine', 0.22, {drop: 0.7}); if ([4,12].includes(k)) rNoise(t, 0.06, 0.05, 4000); }
      else { if ([0,6,8,14].includes(k)) rTone(t, 140, 0.3, 'sine', 0.28, {drop: 0.6}); if (k % 4 === 2) rNoise(t, 0.05, 0.06, 5000); }
      // melody (alternate phrases)
      const m = (bar % 2 ? sg.mel2 : sg.mel)[k];
      if (m >= 0 && (k % 2 === 0 || st.feel === 'dance')) {
        const f = noteFreq(st, m) * 2;
        if (sg.inst === 'flute') rTone(t, f, spb*1.8, 'sine', 0.13, {vib: true, att: 0.05});
        else if (sg.inst === 'pluck') rTone(t, f, spb*1.4, 'triangle', 0.16, {att: 0.005});
        else rTone(t, f, spb*1.7, 'sawtooth', 0.05, {vib: true, lp: 1800, att: 0.04});
      }
    }
    RADIO_SYS.nextT += spb; RADIO_SYS.step++;
  }
}
function djTalk(intro){
  if (!RADIO_SYS.on || !W) return;
  const dj = DJ[W.city.st], st = radioStations()[RADIO_SYS.st];
  let pair;
  if (rainLevel() > 0.3 && Math.random() < 0.5) pair = dj.rain;
  else if (festToday && Math.random() < 0.4) pair = dj.fest;
  else pair = intro ? dj.lines[0] : pick(dj.lines.slice(1));
  const fill = s => s.replace('{city}', W.city.en === W.city.nt ? W.city.en : (dj.lang === 'en' ? W.city.en : W.city.nt)).replace('{station}', st.nt).replace('{time}', fmtTime(S.min)).replace('{fest}', festToday ? festToday.info.nt : '').replace('{song}', RADIO_SYS.song ? RADIO_SYS.song.titleNt : '');
  const fillR = s => s.replace('{city}', W.city.en).replace('{station}', st.name).replace('{time}', fmtTime(S.min)).replace('{fest}', festToday ? festToday.info.en : '').replace('{song}', RADIO_SYS.song ? RADIO_SYS.song.title : '');
  const text = fill(pair[0]), roman = fillR(pair[1]);
  RADIO_SYS.djUntil = AU.ctx.currentTime + 6;
  RADIO_SYS.djText = (hasVoice(dj.lang) ? text : roman);
  if (playing && !paused) sayAloud(text, dj.lang, roman, {force: true, rate: 1.0, pitch: 1.0});
  updateRadioChip();
}
function updateRadioChip(){
  const el = $('radioChip'); if (!el) return;
  if (!RADIO_SYS.on) { el.innerHTML = '📻 <span>Radio off</span>'; el.classList.remove('on'); return; }
  const st = radioStations()[RADIO_SYS.st];
  el.classList.add('on');
  el.innerHTML = '<i></i><b>' + st.freq + '</b> <span>' + escapeHtml(st.name) + (st.scope !== 'Statewide' ? ' (' + st.scope + ')' : '') + (RADIO_SYS.song ? ' · ♪ ' + escapeHtml(RADIO_SYS.song.title) : '') + '</span>';
}
