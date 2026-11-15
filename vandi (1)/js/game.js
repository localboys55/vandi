// Vandi — main game: accounts, saving, driving, jobs, police, traffic, festivals, UI
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const lerp = (a,b,t) => a+(b-a)*t;
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const money = n => (n<0?'-₹':'₹') + Math.abs(Math.round(n)).toLocaleString('en-IN');
const fwd = h => ({x:Math.sin(h), z:Math.cos(h)});
const vehDef = id => VEHICLES.find(v => v.id === id) || VEHICLES[0];
const cityById = id => CITIES.find(c => c.id === id) || CITIES[6];
function fmtTime(m){ m = Math.floor(m)%1440; let h = Math.floor(m/60), mm = m%60; const ap = h>=12?'PM':'AM'; let h12 = h%12; if (!h12) h12 = 12; return h12+':'+String(mm).padStart(2,'0')+' '+ap; }
function haversine(a,b){ const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180; const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(s)); }

const DIST_SCALE = 4;       // metered distance multiplier (towns are compact)
const SPEED_LIMIT = 50;     // km/h in town
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

// ============ Accounts & saving (on this device) ============
const ACC_KEY = 'vandi.accounts.v1', SAVE_PREFIX = 'vandi.save.v1.';
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } },
  del(k){ try { localStorage.removeItem(k); } catch(e){} },
};
function pinHash(pin, name){ return (hashStr('vandi:'+name.toLowerCase()+':'+pin)).toString(36); }
function accounts(){ return store.get(ACC_KEY) || {list:[]}; }
function defaultSave(name){
  return {v:1, name, money:500, owned:['auto1'], active:'auto1', damage:0, city:'ekm', pos:null, day:1, min:7*60,
    stats:{trips:0, busPax:0, earned:0, fines:0, busts:0, escapes:0, km:0, cities:['ekm']},
    settings:{gfx: IS_TOUCH ? 'low' : 'high', sound:true, cam:'chase', reactions:true, reactLang:'auto', voices:true}, updatedAt:Date.now(),
    docs: defaultDocs(1), fatigue: 0, reviews: [], rating: {sum: 0, n: 0}, today: {day: 1, earned: 0, fines: 0, trips: 0, night: 0},
    plate: null, nextCheck: 0};
}
let S = null, ACC = null; // current save + account id
let saveTimer = 0, lastSaveOk = 0;
function persist(){
  if (!S || !ACC) return;
  if (P && W) S.pos = {x:+P.x.toFixed(1), z:+P.z.toFixed(1), h:+P.h.toFixed(2)};
  S.updatedAt = Date.now();
  const ok = store.set(SAVE_PREFIX+ACC, S);
  lastSaveOk = ok ? Date.now() : -1;
  const el = $('saveTxt'); if (el) el.textContent = ok ? 'Saved ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Could not save';
}
function mergeSave(d){ const base = defaultSave(d.name||'Driver'); const out = Object.assign(base, d); out.stats = Object.assign(base.stats, d.stats||{}); out.settings = Object.assign(defaultSave('x').settings, d.settings||{}); if (!out.owned || !out.owned.length) out.owned=['auto1']; if (!out.owned.includes(out.active)) out.active = out.owned[0];
  out.docs = Object.assign(defaultDocs(out.day||1), d.docs||{}); out.rating = out.rating || {sum:0,n:0}; out.reviews = out.reviews || []; out.today = out.today || {day: out.day, earned:0, fines:0, trips:0, night:0};
  if (!out.plate) { const c = cityById(out.city); const code = c.st === 'KL' ? 'KL ' + (KL_RTO[c.id]||'07') : 'TN ' + String(10 + (hashStr(c.id) % 89)); out.plate = code + ' ' + String.fromCharCode(65+Math.floor(Math.random()*26)) + String.fromCharCode(65+Math.floor(Math.random()*26)) + ' ' + (1000 + Math.floor(Math.random()*9000)); }
  return out; }
function earn(n, isNight){ S.money += n; S.stats.earned += n; if (S.today.day !== S.day) S.today = {day:S.day, earned:0, fines:0, trips:0, night:0}; S.today.earned += n; if (isNight) S.today.night += n; }

// ============ Three.js setup ============
let renderer, scene, camera, hemi, sun, headLight, rainLines, skyColor = new THREE.Color();
let W = null; // current town
let P = null; // player
let NPCS = [], PEDS = [], ANIMALS = [], POLICE = [], DEBRIS = [], WAITING = [], PROC = null, CROWDS = [];
let RIDER = null, BUS = null;
let simT = 0, playing = false, paused = false;
let wanted = 0, lostTimer = 0, bustTimer = 0, crimeCD = {};
let festToday = null, rainToday = null;
let arrow, destBeam, nextBeamColor;
let onFoot = false, FOOT = null, INTERIOR = null;
function me(){ return onFoot ? FOOT : P; }

function initThree(){
  renderer = new THREE.WebGLRenderer({canvas:$('c'), antialias: !IS_TOUCH, powerPreference:'high-performance'});
  applyGfx();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.3, 1600);
  hemi = new THREE.HemisphereLight(0xdfefff, 0x5a6b3a, 0.65); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1d6, 0.85); sun.position.set(200,300,120); scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0x9fd3f0, 160, 700);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 700; sun.shadow.bias = -0.0008;
  // gradient sky dome
  const skyMat = new THREE.ShaderMaterial({uniforms:{top:{value:new THREE.Color(0x5aa8e6)}, bot:{value:new THREE.Color(0xdcefff)}}, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(bot, top, pow(h,0.7)),1.0); }'});
  window.SKY = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 12), skyMat); SKY.renderOrder = -1; scene.add(SKY);
  headLight = new THREE.SpotLight(0xfff3c4, 0, 70, 0.6, 0.5, 1.2); scene.add(headLight); scene.add(headLight.target);
  // rain
  const n = 1400, pos = new Float32Array(n*6);
  for (let i = 0; i < n; i++) { const x = rnd(-40,40), y = rnd(0,30), z = rnd(-40,40); pos.set([x,y,z,x,y-0.7,z], i*6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos,3));
  rainLines = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({color:0xaec4d4, transparent:true, opacity:0.5}));
  rainLines.visible = false; rainLines.frustumCulled = false; scene.add(rainLines);
  // guidance arrow + destination beam
  arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45,1.4,8).rotateX(Math.PI/2), new THREE.MeshBasicMaterial({color:0xff9f1c}));
  scene.add(arrow); arrow.visible = false;
  destBeam = makeBeam(0x19c3b8); destBeam.visible = false; scene.add(destBeam);
  addEventListener('resize', onResize); onResize();
}
function applyGfx(){
  const hi = S && S.settings.gfx === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio, hi ? 2 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !!hi; if (sun) sun.castShadow = !!hi;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
function enableShadows(){
  if (!W || !S || S.settings.gfx !== 'high') return;
  W.group.traverse(o => { if (o.isInstancedMesh || o.isMesh) { o.castShadow = o.geometry.type !== 'PlaneGeometry'; o.receiveShadow = true; } });
}
function onResize(){ if (!renderer) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
const BEAM_GEO = new THREE.CylinderGeometry(1.5,1.5,26,16,1,true).translate(0,13,0);
function makeBeam(color){ return new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.28, depthWrite:false, side:THREE.DoubleSide})); }

// ============ Load a town ============
function disposeTown(){
  if (!W) return;
  scene.remove(W.group);
  W.group.traverse(o => { if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.dispose(); if (o.isInstancedMesh) o.geometry.dispose(); });
  [...NPCS, ...POLICE].forEach(n => scene.remove(n.mesh));
  PEDS.forEach(p => scene.remove(p.mesh)); ANIMALS.forEach(a => scene.remove(a.mesh));
  DEBRIS.forEach(d => scene.remove(d.m)); WAITING.forEach(w => { scene.remove(w.mesh); scene.remove(w.beam); });
  CROWDS.forEach(c => c.meshes.forEach(m => scene.remove(m)));
  if (PROC) PROC.members.forEach(m => scene.remove(m.mesh));
  if (INTERIOR) { scene.remove(INTERIOR.group); INTERIOR = null; }
  if (FOOT) { scene.remove(FOOT.mesh); FOOT = null; } onFoot = false;
  clearSpeech(); clearCheckpoint();
  NPCS = []; PEDS = []; ANIMALS = []; POLICE = []; DEBRIS = []; WAITING = []; CROWDS = []; PROC = null; RIDER = null; BUS = null;
  wanted = 0; lostTimer = 0;
}
function loadCity(id, keepPos){
  disposeTown();
  const city = cityById(id);
  S.city = city.id;
  if (!S.stats.cities.includes(city.id)) S.stats.cities.push(city.id);
  W = buildTown(city, scene, {aniso: renderer.capabilities.getMaxAnisotropy()});
  const sp = (keepPos && S.pos) ? S.pos : W.spawn;
  spawnPlayer(S.active, sp.x, sp.z, sp.h);
  if (W.collide(P.x, P.z, 1.2).hit) { P.x = W.spawn.x; P.z = W.spawn.z; P.h = W.spawn.h; }
  spawnTraffic(); spawnPeds(); spawnAnimals();
  enableShadows();
  setupDay(); BANNER.t = 8;
  radioCityChanged();
  setupJob();
  toast('📍 ' + city.en + ' · ' + city.dist + ' · ' + STATE_NAME[city.st].en, 'info');
}
function setupDay(){
  const c = W.city;
  const h = hashStr(c.id + ':' + S.day);
  const r = h % 9;
  const kinds = ['temple','temple','church','mosque'];
  festToday = null;
  W.festDecor.clear();
  if (r < 4) {
    const kind = kinds[r];
    const poi = W.poiBy(kind)[0];
    if (poi) { festToday = {kind, poi, info: FESTIVALS[kind][c.st]}; decorateFestival(W, poi, festToday.info); }
  }
  rainToday = null;
  if (PROC) { PROC.members.forEach(m => scene.remove(m.mesh)); PROC = null; }
}

// ============ Player ============
function spawnPlayer(id, x, z, h){
  if (P && P.mesh) scene.remove(P.mesh);
  const def = vehDef(id);
  const kind = def.cat === 'auto' ? 'auto' : def.cat === 'bus' ? 'bus' : def.cat === 'taxi' ? 'taxi' : 'car';
  const mesh = makeVehicle(kind, def, def.colors);
  if (W && S && S.plate) attachRearPanel(mesh, W.city, S.plate);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(mesh);
  const nCirc = def.len > 6 ? 5 : def.len > 3.5 ? 3 : 2;
  const offs = []; for (let i = 0; i < nCirc; i++) offs.push(lerp(-def.len/2 + def.wid/2, def.len/2 - def.wid/2, nCirc===1?0.5:i/(nCirc-1)));
  P = {def, mesh, x, z, h: h||0, v:0, vx:0, vz:0, steer:0, offs, r: def.wid/2 + 0.05, tile:null, bumpCD:0, stopT:0};
  // passenger dummy in back seat of autos
  if (kind === 'auto') { const pp = makePerson(); pp.scale.setScalar(0.8); pp.position.set(0,0.75,-0.75); pp.visible = false; mesh.add(pp); P.paxMesh = pp; }
  if (S.damage > 0) { const sides = ['front','rear']; const n = Math.floor(S.damage/25); for (let i = 0; i < n; i++) breakParts(mesh, sides[i%2], 1, scene, DEBRIS, {x:0,z:0}); }
}
function switchVehicle(id){
  if (!S.owned.includes(id)) return;
  if (INTERIOR) leaveBuilding();
  let x = P.x, z = P.z, h = P.h;
  if (onFoot) { x = FOOT.x; z = FOOT.z; h = FOOT.h; scene.remove(FOOT.mesh); FOOT = null; onFoot = false; }
  S.active = id; S.damage = 0;
  clearJob();
  spawnPlayer(id, x, z, h);
  // bigger vehicles may not fit where you were: move to the nearest road centre
  if (P.offs.some(o => { const f = fwd(h); return W.collide(x + f.x*o, z + f.z*o, P.r).hit; })) {
    const tx = Math.round(x/T), tz = Math.round(z/T);
    const r = W.rows.reduce((a,b) => Math.abs(b-tz) < Math.abs(a-tz) ? b : a), c = W.cols.reduce((a,b) => Math.abs(b-tx) < Math.abs(a-tx) ? b : a);
    if (Math.abs(r-tz)*T + Math.abs(x - tx*T) < Math.abs(c-tx)*T + Math.abs(z - tz*T)) { P.z = r*T - 2.3; P.x = x; P.h = Math.PI/2; } else { P.x = c*T + 2.3; P.z = z; P.h = 0; }
  }
  setupJob();
  persist();
  toast('Now driving: ' + vehDef(id).name, 'info');
}

// ============ Traffic ============
const NPC_TYPES = [
  {k:'car', def:{len:4.2,wid:1.75,id:'npc'}, w:6}, {k:'auto', def:{len:2.7,wid:1.45,id:'npc'}, w:5},
  {k:'bus', def:{len:10.5,wid:2.5,id:'npc'}, w:2}, {k:'bike', def:{len:1.9,wid:0.6,id:'npc'}, w:4}, {k:'taxi', def:{len:4.2,wid:1.75,id:'npc'}, w:2},
];
const NPC_COLORS = [[0xd0d3d4,0x222222],[0x7b241c,0x222],[0x1a5276,0x111],[0xf4f4f0,0x333],[0x145a32,0x111],[0x6e2c00,0x222],[0x34495e,0x111]];
function spawnTraffic(){
  const count = (W.city.big ? 26 : 18) * (S.settings.gfx === 'high' ? 1 : 0.75);
  const combos = [];
  W.roadLines.forEach((ln,i) => { combos.push([i,1]); combos.push([i,-1]); });
  combos.sort(() => Math.random()-0.5);
  const total = NPC_TYPES.reduce((a,t)=>a+t.w,0);
  for (let i = 0; i < Math.min(count, combos.length); i++) {
    let r = Math.random()*total, tp = NPC_TYPES[0];
    for (const t of NPC_TYPES) { if ((r -= t.w) < 0) { tp = t; break; } }
    const cols = tp.k === 'auto' ? [[0xf2c21b,0x1d1d1d],[0x2f8f3a,0xf2c21b]][i%2] : tp.k === 'bus' ? [[0xc0392b,0xf4efe0],[0x1f8f6f,0xf4efe0],[0x2c3e8f,0xf2c21b],[0xd35400,0xf4efe0]][i%4] : tp.k === 'taxi' ? [0xf2d21b,0x222222] : pick(NPC_COLORS);
    const mesh = makeVehicle(tp.k, tp.def, cols); scene.add(mesh);
    const [li, dir] = combos[i]; const line = W.roadLines[li];
    const n = {mesh, line, dir, s: rnd(line.min, line.max), v:0, cruise: (tp.k==='bus'?9:tp.k==='bike'?12:11) + rnd(-1.5,1.5), len: tp.def.len, wid: tp.def.wid, kind: tp.k, x:0, z:0, h:0, blocked:0};
    placeNpc(n, 0);
    // avoid spawning on top of the player
    if (Math.hypot(n.x-P.x, n.z-P.z) < 25) n.s = (n.s + 120) % (line.max || 1);
    NPCS.push(n);
  }
}
function lightState(tx, tz, axis){
  const sg = W.signals.find(s => s.tx===tx && s.tz===tz); const grp = sg ? sg.grp : 0;
  const t = (simT + grp*15) % 30;
  if (axis === 'NS') return t < 12 ? 'G' : t < 15 ? 'Y' : 'R';
  return t < 15 ? 'R' : t < 27 ? 'G' : 'Y';
}
function placeNpc(n){
  const L = n.line, lane = 2.3;
  if (L.axis === 'x') { n.x = n.s; n.z = L.fixed - lane*n.dir; n.h = n.dir > 0 ? Math.PI/2 : -Math.PI/2; }
  else { n.x = L.fixed + lane*n.dir; n.z = n.s; n.h = n.dir > 0 ? 0 : Math.PI; }
  n.mesh.position.set(n.x, 0, n.z); n.mesh.rotation.y = n.h;
}
function obstacleAhead(x, z, h, range, lat, self){
  const f = fwd(h); let best = range;
  const test = (ox, oz, rad) => { const dx = ox-x, dz = oz-z; const al = dx*f.x + dz*f.z; if (al <= 0 || al > best) return; const lt = Math.abs(dx*f.z - dz*f.x); if (lt < lat + rad) best = al; };
  test(P.x, P.z, P.def.wid/2);
  if (onFoot && !INTERIOR) test(FOOT.x, FOOT.z, 0.5);
  for (const o of NPCS) if (o !== self) test(o.x, o.z, o.wid/2);
  for (const a of ANIMALS) if (a.type === 'cow') test(a.x, a.z, 0.6);
  for (const pd of PEDS) if (pd.crossing) test(pd.x, pd.z, 0.4);
  if (PROC) for (const m of PROC.members) test(m.x, m.z, 1.2);
  return best;
}
function updateTraffic(dt){
  for (const n of NPCS) {
    let target = n.cruise;
    const L = n.line;
    // traffic lights
    const sigList = L.axis === 'x' ? W.signals.filter(s => s.tz === L.idx).map(s => s.tx) : W.signals.filter(s => s.tx === L.idx).map(s => s.tz);
    for (const k of sigList) {
      const stop = k*T - n.dir*(HALF+2.5); const ahead = (stop - n.s)*n.dir;
      if (ahead > -0.5 && ahead < 14) {
        const st = L.axis === 'x' ? lightState(k, L.idx, 'EW') : lightState(L.idx, k, 'NS');
        if (st === 'R' || (st === 'Y' && ahead > 4)) target = Math.min(target, Math.max(0, ahead - 0.5) * 0.9);
      }
    }
    const obs = obstacleAhead(n.x, n.z, n.h, n.len/2 + 14, n.wid/2 + 0.3, n);
    if (obs < n.len/2 + 14) target = Math.min(target, Math.max(0, (obs - n.len/2 - 3.5)) * 0.9);
    n.v += clamp(target - n.v, -9*dt, 3*dt);
    if (n.v < 0.3 && target < 0.3) n.blocked += dt; else n.blocked = 0;
    if (n.blocked > 3.5 && Math.random() < dt*0.5 && Math.hypot(n.x-P.x,n.z-P.z) < 40) { honk(0.25); n.blocked = 0; if (Math.hypot(n.x-P.x,n.z-P.z) < 18) speak(n, 'angry', vehH(n)); }
    n.s += n.v*dt*n.dir;
    if (n.s > L.max + 10 || n.s < L.min - 10) { n.s = n.dir > 0 ? L.min - 5 : L.max + 5; }
    placeNpc(n);
    n.mesh.userData.wheels.forEach(w => w.rotation.x += n.v*dt*3);
  }
}

// ============ Pedestrians & animals ============
function spawnPeds(){
  const count = (W.city.big ? 34 : 24) * (S.settings.gfx === 'high' ? 1 : 0.7);
  for (let i = 0; i < count; i++) {
    const s = pick(W.straight);
    const side = Math.random() < 0.5 ? -1 : 1;
    const mesh = makePerson(); scene.add(mesh);
    const pd = {mesh, s, h:s.h, side, along: rnd(-6,6), dir: Math.random()<0.5?-1:1, speed: rnd(0.9,1.5), crossing:false, down:0, x:0, z:0};
    placePed(pd); PEDS.push(pd);
  }
}
function placePed(pd){
  const off = pd.crossing ? pd.crossT : pd.side*5.7;
  if (pd.h) { pd.x = pd.s.tx*T + pd.along; pd.z = pd.s.tz*T + off; }
  else { pd.x = pd.s.tx*T + off; pd.z = pd.s.tz*T + pd.along; }
  pd.mesh.position.set(pd.x, 0, pd.z);
}
function updatePeds(dt){
  for (const pd of PEDS) {
    if (pd.down > 0) { pd.down -= dt; if (pd.down <= 0) { pd.mesh.rotation.set(0, pd.mesh.rotation.y, 0); pd.mesh.position.y = 0; } continue; }
    if (pd.crossing) {
      pd.crossT += pd.crossDir * 1.4 * dt;
      if (Math.abs(pd.crossT) >= 5.7) { pd.crossing = false; pd.side = Math.sign(pd.crossT); }
      const yaw = pd.h ? (pd.crossDir > 0 ? 0 : Math.PI) : (pd.crossDir > 0 ? Math.PI/2 : -Math.PI/2);
      pd.mesh.rotation.y = yaw;
    } else {
      pd.along += pd.dir * pd.speed * dt;
      if (Math.abs(pd.along) > 6.5) pd.dir *= -1;
      if (Math.random() < dt*0.04 && Math.hypot(pd.x-P.x, pd.z-P.z) > 15) { pd.crossing = true; pd.crossT = pd.side*5.7; pd.crossDir = -pd.side; }
      pd.mesh.rotation.y = pd.h ? (pd.dir > 0 ? Math.PI/2 : -Math.PI/2) : (pd.dir > 0 ? 0 : Math.PI);
    }
    const sw = Math.sin(simT*8 + pd.speed*10)*0.5;
    pd.mesh.userData.arms[0].rotation.x = sw; pd.mesh.userData.arms[1].rotation.x = -sw;
    placePed(pd);
  }
}
function spawnAnimals(){
  const n = W.city.big ? 5 : 7;
  for (let i = 0; i < n*2; i++) {
    const type = i < n ? 'cow' : 'dog';
    const s = pick(W.straight);
    const mesh = type === 'cow' ? makeCow() : makeDog(); scene.add(mesh);
    const a = {type, mesh, x: s.tx*T + rnd(-4,4), z: s.tz*T + rnd(-4,4), h: rnd(0,6.28), v:0, t:rnd(0,5), knock:0};
    ANIMALS.push(a);
  }
}
function updateAnimals(dt){
  for (const a of ANIMALS) {
    a.t -= dt;
    if (a.knock > 0) { a.knock -= dt; }
    if (a.t <= 0) { a.t = rnd(2,7); a.v = a.type === 'cow' ? (Math.random()<0.5?0:0.6) : (Math.random()<0.3?0:rnd(1.5,3.5)); a.h += rnd(-1.5,1.5); }
    const f = fwd(a.h);
    let nx = a.x + f.x*a.v*dt, nz = a.z + f.z*a.v*dt;
    const r = W.collide(nx, nz, 0.8);
    if (r.hit || W.surfaceAt(nx,nz) === GRASS) { a.h += Math.PI*0.7; a.t = rnd(1,3); } else { a.x = r.x; a.z = r.z; }
    a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = a.h;
  }
}

// ============ Police ============
function addWanted(n, why){
  const now = simT;
  if (crimeCD[why] && now - crimeCD[why] < 6) return;
  crimeCD[why] = now;
  const before = wanted;
  wanted = clamp(wanted + n, 0, 5);
  lostTimer = 0;
  toast('🚨 ' + why + (wanted > before ? '  ·  Wanted ' + '★'.repeat(wanted) : ''), 'bad');
  if (before === 0 || POLICE.length === 0) spawnPoliceBehind();
  if (RIDER) RIDER.comfort -= 30;
  S.stats.fines += 0;
  ensurePolice();
}
function spawnPoliceBehind(){
  if (INTERIOR) return;
  const M = me(), f = fwd(M.h);
  let x = M.x - f.x*26, z = M.z - f.z*26;
  if (W.collide(x, z, 1.2).hit || W.surfaceAt(x,z) !== ROAD) {
    const line = W.roadAt(M.x, M.z, M.h);
    if (line) { if (line.axis === 'x') { x = M.x - Math.sign(f.x||1)*26; z = line.fixed; } else { x = line.fixed; z = M.z - Math.sign(f.z||1)*26; } }
  }
  const mesh = makeVehicle('police', {len:4.4,wid:1.8,id:'police'}, null); scene.add(mesh);
  POLICE.push({mesh, x, z, h:Math.atan2(M.x-x, M.z-z), v:Math.max(8, Math.abs(M.v||0)), len:4.4, wid:1.8, stuck:0, rev:0});
  setTimeout(() => { const c = POLICE[POLICE.length-1]; if (c) speak(c, 'police', 2.6); }, 300);
}
function ensurePolice(){
  const want = Math.min(4, wanted);
  while (POLICE.length < want) {
    // spawn on a road point 90-170m away
    let best = null;
    for (let tries = 0; tries < 40; tries++) {
      const s = pick(W.straight); const x = s.tx*T, z = s.tz*T; const d = Math.hypot(x-P.x, z-P.z);
      if (d > 80 && d < 180) { best = {x,z}; break; }
      if (!best || Math.abs(d-120) < Math.abs(Math.hypot(best.x-P.x,best.z-P.z)-120)) best = {x,z};
    }
    const mesh = makeVehicle('police', {len:4.4,wid:1.8,id:'police'}, null); scene.add(mesh);
    POLICE.push({mesh, x:best.x, z:best.z, h:Math.atan2(P.x-best.x, P.z-best.z), v:0, len:4.4, wid:1.8, stuck:0, rev:0});
  }
}
function updatePolice(dt){
  if (!POLICE.length) { bustTimer = 0; return; }
  const vmax = (95 + wanted*15)/3.6;
  let nearest = 1e9;
  const M = me();
  for (const c of POLICE) {
    const d = INTERIOR ? 999 : Math.hypot(M.x-c.x, M.z-c.z); nearest = Math.min(nearest, d);
    if (wanted === 0) { // leave
      c.v = Math.max(0, c.v - 5*dt); continue;
    }
    // target: predicted position of player
    const tx = M.x + (M.vx||0)*0.6, tz = M.z + (M.vz||0)*0.6;
    const want = Math.atan2(tx - c.x, tz - c.z);
    let dh = ((want - c.h + Math.PI*3) % (Math.PI*2)) - Math.PI;
    if (c.rev > 0) { c.rev -= dt; c.v = Math.max(c.v - 12*dt, -5); c.h -= dh*1.2*dt; }
    else {
      c.h += clamp(dh, -2.4*dt, 2.4*dt);
      const tv = d < 10 ? Math.max(0, (M.v||0)*0.9) : vmax * (Math.abs(dh) > 1.2 ? 0.45 : 1);
      c.v += clamp(tv - c.v, -10*dt, 6*dt);
    }
    const f = fwd(c.h);
    const r = W.collide(c.x + f.x*c.v*dt, c.z + f.z*c.v*dt, 1.1);
    if (r.hit) { c.v *= 0.6; c.stuck += dt; } else c.stuck = Math.max(0, c.stuck - dt);
    c.x = r.x; c.z = r.z;
    if (c.stuck > 1.2) { c.rev = 1.0; c.stuck = 0; }
    if (d > 260) { // teleport closer, out of sight
      const s = pick(W.straight); const x = s.tx*T, z = s.tz*T; if (Math.hypot(x-M.x,z-M.z) > 70 && Math.hypot(x-M.x,z-M.z) < 150) { c.x = x; c.z = z; }
    }
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h;
    const blink = Math.floor(simT*6)%2;
    c.mesh.userData.siren[0].material.color.setHex(blink ? 0xff2020 : 0x330000);
    c.mesh.userData.siren[1].material.color.setHex(blink ? 0x110033 : 0x2050ff);
    c.mesh.userData.wheels.forEach(w => w.rotation.x += c.v*dt*3);
    if (d < 35 && Math.random() < dt*0.4) speak(c, 'police', 2.6);
    if (Math.random() < dt*0.15) { const by = PEDS.find(pd => pd.down <= 0 && Math.hypot(pd.x-M.x, pd.z-M.z) < 30); if (by) speak(by, 'chase'); }
    // collide with player
    if (!onFoot) vehicleVsPlayer(c, true); else if (!INTERIOR) pushFromVehicle(FOOT, c, 0.4);
  }
  if (wanted > 0) {
    if (INTERIOR) { /* police wait outside */ } else if (nearest > 95) { lostTimer += dt; if (lostTimer > 9) { wanted--; lostTimer = 0; toast(wanted ? 'Losing them… Wanted ' + '★'.repeat(wanted) : '✅ You escaped the police!', wanted ? 'info' : 'good'); if (!wanted) { S.stats.escapes++; persist(); } } }
    else lostTimer = Math.max(0, lostTimer - dt*0.5);
    if (!INTERIOR && nearest < 8 && Math.abs(M.v||0) < 2.5) { bustTimer += dt; if (bustTimer > 2.5) busted(); } else bustTimer = Math.max(0, bustTimer - dt);
  } else {
    // police drive off then vanish
    for (let i = POLICE.length-1; i >= 0; i--) { const c = POLICE[i]; if (Math.hypot(M.x-c.x, M.z-c.z) > 60 || c.v < 0.2) { scene.remove(c.mesh); POLICE.splice(i,1); } }
  }
}
function busted(){
  const fine = 500 * Math.max(1, wanted);
  S.money -= fine; S.stats.fines += fine; S.stats.busts++; S.today.fines += fine;
  wanted = 0; bustTimer = 0;
  POLICE.forEach(c => scene.remove(c.mesh)); POLICE = [];
  if (RIDER) { toast(RIDER.name + ' got out.', 'info'); endRide(false); }
  P.v = 0; P.vx = P.vz = 0; if (onFoot) FOOT.v = 0;
  showModal('<h2>🚔 Busted!</h2><p>The police caught you. You paid a fine of <b>' + money(fine) + '</b>.</p><p class="small">Tip: faster cars from the showroom make escapes easier.</p>', [{t:'Back on the road', f:closeModal}]);
  persist();
}

// ============ Collisions between vehicles ============
function vehicleVsPlayer(o, isPolice){
  const f = fwd(o.h);
  const pf = fwd(P.h);
  for (const off of P.offs) {
    const cx = P.x + pf.x*off, cz = P.z + pf.z*off;
    const dx = cx - o.x, dz = cz - o.z;
    const al = dx*f.x + dz*f.z, lt = dx*f.z*-1 + dz*f.x; // lt: along right vector (-fz, fx)
    const hl = o.len/2 + P.r, hw = o.wid/2 + P.r;
    if (Math.abs(al) < hl && Math.abs(lt) < hw) {
      const pa = hl - Math.abs(al), pw = hw - Math.abs(lt);
      let px, pz;
      if (pw < pa) { const s = Math.sign(lt)||1; px = -f.z*s*pw; pz = f.x*s*pw; }
      else { const s = Math.sign(al)||1; px = f.x*s*pa; pz = f.z*s*pa; }
      P.x += px; P.z += pz;
      const rel = Math.abs(P.v - (o.v||0)*(pf.x*f.x+pf.z*f.z));
      if (P.bumpCD <= 0 && rel > 3) {
        P.bumpCD = 0.8;
        crashFx(rel);
        // player damage: front if the other vehicle is ahead of the player
        const toO = {x:o.x-P.x, z:o.z-P.z};
        const pSide = (toO.x*pf.x + toO.z*pf.z) > 0 ? 'front' : 'rear';
        const oSide = al > 0 ? 'front' : 'rear';
        const nParts = rel > 15 ? 3 : rel > 8 ? 2 : 1;
        breakParts(P.mesh, pSide, nParts, scene, DEBRIS, {x:-px*2, z:-pz*2});
        breakParts(o.mesh, oSide, nParts, scene, DEBRIS, {x:px*2, z:pz*2});
        S.damage = clamp(S.damage + rel*2, 0, 100);
        if (RIDER) RIDER.comfort -= 20;
        if (!isPolice) speak(o, rel > 6 ? 'crash' : 'angry', vehH(o));
        if (isPolice) addWanted(1, 'Rammed a police car');
        else if (rel > 6) { const cost = Math.round(rel*8); S.money -= cost; toast('Crash! Other driver wants ' + money(cost) + ' for repairs', 'bad'); }
      }
      P.v *= 0.35; P.vx *= 0.35; P.vz *= 0.35;
      if (o.v !== undefined) o.v *= 0.3;
    }
  }
}
function pushFromVehicle(F, o, r){
  const len = o.len || (o.def && o.def.len) || 4, wid = o.wid || (o.def && o.def.wid) || 1.8;
  const f = fwd(o.h); const dx = F.x - o.x, dz = F.z - o.z;
  const al = dx*f.x + dz*f.z, lt = -dx*f.z + dz*f.x;
  const hl = len/2 + r, hw = wid/2 + r;
  if (Math.abs(al) < hl && Math.abs(lt) < hw) {
    const pa = hl - Math.abs(al), pw = hw - Math.abs(lt);
    if (pw < pa) { const sg = Math.sign(lt)||1; F.x += -f.z*sg*pw; F.z += f.x*sg*pw; } else { const sg = Math.sign(al)||1; F.x += f.x*sg*pa; F.z += f.z*sg*pa; }
    return true;
  }
  return false;
}
function ownerShout(a, kind){ const by = PEDS.filter(pd => pd.down <= 0).sort((p,q) => Math.hypot(p.x-a.x,p.z-a.z) - Math.hypot(q.x-a.x,q.z-a.z))[0]; if (by && Math.hypot(by.x-a.x, by.z-a.z) < 45) { by._saidT = 0; speak(by, kind); } else { a._saidT = 0; speak(a, kind, 2.2); } }
function crashFx(sp){ playNoise(0.25, 0.5 + Math.min(0.5, sp/30), 300); }

// ============ Jobs: auto/taxi fares, bus routes ============
function clearJob(){
  WAITING.forEach(w => { scene.remove(w.mesh); scene.remove(w.beam); }); WAITING = [];
  CROWDS.forEach(c => c.meshes.forEach(m => scene.remove(m))); CROWDS = [];
  RIDER = null; BUS = null; destBeam.visible = false;
  if (P && P.paxMesh) P.paxMesh.visible = false;
}
function setupJob(){
  clearJob();
  const cat = P.def.cat;
  if (cat === 'bus') {
    const bs = W.poiBy('busstand')[0];
    const stops = [];
    if (bs) stops.push({x:bs.stop.x, z:bs.stop.z, name: W.city.en + ' Bus Stand'});
    W.busStops.forEach(b => stops.push({x:b.x, z:b.z, name: W.city.en + ' ' + b.name}));
    BUS = {stops, next: 0, onboard: 0, hold: 0, loops: 0};
    stops.forEach((s, i) => { const c = {i, count: Math.floor(rnd(2,8)), meshes:[]}; CROWDS.push(c); refreshCrowd(c); });
  }
}
function refreshCrowd(c){
  c.meshes.forEach(m => scene.remove(m)); c.meshes = [];
  const s = BUS.stops[c.i];
  for (let k = 0; k < Math.min(c.count, 8); k++) {
    const m = makePerson(); const a = k*0.8;
    m.position.set(s.x + Math.cos(a)*1.2 + (k%3)*0.6, 0, s.z + Math.sin(a)*1.2); m.rotation.y = rnd(0,6);
    scene.add(m); c.meshes.push(m);
  }
}
function spawnWaiting(){
  const isTaxi = P.def.cat === 'taxi';
  let want = 1;
  if (RIDER) return;
  while (WAITING.length < want) {
    let spot = null;
    for (let t = 0; t < 30; t++) {
      const s = pick(W.straight); const side = Math.random()<0.5?-1:1;
      const x = s.tx*T + (s.h ? rnd(-4,4) : side*5.6), z = s.tz*T + (s.h ? side*5.6 : rnd(-4,4));
      if (Math.hypot(x-P.x, z-P.z) < 45) continue;
      if (WAITING.some(w => Math.hypot(w.x-x, w.z-z) < 40)) continue;
      spot = {x,z}; break;
    }
    if (!spot) break;
    const mesh = makePerson(); mesh.position.set(spot.x,0,spot.z); scene.add(mesh);
    const beam = makeBeam(0xff9f1c); beam.position.set(spot.x,0,spot.z); scene.add(beam);
    const dests = W.pois.filter(p => Math.hypot(p.stop.x-spot.x, p.stop.z-spot.z) > 120);
    const dest = pick(dests.length ? dests : W.pois);
    WAITING.push({x:spot.x, z:spot.z, mesh, beam, dest, name: pick(PASSENGER_NAMES[W.city.st]), hurry: Math.random() < 0.3, born: simT,
      rating: +(3.6 + Math.random()*1.4).toFixed(1), pay: Math.random() < 0.55 ? 'UPI' : 'Cash'});
    phoneNote('New ride request: ' + WAITING[WAITING.length-1].name); tone(1046,0.12,'sine',0.12); tone(1318,0.18,'sine',0.12,0.12);
  }
}
function updateJobs(dt){
  const cat = P.def.cat, spd = Math.abs(P.v);
  $('prompt').textContent = '';
  if (cat === 'auto' || cat === 'taxi') {
    spawnWaiting();
    for (let i = WAITING.length-1; i >= 0; i--) {
      const w = WAITING[i];
      w.mesh.lookAt(P.x, 0, P.z);
      w.mesh.userData.arms[1].rotation.x = -2.6 + Math.sin(simT*6)*0.4; // waving
      w.beam.material.opacity = 0.2 + Math.sin(simT*3)*0.08;
      const d = Math.hypot(P.x-w.x, P.z-w.z);
      if (!RIDER && d < 7) {
        if (spd < 2.8) { // board
          RIDER = {name:w.name, dest:w.dest, hurry:w.hurry, start:simT, metered:0, comfort:100, rating:w.rating, pay:w.pay, startMin:S.min,
            expected: (Math.abs(w.dest.stop.x-w.x)+Math.abs(w.dest.stop.z-w.z))*1.15/8 + 12};
          scene.remove(w.mesh); scene.remove(w.beam); WAITING.splice(i,1);
          const line = w.hurry ? LINES.hurry[W.city.st] : pick(LINES.pick[W.city.st]);
          bubble(w.name, line[1].replace('{d}', w.dest.nt), line[0].replace('{d}', w.dest.en));
          destBeam.position.set(w.dest.stop.x, 0, w.dest.stop.z); destBeam.visible = true;
          if (P.paxMesh) P.paxMesh.visible = true;
          ding(1);
        } else $('prompt').textContent = 'Slow down to pick up ' + w.name;
      } else if (simT - w.born > 260 && d > 150) { scene.remove(w.mesh); scene.remove(w.beam); WAITING.splice(i,1); phoneNote(w.name + ' cancelled the ride'); }
    }
    if (RIDER) {
      RIDER.metered += Math.max(0, P.v)*dt;
      const d = Math.hypot(P.x-RIDER.dest.stop.x, P.z-RIDER.dest.stop.z);
      destBeam.material.opacity = 0.22 + Math.sin(simT*3)*0.08;
      if (d < 8) { if (spd < 2.8) endRide(true); else $('prompt').textContent = 'Slow down to drop ' + RIDER.name; }
    }
  } else if (cat === 'bus' && BUS) {
    const s = BUS.stops[BUS.next];
    destBeam.position.set(s.x, 0, s.z); destBeam.visible = true; destBeam.material.color.setHex(0x3c8dff);
    const d = Math.hypot(P.x-s.x, P.z-s.z);
    if (d < 10) {
      if (spd < 1.2) {
        BUS.hold += dt; $('prompt').textContent = 'Passengers boarding…';
        if (BUS.hold > 2) {
          const c = CROWDS[BUS.next];
          const off = Math.min(BUS.onboard, Math.floor(BUS.onboard*rnd(0.3,0.7)));
          BUS.onboard -= off;
          const on = Math.min(c.count, P.def.seats - BUS.onboard);
          BUS.onboard += on; c.count -= on;
          let earn_ = 0;
          earn(earn_ = Math.round(on * P.def.ticket * (isNight() ? 1.5 : 1)), isNight()); S.stats.busPax += on;
          refreshCrowd(c);
          toast((on ? on + ' boarded (+' + money(earn_) + ')' : 'Nobody waiting') + (off ? ' · ' + off + ' got off' : ''), on ? 'good' : 'info');
          if (on) ding(1);
          BUS.hold = 0;
          BUS.next = (BUS.next + 1) % BUS.stops.length;
          if (BUS.next === 0) { BUS.loops++; const bonus = 100; earn(bonus, false); toast('Route complete! Bonus ' + money(bonus), 'good'); }
          persist();
        }
      } else $('prompt').textContent = 'Stop at the bus stop';
    } else BUS.hold = 0;
    // crowds regrow
    if (Math.random() < dt*0.15) { const c = pick(CROWDS); if (c.count < 12 && c.i !== BUS.next) { c.count++; refreshCrowd(c); } }
  } else destBeam.visible = false;
}
function endRide(ok){
  if (!RIDER) return;
  if (ok) {
    const d = P.def, km = RIDER.metered * DIST_SCALE / 1000;
    const minKm = d.cat === 'taxi' ? 2 : 1.5;
    let fare = Math.round(Math.max(d.base, d.base + (km - minKm)*d.perKm));
    if (isRaining()) fare += 10;
    const night = isNight();
    if (night) fare = Math.round(fare * 1.5);
    const ratio = (simT - RIDER.start) / RIDER.expected;
    const comfort = clamp(RIDER.comfort, 0, 100)/100;
    let tip = Math.round(comfort * (ratio < 1 ? 25 : ratio < 1.4 ? 12 : 0) * (d.cat === 'taxi' ? 2 : 1));
    if (RIDER.hurry && ratio < 0.9) tip += 40;
    const total = fare + tip;
    earn(total, night); S.stats.trips++; S.today.trips++;
    const good = comfort > 0.6 && ratio < 1.4;
    const stars = clamp(Math.round(5 - (1-comfort)*3 - Math.max(0, ratio-1)*2), 1, 5);
    const band = stars >= 4 ? 'good' : stars === 3 ? 'ok' : 'bad';
    const ri = Math.floor(Math.random()*REVIEWS[band].en.length);
    S.reviews.unshift({name:RIDER.name, stars, en:REVIEWS[band].en[ri], nt:REVIEWS[band][W.city.st][ri], city:W.city.en, day:S.day, fare:total});
    if (S.reviews.length > 50) S.reviews.length = 50;
    S.rating.sum += stars; S.rating.n++;
    phoneNote(RIDER.name + ' rated you ' + '★'.repeat(stars));
    const line = pick((good ? LINES.good : LINES.bad)[W.city.st]);
    bubble(RIDER.name, line[1], line[0]);
    toast('Fare ' + money(fare) + (night ? ' (night +50%)' : '') + (tip ? ' + tip ' + money(tip) : '') + '  ·  ' + km.toFixed(1) + ' km', 'good');
    ding(2);
  }
  RIDER = null; destBeam.visible = false; if (P.paxMesh) P.paxMesh.visible = false;
  persist();
}

// ============ Festival processions ============
function updateProcession(dt){
  const active = festToday && S.min >= 960 && S.min < 1230;
  if (!active) { if (PROC) { PROC.members.forEach(m => scene.remove(m.mesh)); PROC = null; } return; }
  if (!PROC) {
    const p = festToday.poi;
    const roadX = (p.tx + p.d[0])*T, roadZ = (p.tz + p.d[1])*T;
    const route = makeRoute(W, roadX, roadZ, 6, mulberry(hashStr(W.city.id+S.day)));
    const lens = [0]; for (let i = 1; i < route.length; i++) lens.push(lens[i-1] + Math.hypot(route[i].x-route[i-1].x, route[i].z-route[i-1].z));
    const members = [];
    const kind = festToday.kind;
    const nEle = kind === 'temple' ? 5 : 3;
    let gap = 0;
    // drummers lead, then elephants, then people with umbrellas / flags
    for (let i = 0; i < 6; i++) { const m = makePerson(0xf4f1e6, 0xf4f1e6); const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.6,10), mat(0x8e5a2b)); drum.rotation.z = Math.PI/2; drum.position.set(0,1.05,0.35); m.add(drum); members.push({mesh:m, off: gap + (i%3)*1.4, lat:(Math.floor(i/3)-0.5)*1.6, kind:'drum'}); if (i%3===2) gap += 1.8; }
    gap += 6;
    for (let i = 0; i < nEle; i++) { const m = makeElephant(true); members.push({mesh:m, off: gap, lat:0, kind:'ele'}); gap += 7.5; }
    for (let i = 0; i < 8; i++) {
      const m = makePerson(kind === 'mosque' ? 0xf4f1e6 : pick(SHIRTS), 0xf4f1e6);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,2.2,4), mat(0x8e6e4e)); pole.position.set(0.32,1.9,0); m.add(pole);
      const top = kind === 'temple' ? new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,0.08,12), mat(pick([0xe74c3c,0xf1c40f,0x8e44ad])))
                 : new THREE.Mesh(boxGeo(0.02,0.5,0.7), mat(kind === 'mosque' ? 0x1e8449 : pick([0xf1c40f,0xffffff,0x2c5aa0])));
      top.position.set(0.32, 3.0, kind === 'temple' ? 0 : 0.35); m.add(top);
      members.push({mesh:m, off: gap + (i%2)*0.2, lat:(i%2?1:-1)*1.2, kind:'walk'}); if (i%2) gap += 2.2;
    }
    members.forEach(m => scene.add(m.mesh));
    PROC = {route, lens, total: lens[lens.length-1], s: 0, members, beat:0};
    toast('🐘 ' + festToday.info.en + ' procession is on the road!', 'info');
  }
  PROC.s += 1.1*dt;
  if (PROC.s - 70 > PROC.total) PROC.s = 0;
  for (const m of PROC.members) {
    const s = clamp(PROC.s - m.off, 0, PROC.total);
    let i = 1; while (i < PROC.lens.length-1 && PROC.lens[i] < s) i++;
    const a = PROC.route[i-1], b = PROC.route[i];
    const segL = (PROC.lens[i] - PROC.lens[i-1]) || 1, t = (s - PROC.lens[i-1]) / segL;
    const h = Math.atan2(b.x-a.x, b.z-a.z);
    const x = lerp(a.x,b.x,t) + Math.cos(h)*m.lat, z = lerp(a.z,b.z,t) - Math.sin(h)*m.lat;
    m.x = x; m.z = z;
    m.mesh.position.set(x, m.kind === 'ele' ? Math.abs(Math.sin(simT*2+m.off))*0.06 : Math.abs(Math.sin(simT*5+m.off))*0.05, z);
    m.mesh.rotation.y = h;
    m.visible = PROC.s - m.off > 0;
    m.mesh.visible = m.visible;
  }
  // drums when near
  const dist = Math.hypot(PROC.members[0].x - P.x, PROC.members[0].z - P.z);
  PROC.beat -= dt;
  if (PROC.beat <= 0 && dist < 90) { PROC.beat = [0.22,0.22,0.44][Math.floor(simT*4)%3]; drum(clamp(1 - dist/90, 0, 1)); }
}

// ============ Player update ============
const K = {}; const TOUCH = {}; let GP = {gas:0, brake:0, steer:0};
function isNight(){ const m = S.min % 1440; return m >= 1320 || m < 240; }
function isRaining(){ return rainLevel() > 0.15; }
function stepPlayer(dt){
  const d = P.def;
  const gas = Math.max(K['w']||K['arrowup']||TOUCH.gas ? 1 : 0, GP.gas);
  const brake = Math.max(K['s']||K['arrowdown']||K[' ']||TOUCH.brake ? 1 : 0, GP.brake);
  let steer = ((K['a']||K['arrowleft']||TOUCH.left) ? 1 : 0) - ((K['d']||K['arrowright']||TOUCH.right) ? 1 : 0);
  if (Math.abs(GP.steer) > 0.15) steer = -GP.steer;
  let maxV = d.speed/3.6 * (S.damage > 60 ? 0.85 : 1);
  const surf = W.surfaceAt(P.x, P.z);
  if (surf === GRASS) maxV = Math.min(maxV, 8);
  if (gas) P.v += d.accel * gas * (1 - Math.max(0,P.v)/maxV*0.55) * dt;
  if (brake) { if (P.v > 0.5) P.v -= (d.cat === 'bus' ? 7 : 10) * brake * dt; else P.v = Math.max(P.v - 3*brake*dt, -4); }
  if (!gas && !brake) { P.v -= Math.sign(P.v) * Math.min(Math.abs(P.v), (0.6 + Math.abs(P.v)*0.08) * dt); }
  if (P.v > maxV) P.v -= (P.v - maxV) * 2 * dt;
  P.steer += clamp(steer - P.steer, -4*dt, 4*dt);
  const sp = Math.abs(P.v);
  const yaw = P.steer * d.turn * clamp(sp/4, 0, 1) / (1 + sp/(d.cat === 'car' ? 28 : 16)) * Math.sign(P.v||1);
  P.h += yaw * dt;
  const f = fwd(P.h);
  const grip = d.grip * (isRaining() ? 0.55 : 1);
  P.vx += (f.x*P.v - P.vx) * Math.min(1, grip*dt);
  P.vz += (f.z*P.v - P.vz) * Math.min(1, grip*dt);
  P.x += P.vx*dt; P.z += P.vz*dt;
  // building collisions (circles along the vehicle)
  let hit = false;
  for (const off of P.offs) {
    const cx = P.x + f.x*off, cz = P.z + f.z*off;
    const r = W.collide(cx, cz, P.r);
    if (r.hit) { hit = true; P.x += r.x - cx; P.z += r.z - cz; }
  }
  if (hit) {
    if (P.bumpCD <= 0 && sp > 5) {
      P.bumpCD = 0.8; crashFx(sp);
      const n = sp > 18 ? 3 : sp > 11 ? 2 : 1;
      breakParts(P.mesh, P.v > 0 ? 'front' : 'rear', n, scene, DEBRIS, {x:-P.vx*0.2, z:-P.vz*0.2});
      S.damage = clamp(S.damage + sp*1.5, 0, 100);
      if (RIDER) RIDER.comfort -= 15;
    }
    P.v *= 0.4; P.vx *= 0.4; P.vz *= 0.4;
  }
  P.bumpCD -= dt;
  // vehicles
  for (const n of NPCS) if (Math.abs(n.x-P.x) < 14 && Math.abs(n.z-P.z) < 14) vehicleVsPlayer(n, false);
  // pedestrians
  for (const pd of PEDS) {
    if (pd.down > 0) continue;
    for (const off of P.offs) {
      const cx = P.x + f.x*off, cz = P.z + f.z*off;
      if (Math.hypot(cx-pd.x, cz-pd.z) < P.r + 0.35) {
        if (sp > 3) {
          pd.down = 6; pd.crossing = false; pd.mesh.rotation.x = -Math.PI/2; pd.mesh.position.y = 0.25;
          addWanted(2, 'Knocked down a pedestrian');
          speak(pd, 'angry', 2.2);
          const by = PEDS.find(o => o !== pd && o.down <= 0 && Math.hypot(o.x-pd.x, o.z-pd.z) < 18); if (by) speak(by, 'angry');
          playNoise(0.15, 0.3, 500);
        } else { P.v *= 0.2; speak(pd, 'excuse'); }
        break;
      }
    }
    if (sp > 7 && pd.down <= 0 && Math.hypot(P.x-pd.x, P.z-pd.z) < P.def.len/2 + 2.2) speak(pd, 'angry');
  }
  // animals
  for (const a of ANIMALS) {
    const rr = a.type === 'cow' ? 1.1 : 0.5;
    for (const off of P.offs) {
      const cx = P.x + f.x*off, cz = P.z + f.z*off, dd = Math.hypot(cx-a.x, cz-a.z);
      if (dd < P.r + rr) {
        if (a.type === 'cow') {
          const nx = (cx-a.x)/(dd||1), nz = (cz-a.z)/(dd||1);
          P.x += nx*(P.r+rr-dd); P.z += nz*(P.r+rr-dd);
          if (sp > 4 && P.bumpCD <= 0) { P.bumpCD = 1; crashFx(sp); breakParts(P.mesh, 'front', 1, scene, DEBRIS, {x:0,z:0}); S.damage = clamp(S.damage+10,0,100); ownerShout(a, 'cow'); if (RIDER) RIDER.comfort -= 20; }
          P.v *= 0.2; P.vx *= 0.2; P.vz *= 0.2;
        } else if (a.knock <= 0) { a.knock = 2; a.h = P.h + rnd(-1,1); a.v = 5; a.t = 1.5; if (sp > 3) ownerShout(a, 'dog'); }
        break;
      }
    }
  }
  // procession
  if (PROC) for (const m of PROC.members) {
    if (!m.visible) continue;
    const rr = m.kind === 'ele' ? 2.2 : 0.5;
    for (const off of P.offs) {
      const cx = P.x + f.x*off, cz = P.z + f.z*off, dd = Math.hypot(cx-m.x, cz-m.z);
      if (dd < P.r + rr) {
        const nx = (cx-m.x)/(dd||1), nz = (cz-m.z)/(dd||1);
        P.x += nx*(P.r+rr-dd); P.z += nz*(P.r+rr-dd);
        if (sp > 2) addWanted(3, 'Drove into the festival procession');
        P.v *= 0.1; P.vx *= 0.1; P.vz *= 0.1;
        break;
      }
    }
  }
  // traffic rules: red lights & speed cameras
  const tx = Math.round(P.x/T), tz = Math.round(P.z/T), key = tx+','+tz;
  if (P.tile && P.tile.key !== key && W.sigSet.has(key) && sp > 2) {
    const axis = P.tile.tx !== tx ? 'EW' : 'NS';
    if (lightState(tx, tz, axis) === 'R') addWanted(1, 'Jumped a red light');
  }
  P.tile = {tx, tz, key};
  const kmh = sp*3.6;
  for (const c of W.cams) {
    if (Math.hypot(c.x-P.x, c.z-P.z) < 13 && kmh > SPEED_LIMIT + 4 && simT - c.last > 8) {
      c.last = simT; flash(); addWanted(1, 'Speed camera: ' + Math.round(kmh) + ' km/h in a ' + SPEED_LIMIT + ' zone');
    }
  }
  S.stats.km += sp*dt/1000*DIST_SCALE;
  // visuals
  P.mesh.position.set(P.x, 0, P.z);
  P.mesh.rotation.y = P.h;
  P.mesh.rotation.z = clamp(-yaw*sp*0.012, -0.12, 0.12);
  P.mesh.userData.wheels.forEach(w => w.rotation.x += P.v*dt*3);
}

// ============ On foot ============
function getOut(){
  if (onFoot || Math.abs(P.v) > 1.5) return;
  const f = fwd(P.h);
  // step out on the left side
  let x = P.x - f.z*(P.def.wid/2+0.8), z = P.z + f.x*(P.def.wid/2+0.8);
  const r = W.collide(x, z, 0.35); x = r.x; z = r.z;
  const mesh = makePerson(0xf5a623, 0x1f3a5f, 0x8a5a3c); scene.add(mesh);
  FOOT = {mesh, x, z, h:P.h, v:0, vx:0, vz:0, runT:0, walkT:0};
  onFoot = true; P.v = 0; P.vx = P.vz = 0;
  if (RIDER) toast(RIDER.name + ' waits in your ' + P.def.name, 'info');
  updateCamera(0, true);
}
function getIn(){
  if (!onFoot || INTERIOR) return;
  scene.remove(FOOT.mesh); FOOT = null; onFoot = false; updateCamera(0, true);
}
function nearOwnVehicle(){ return onFoot && !INTERIOR && Math.hypot(FOOT.x-P.x, FOOT.z-P.z) < P.def.len/2 + 2.5; }
function enterBuilding(poi){
  const fest = festToday && festToday.poi === poi;
  INTERIOR = buildInterior(poi, W.KL, fest);
  scene.add(INTERIOR.group);
  INTERIOR.back = {x:FOOT.x, z:FOOT.z, h:FOOT.h};
  FOOT.x = INTERIOR.spawn.x; FOOT.z = INTERIOR.spawn.z; FOOT.h = INTERIOR.spawn.h; FOOT.v = 0;
  W.group.visible = false;
  updateCamera(0, true);
  toast(INTERIOR.info.title, 'info');
  if (INTERIOR.info.note) bubble(poi.en, poi.nt, INTERIOR.info.note);
}
function leaveBuilding(){
  if (!INTERIOR) return;
  scene.remove(INTERIOR.group);
  INTERIOR.group.traverse(o => { if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.dispose(); });
  FOOT.x = INTERIOR.back.x; FOOT.z = INTERIOR.back.z; FOOT.h = INTERIOR.back.h + Math.PI; FOOT.v = 0;
  INTERIOR = null; W.group.visible = true;
  updateCamera(0, true);
}
function stepFoot(dt){
  const F = FOOT;
  const fw = (K['w']||K['arrowup']||TOUCH.gas||GP.gas > 0.3), bk = (K['s']||K['arrowdown']||TOUCH.brake||GP.brake > 0.3);
  let turn = ((K['a']||K['arrowleft']||TOUCH.left) ? 1 : 0) - ((K['d']||K['arrowright']||TOUCH.right) ? 1 : 0);
  if (Math.abs(GP.steer) > 0.15) turn = -GP.steer;
  F.h += turn * 2.8 * dt;
  F.runT = fw ? F.runT + dt : 0;
  const target = fw ? ((F.runT > 1 || K['shift']) && !INTERIOR ? 5.4 : 2.2) : bk ? -1.4 : 0;
  F.v += clamp(target - F.v, -10*dt, 7*dt);
  const f = fwd(F.h);
  let nx = F.x + f.x*F.v*dt, nz = F.z + f.z*F.v*dt;
  if (INTERIOR) { const r = collideBoxes(nx, nz, 0.35, INTERIOR.boxes); nx = r.x; nz = r.z; }
  else {
    const r = W.collide(nx, nz, 0.35); nx = r.x; nz = r.z;
    F.x = nx; F.z = nz;
    pushFromVehicle(F, P, 0.35);
    for (const n of NPCS) if (Math.abs(n.x-F.x) < 12 && Math.abs(n.z-F.z) < 12) {
      if (pushFromVehicle(F, n, 0.35) && n.v > 4 && F.walkT <= 0) { F.walkT = 1.5; n.v = 0; speak(n, 'angry', vehH(n)); }
    }
    nx = F.x; nz = F.z;
  }
  F.walkT -= dt;
  if (!INTERIOR) for (const pd of PEDS) { if (pd.down > 0) continue; const dd = Math.hypot(nx-pd.x, nz-pd.z); if (dd < 0.75) { nx = pd.x + (nx-pd.x)/(dd||1)*0.75; nz = pd.z + (nz-pd.z)/(dd||1)*0.75; if (Math.abs(F.v) > 3) speak(pd, 'excuse'); } }
  F.x = nx; F.z = nz; F.vx = f.x*F.v; F.vz = f.z*F.v;
  const sp = Math.abs(F.v), sw = Math.sin(simT*(sp > 3 ? 13 : 8)) * Math.min(1, sp/2) * 0.7;
  F.mesh.userData.arms[0].rotation.x = sw; F.mesh.userData.arms[1].rotation.x = -sw;
  F.mesh.position.set(F.x, Math.abs(sw)*0.06, F.z); F.mesh.rotation.y = F.h;
  S.stats.km += sp*dt/1000;
}

// ============ Debris ============
function updateDebris(dt){
  for (let i = DEBRIS.length-1; i >= 0; i--) {
    const d = DEBRIS[i];
    d.life -= dt;
    if (d.m.position.y > 0.08 || d.vy > 0) {
      d.vy -= 18*dt; d.m.position.x += d.vx*dt; d.m.position.y += d.vy*dt; d.m.position.z += d.vz*dt;
      d.m.rotation.x += d.ax*dt; d.m.rotation.z += d.az*dt;
      if (d.m.position.y < 0.08) { d.m.position.y = 0.08; d.vy = -d.vy*0.3; d.vx *= 0.5; d.vz *= 0.5; d.ax *= 0.5; d.az *= 0.5; if (Math.abs(d.vy) < 0.8) d.vy = 0; }
    }
    if (d.life <= 0 || DEBRIS.length > 80) { scene.remove(d.m); DEBRIS.splice(i,1); }
  }
}

// ============ Time, weather, lighting ============
const C_NIGHT = new THREE.Color(0x0b1626), C_DUSK = new THREE.Color(0xf08a4b), C_DAY = new THREE.Color(0x9fd3f0), C_RAIN = new THREE.Color(0x7d8b93);
function daylight(m){ m %= 1440; if (m < 330 || m > 1170) return 0; if (m < 420) return (m-330)/90; if (m > 1080) return 1 - (m-1080)/90; return 1; }
function updateEnvironment(dt){
  const dl = daylight(S.min);
  const dusk = clamp(1 - Math.abs((S.min % 1440) - 1110)/70, 0, 1) + clamp(1 - Math.abs((S.min % 1440) - 375)/60, 0, 1)*0.6;
  skyColor.copy(C_NIGHT).lerp(C_DAY, dl).lerp(C_DUSK, dusk*0.55);
  const rl = rainLevel();
  if (rl > 0) skyColor.lerp(C_RAIN, Math.min(0.85, rl*0.9));
  if (WX.flash > 0) skyColor.lerp(new THREE.Color(0xe8eeff), 0.7);
  if (window.SKY) { SKY.position.copy(camera.position); SKY.material.uniforms.bot.value.copy(skyColor).lerp(new THREE.Color(0xffffff), 0.25*dl*(1-rl)); SKY.material.uniforms.top.value.copy(skyColor).multiplyScalar(0.75 + 0.1*dl); }
  scene.background = skyColor; scene.fog.color.copy(skyColor);
  scene.fog.near = lerp(150, 35, rl); scene.fog.far = lerp(S.settings.gfx === 'high' ? 750 : 520, 220, rl);
  hemi.intensity = 0.28 + 0.5*dl + (WX.flash > 0 ? 1.2 : 0); sun.intensity = 0.12 + 0.85*dl*(1 - rl*0.6);
  const Mx = me(); sun.position.set(Mx.x + 200, 300, Mx.z + 120); sun.target.position.set(Mx.x, 0, Mx.z);
  const night = dl < 0.45 || rl > 0.5;
  W.winMats.forEach(m => m.emissiveIntensity = clamp(0.9 - dl*1.2, 0, 0.9));
  W.lampMat.color.setHex(dl < 0.4 ? 0xfff2b0 : 0x555555);
  headLight.intensity = night && !INTERIOR ? 1.6 : 0;
  const f = fwd(P.h);
  headLight.position.set(P.x + f.x*P.def.len/2, (P.mesh.userData.headY||1) + 0.4, P.z + f.z*P.def.len/2);
  headLight.target.position.set(P.x + f.x*30, 0, P.z + f.z*30);
  rainLines.visible = rl > 0.05 && !INTERIOR; rainLines.material.opacity = 0.25 + rl*0.45;
  if (rl > 0.05) {
    rainLines.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
    const a = rainLines.geometry.attributes.position.array;
    const vs = 22 + rl*16;
    for (let i = 0; i < a.length; i += 6) { a[i+1] -= vs*dt; a[i+4] -= vs*dt; a[i+3] = a[i] + (WX.monsoon ? 0.35 : 0); if (a[i+1] < 0) { a[i+1] += 30; a[i+4] += 30; } }
    rainLines.geometry.attributes.position.needsUpdate = true;
  }
  // signals
  const OFF = [0x3a0d0d,0x3a2a0a,0x0d3a18], ON = [0xff2a1a,0xffb000,0x2bff6a];
  [0,1].forEach(g => ['NS','EW'].forEach((ax,k) => { const t = (simT + g*15) % 30; let st; if (ax === 'NS') st = t<12?'G':t<15?'Y':'R'; else st = t<15?'R':t<27?'G':'Y'; const on = st==='R'?0:st==='Y'?1:2; W.sigLamp[g][k].forEach((m,ci) => m.color.setHex(ci===on ? ON[ci] : OFF[ci])); }));
  W.cams.forEach(c => c.led.material.color.setHex(Math.floor(simT*2)%2 ? 0xff0000 : 0x330000));
  setRainSound(rl > 0.05 ? (INTERIOR ? 0.04 : 0.05 + rl*0.15) : 0);
}

// ============ Camera ============
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt, snap){
  if (onFoot) return updateFootCamera(dt, snap);
  const f = fwd(P.h), L = P.def.len;
  const mode = S.settings.cam;
  let tp, tl;
  if (mode === 'cab') { tp = new THREE.Vector3(P.x + f.x*(L*0.18), (P.def.cat==='bus'?2.6:1.55), P.z + f.z*(L*0.18)); tl = new THREE.Vector3(P.x + f.x*20, 1.2, P.z + f.z*20); }
  else if (mode === 'high') { tp = new THREE.Vector3(P.x - f.x*(12+L), 18+L, P.z - f.z*(12+L)); tl = new THREE.Vector3(P.x + f.x*6, 0, P.z + f.z*6); }
  else { tp = new THREE.Vector3(P.x - f.x*(5+L*0.9), 2.8 + L*0.3, P.z - f.z*(5+L*0.9)); tl = new THREE.Vector3(P.x + f.x*4, 1.2, P.z + f.z*4); }
  if (mode !== 'cab') { // keep the camera out of buildings
    const sx = P.x, sz = P.z; let last = 0;
    for (let i = 1; i <= 12; i++) { const t = i/12; const qx = lerp(sx, tp.x, t), qz = lerp(sz, tp.z, t), qy = lerp(1.5, tp.y, t);
      const tt = W.tileAt(Math.round(qx/T), Math.round(qz/T)); const cx = Math.round(qx/T)*T, cz = Math.round(qz/T)*T;
      if (tt === BUILD && qy < 12 && Math.abs(qx-cx) < HALF-1 && Math.abs(qz-cz) < HALF-1) break; last = t; }
    if (last < 1) { tp.set(lerp(sx, tp.x, last*0.9), Math.max(lerp(1.5, tp.y, last), 2.2 + (1-last)*4), lerp(sz, tp.z, last*0.9)); }
  }
  if (snap || mode === 'cab') { camPos.copy(tp); camLook.copy(tl); }
  else { camPos.lerp(tp, 1 - Math.exp(-dt*5)); camLook.lerp(tl, 1 - Math.exp(-dt*8)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  // guide arrow
  let target = null;
  if (RIDER) target = RIDER.dest.stop;
  else if (BUS) target = BUS.stops[BUS.next];
  else if (WAITING.length) target = WAITING.reduce((a,w) => Math.hypot(w.x-P.x,w.z-P.z) < Math.hypot(a.x-P.x,a.z-P.z) ? w : a);
  if (false) {
    arrow.visible = true;
    arrow.position.set(P.x, (P.def.cat==='bus'?4.6:3.2) + Math.sin(simT*3)*0.12, P.z);
    arrow.rotation.y = Math.atan2(target.x-P.x, target.z-P.z);
    arrow.material.color.setHex(RIDER ? 0x19c3b8 : BUS ? 0x3c8dff : 0xff9f1c);
  } else arrow.visible = false;
}

function updateFootCamera(dt, snap){
  const F = FOOT, f = fwd(F.h), mode = S.settings.cam;
  let tp, tl;
  if (mode === 'cab') { tp = new THREE.Vector3(F.x + f.x*0.2, 1.62, F.z + f.z*0.2); tl = new THREE.Vector3(F.x + f.x*10, 1.5, F.z + f.z*10); }
  else if (mode === 'high' && !INTERIOR) { tp = new THREE.Vector3(F.x - f.x*8, 9, F.z - f.z*8); tl = new THREE.Vector3(F.x, 0.8, F.z); }
  else { const back = INTERIOR ? 2.8 : 3.6; tp = new THREE.Vector3(F.x - f.x*back, 2.2, F.z - f.z*back); tl = new THREE.Vector3(F.x + f.x*2, 1.4, F.z + f.z*2); }
  if (INTERIOR) { // keep camera inside the room
    const hw = INTERIOR.w/2 - 0.6, hd = INTERIOR.d/2 - 0.6;
    tp.x = clamp(tp.x, IX-hw, IX+hw); tp.z = clamp(tp.z, IZ-hd, IZ+hd);
  } else if (mode !== 'cab') {
    let last = 0;
    for (let i = 1; i <= 10; i++) { const t = i/10; const qx = lerp(F.x, tp.x, t), qz = lerp(F.z, tp.z, t);
      const tt = W.tileAt(Math.round(qx/T), Math.round(qz/T)), cx = Math.round(qx/T)*T, cz = Math.round(qz/T)*T;
      if (tt === BUILD && Math.abs(qx-cx) < HALF-1 && Math.abs(qz-cz) < HALF-1) break; last = t; }
    if (last < 1) tp.set(lerp(F.x, tp.x, last*0.9), tp.y, lerp(F.z, tp.z, last*0.9));
  }
  if (snap || mode === 'cab') { camPos.copy(tp); camLook.copy(tl); }
  else { camPos.lerp(tp, 1 - Math.exp(-dt*6)); camLook.lerp(tl, 1 - Math.exp(-dt*9)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  F.mesh.visible = mode !== 'cab';
  arrow.visible = false;
}

// ============ Audio ============
const AU = {};
function initAudio(){
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const C = new (window.AudioContext||window.webkitAudioContext)(); AU.ctx = C;
    AU.master = C.createGain(); AU.master.gain.value = S.settings.sound ? 0.8 : 0; AU.master.connect(C.destination);
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 45;
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const am = C.createGain(); am.gain.value = 0.6;
    const lfo = C.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 9; const lg = C.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(am.gain);
    const g = C.createGain(); g.gain.value = 0;
    o.connect(f); f.connect(am); am.connect(g); g.connect(AU.master); o.start(); lfo.start();
    AU.eng = o; AU.engG = g; AU.lfo = lfo; AU.engF = f;
    const buf = C.createBuffer(1, C.sampleRate*2, C.sampleRate); const ch = buf.getChannelData(0); for (let i=0;i<ch.length;i++) ch[i] = Math.random()*2-1;
    AU.noise = buf;
    const rn = C.createBufferSource(); rn.buffer = buf; rn.loop = true; const bp = C.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; const rg = C.createGain(); rg.gain.value = 0; rn.connect(bp); bp.connect(rg); rg.connect(AU.master); rn.start(); AU.rainG = rg;
    // siren
    const so = C.createOscillator(); so.type = 'triangle'; so.frequency.value = 700; const sg = C.createGain(); sg.gain.value = 0; so.connect(sg); sg.connect(AU.master); so.start(); AU.siren = so; AU.sirenG = sg;
  } catch(e) { AU.ctx = null; }
}
function setSound(on){ if (AU.master) AU.master.gain.value = on ? 0.8 : 0; }
function updateAudio(){
  if (!AU.ctx) return;
  const sp = Math.abs(P.v), cat = P.def.cat;
  const base = cat === 'auto' ? 42 : cat === 'bus' ? 32 : 55;
  AU.eng.frequency.setTargetAtTime(base + sp*(cat==='car'?2.2:4), AU.ctx.currentTime, 0.1);
  AU.lfo.frequency.setTargetAtTime(cat === 'auto' ? 8 + sp*1.4 : 25 + sp*2, AU.ctx.currentTime, 0.1);
  AU.engG.gain.setTargetAtTime(playing && !paused && !onFoot ? 0.05 + Math.min(0.05, sp*0.004) : 0, AU.ctx.currentTime, 0.1);
  const near = POLICE.length ? Math.min(...POLICE.map(c => Math.hypot(c.x-P.x,c.z-P.z))) : 999;
  AU.sirenG.gain.setTargetAtTime(wanted && playing && !paused ? clamp(0.06*(1-near/200), 0, 0.06) : 0, AU.ctx.currentTime, 0.1);
  AU.siren.frequency.setTargetAtTime(Math.floor(simT*1.6)%2 ? 950 : 650, AU.ctx.currentTime, 0.05);
}
function setRainSound(v){ if (AU.rainG) AU.rainG.gain.setTargetAtTime(playing && !paused ? v : 0, AU.ctx.currentTime, 0.4); }
function tone(freq, dur, type, vol, delay){ if (!AU.ctx) return; const C = AU.ctx, t = C.currentTime + (delay||0); const o = C.createOscillator(); o.type = type||'sine'; o.frequency.value = freq; const g = C.createGain(); g.gain.setValueAtTime(vol||0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+dur+0.05); }
function honkReact(){ if (!W || onFoot) return; PEDS.forEach(pd => { if (pd.down <= 0 && Math.hypot(pd.x-P.x, pd.z-P.z) < 14 && Math.random() < 0.35) speak(pd, 'horn'); }); }
function honk(vol){ const v = vol ?? 0.18; const cat = P ? P.def.cat : 'auto'; if (cat === 'bus') { tone(220,0.5,'sawtooth',v); tone(277,0.5,'sawtooth',v); } else if (cat === 'auto') { tone(420,0.35,'square',v*0.7); tone(520,0.35,'square',v*0.7); } else { tone(390,0.4,'square',v*0.7); tone(490,0.4,'square',v*0.7); } }
function ding(n){ tone(880,0.25,'sine',0.15); if (n>1) tone(1320,0.35,'sine',0.15,0.12); }
function playNoise(dur, vol, freq){ if (!AU.ctx) return; const C = AU.ctx; const s = C.createBufferSource(); s.buffer = AU.noise; const f = C.createBiquadFilter(); f.type='lowpass'; f.frequency.value = freq||600; const g = C.createGain(); g.gain.setValueAtTime(vol, C.currentTime); g.gain.exponentialRampToValueAtTime(0.001, C.currentTime+dur); s.connect(f); f.connect(g); g.connect(AU.master); s.start(); s.stop(C.currentTime+dur+0.05); }
function drum(v){ if (!AU.ctx || v <= 0.02) return; tone(110, 0.18, 'sine', 0.25*v); playNoise(0.08, 0.15*v, 2500); }

// ============ HUD ============
let hudT = 0, phoneT = 0;
const GOAL = 1000;
function updateHUD(dt){
  hudT -= dt; if (hudT > 0) return; hudT = 0.1;
  const M = me();
  if (S.today.day !== S.day) S.today = {day:S.day, earned:0, fines:0, trips:0, night:0};
  const net = S.today.earned - S.today.fines;
  $('money').textContent = money(net); $('money').classList.toggle('neg', net < 0);
  $('goalTxt').textContent = money(GOAL);
  $('netBar').style.width = clamp(net/GOAL*100, 0, 100) + '%';
  const avg = S.rating.n ? (S.rating.sum/S.rating.n).toFixed(1) : '5.0';
  $('earnSub').textContent = S.today.trips + ' trips · ' + avg + '★ · Wallet ' + money(S.money);
  $('stars').textContent = wanted ? '★'.repeat(wanted) + '☆'.repeat(5-wanted) : '';
  $('stars').classList.toggle('on', wanted > 0);
  $('timeTxt').textContent = fmtTime(S.min); $('dayTxt').textContent = 'Day ' + S.day;
  $('wx').textContent = WX.monsoon && rainLevel() > 0.4 ? '⛈' : isRaining() ? '🌧' : daylight(S.min) < 0.3 ? '🌙' : '☀';
  const cat = P.def.cat;
  $('vehTxt').textContent = (onFoot ? '🚶 On foot · ' : '') + P.def.name + (S.damage > 0 ? ' · Damage ' + Math.round(S.damage) + '%' : '') + (S.fatigue > 10 ? ' · 😴 Tired' : '');
  // road name
  const road = INTERIOR ? null : W.roadAt(M.x, M.z, M.h);
  $('roadEn').textContent = INTERIOR ? INTERIOR.poi.en : road ? road.name[0] : W.city.en;
  $('roadNt').textContent = INTERIOR ? INTERIOR.poi.nt : road ? road.name[1] : W.city.nt;
  // meter
  const nightNow = isNight();
  $('nightTag').classList.toggle('hidden', !nightNow);
  let flag = 'VACANT', fare = '---', km = '0.0', tt = '0:00', sub = '';
  if (onFoot) { flag = INTERIOR ? 'INSIDE' : 'ON FOOT'; sub = INTERIOR ? 'Walk to the door to leave' : 'Hold GO to run · walk back to your ' + P.def.name; }
  else if (cat === 'auto' || cat === 'taxi') {
    if (RIDER) { const k = RIDER.metered*DIST_SCALE/1000; const minKm = cat==='taxi'?2:1.5; let f = Math.round(Math.max(P.def.base, P.def.base + (k-minKm)*P.def.perKm)); if (nightNow) f = Math.round(f*1.5);
      flag = 'HIRED'; fare = String(f); km = k.toFixed(1); const el = Math.floor((S.min - RIDER.startMin + 1440) % 1440); tt = Math.floor(el/60) + ':' + String(el%60).padStart(2,'0'); sub = '→ ' + RIDER.dest.en; }
    else sub = WAITING.length ? 'Ride request: ' + WAITING[0].name + ' · follow the GPS' : 'Looking for passengers…';
  } else if (cat === 'bus') { flag = 'ON ROUTE'; fare = BUS ? String(BUS.onboard) : '0'; km = String(P.def.seats); sub = BUS ? 'Next stop: ' + BUS.stops[BUS.next].name : ''; }
  else { flag = 'PRIVATE'; sub = 'Personal car · no fares'; }
  $('flagTxt').textContent = flag; $('flag').className = 'led ' + (RIDER || cat === 'bus' ? 'hired' : 'vac');
  $('fare').textContent = fare; $('kmTxt').textContent = km; $('tripT').textContent = tt; $('fareSub').textContent = sub;
  $('meter').querySelector('.mgrid small').textContent = cat === 'bus' ? 'ON BOARD' : 'FARE ₹';
  $('meter').querySelectorAll('.mgrid small')[1].textContent = cat === 'bus' ? 'SEATS' : 'KM';
  // festival banner (shown for a few seconds after each city load / day change)
  if (festToday && BANNER.t > 0) { $('banner').classList.remove('hidden'); $('banTag').textContent = 'TODAY · ' + festToday.info.en.toUpperCase(); $('banNt').textContent = festToday.info.nt; $('banEn').textContent = 'Procession around ' + festToday.poi.en + ' from 4 PM. Expect road blocks.'; }
  else $('banner').classList.add('hidden');
  BANNER.t -= 0.1;
  updateAction();
  drawGPS(); drawSpeedo();
  phoneT -= 0.1; if (phoneT <= 0) { phoneT = 0.4; renderPhone(); }
}
const BANNER = {t: 0};
function drawSpeedo(){
  const cv = $('speedoC'), x = cv.getContext('2d'), w = cv.width, c = w/2, r = w*0.43;
  const top = onFoot ? 20 : P.def.speed;
  const scales = [[20,5],[60,10],[80,10],[120,20],[160,20],[240,40],[320,40],[400,50]];
  const [max, step] = scales.find(([m]) => top <= m) || scales[scales.length-1];
  const kmh = Math.abs(me().v)*3.6;
  const a0 = Math.PI*0.75, a1 = Math.PI*2.25, ang = v => a0 + (a1-a0)*clamp(v/max,0,1);
  x.clearRect(0,0,w,w);
  x.fillStyle = 'rgba(14,22,30,.82)'; x.beginPath(); x.arc(c,c,r+16,0,7); x.fill();
  x.strokeStyle = 'rgba(244,208,63,.65)'; x.lineWidth = 3; x.beginPath(); x.arc(c,c,r+15,0,7); x.stroke();
  // limit zone
  x.strokeStyle = 'rgba(229,57,53,.85)'; x.lineWidth = 10; x.beginPath(); x.arc(c,c,r-2,ang(SPEED_LIMIT),a1); x.stroke();
  x.fillStyle = '#f6efd9'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 ' + Math.round(w*0.065) + 'px "Baloo Chettan 2",sans-serif';
  for (let v = 0; v <= max + 0.1; v += step/2) {
    const a = ang(v), major = Math.abs(v/step - Math.round(v/step)) < 0.01;
    x.strokeStyle = major ? '#f6efd9' : 'rgba(246,239,217,.5)'; x.lineWidth = major ? 4 : 2;
    x.beginPath(); x.moveTo(c + Math.cos(a)*(r-(major?18:10)), c + Math.sin(a)*(r-(major?18:10))); x.lineTo(c + Math.cos(a)*r, c + Math.sin(a)*r); x.stroke();
    if (major) x.fillText(Math.round(v), c + Math.cos(a)*(r-40), c + Math.sin(a)*(r-40));
  }
  const a = ang(kmh);
  x.strokeStyle = '#ff8a3d'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(c - Math.cos(a)*16, c - Math.sin(a)*16); x.lineTo(c + Math.cos(a)*(r-14), c + Math.sin(a)*(r-14)); x.stroke();
  x.fillStyle = '#ddd'; x.beginPath(); x.arc(c,c,13,0,7); x.fill();
  x.fillStyle = kmh > SPEED_LIMIT ? '#ff6b5a' : '#fff'; x.font = '800 ' + Math.round(w*0.15) + 'px "Share Tech Mono",monospace'; x.fillText(Math.round(kmh), c, c + r*0.55);
  x.fillStyle = 'rgba(246,239,217,.7)'; x.font = '700 ' + Math.round(w*0.06) + 'px sans-serif'; x.fillText('km/h', c, c + r*0.82);
}
function renderPhone(){
  $('phoneClock').textContent = fmtTime(S.min);
  const note = $('phoneNote'); if (PHONE.noteT > 0) { note.textContent = PHONE.note; note.classList.remove('hidden'); } else note.classList.add('hidden');
  const b = $('phoneBody'), tab = PHONE.tab, cat = P.def.cat;
  let h = '', mini = '';
  if (tab === 'ride') {
    if (onFoot && !RIDER) h = '<p>You\'re on foot. Walk back to your ' + escapeHtml(P.def.name) + ' to take rides.</p>';
    else if (cat === 'car') h = '<p><b>Private car</b></p><p class="small">Ride requests only come in autos and taxis. Buses run routes. Switch vehicles at a showroom or in My vehicles.</p>';
    else if (cat === 'bus' && BUS) { const st = BUS.stops[BUS.next]; h = '<span class="pill trip">BUS ROUTE</span><div class="stat"><b>Next stop: ' + escapeHtml(st.name) + '</b><span>' + (ROUTE ? Math.round(ROUTE.len) + ' m away' : '') + ' · ' + BUS.onboard + '/' + P.def.seats + ' on board</span></div><div class="stat"><b>₹' + P.def.ticket + ' per ticket</b><span>Route bonus ₹100 · ' + BUS.loops + ' loops done</span></div>'; mini = '🚌 ' + st.name; }
    else if (RIDER) {
      const dist = ROUTE ? Math.round(ROUTE.len) : 0;
      h = '<div class="rq"><div class="av">' + RIDER.name[0] + '</div><div><span class="pill trip">ON TRIP</span><div class="nm">' + escapeHtml(RIDER.name) + '</div><div class="meta">' + RIDER.rating + ' ★ · ' + RIDER.pay + (RIDER.hurry ? ' · In a hurry!' : '') + '</div></div><div class="dist"><b>' + dist + '</b><small>m to go</small></div></div>' +
          '<div class="stat"><b>Drop at ' + escapeHtml(RIDER.dest.en) + '</b><span>' + escapeHtml(RIDER.dest.nt) + '</span></div><div class="stat"><span>Follow the teal line on your GPS and stop at the marker.' + (isNight() ? ' Night fare +50% is on.' : '') + '</span></div>';
      mini = '🧍 ' + RIDER.name + ' → ' + RIDER.dest.en + ' · ' + dist + ' m';
    } else if (WAITING.length) {
      const w = WAITING[0], dist = ROUTE ? Math.round(ROUTE.len) : Math.round(Math.hypot(w.x-P.x, w.z-P.z));
      h = '<div class="rq"><div class="av">' + w.name[0] + '</div><div><span class="pill">PICKUP</span><div class="nm">' + escapeHtml(w.name) + '</div><div class="meta">' + w.rating + ' ★ · ' + w.pay + (w.hurry ? ' · In a hurry' : '') + '</div></div><div class="dist"><b>' + dist + '</b><small>m away</small></div></div>' +
          '<div class="stat"><b>Waiting at the roadside</b><span>Follow the orange line on your GPS and stop beside them.</span></div><div class="stat"><span>Going to ' + escapeHtml(w.dest.en) + '</span></div>';
      mini = '🧍 Pickup: ' + w.name + ' · ' + dist + ' m';
    } else { h = '<p>Looking for ride requests…</p>'; mini = '📱 Looking for rides…'; }
  } else if (tab === 'reviews') {
    const avg = S.rating.n ? (S.rating.sum/S.rating.n) : 0;
    h = '<div class="big">' + (S.rating.n ? avg.toFixed(2) : '–') + ' ★</div><p class="small">' + S.rating.n + ' ratings</p>';
    if (!S.reviews.length) h += '<p class="small">Finish rides to get reviews from passengers.</p>';
    S.reviews.slice(0,12).forEach(r => h += '<div class="rv"><b>' + escapeHtml(r.name) + '</b> <span class="st">' + '★'.repeat(r.stars) + '☆'.repeat(5-r.stars) + '</span><p class="n">' + escapeHtml(r.nt) + '</p><p>' + escapeHtml(r.en) + '</p><span class="small">' + escapeHtml(r.city) + ' · Day ' + r.day + ' · ' + money(r.fare) + '</span></div>');
  } else if (tab === 'earn') {
    const t = S.today;
    h = '<div class="big">' + money(t.earned - t.fines) + '</div><p class="small">Today\'s net · Goal ' + money(GOAL) + '</p>' +
      '<div class="stat"><b>' + money(t.earned) + ' earned · ' + money(t.fines) + ' fines</b><span>' + t.trips + ' trips · ' + money(t.night) + ' from night fares</span></div>' +
      '<div class="stat"><b>Wallet ' + money(S.money) + '</b><span>All-time earnings ' + money(S.stats.earned) + '</span></div>' +
      '<div class="stat"><b>Driving ' + Math.floor(S.fatigue||0) + ' h without rest</b><span>' + (S.fatigue > 10 ? 'Take a chai break at a tea shop!' : 'Police check you are fit to drive') + '</span></div>' +
      '<div class="stat"><b>Papers</b><span>Insurance to Day ' + S.docs.insUntil + ' · Permit to Day ' + S.docs.permitUntil + ' · PUC to Day ' + S.docs.pucUntil + '</span></div>';
  } else {
    const M = me(), road = INTERIOR ? null : W.roadAt(M.x, M.z, M.h), st = STATE_NAME[W.city.st];
    h = '<span class="pill">YOU ARE ON</span><div class="big" style="font-size:20px">' + escapeHtml(road ? road.name[0] : (INTERIOR ? INTERIOR.poi.en : 'Side street')) + '</div><p class="n">' + escapeHtml(road ? road.name[1] : '') + '</p>' +
      '<div class="stat"><b>' + escapeHtml(W.city.en) + ' · ' + escapeHtml(W.city.dist) + ' district</b><span>' + escapeHtml(W.city.nt) + ' · ' + st.en + ' · ' + st.nt + '</span></div>' +
      '<div class="stat"><b>' + (WX.monsoon && rainLevel() > 0.4 ? 'Monsoon storm' : isRaining() ? 'Raining' : 'Clear') + ' · ' + fmtTime(S.min) + '</b><span>' + (festToday ? festToday.info.en + ' today' : 'No festival today') + '</span></div>' +
      '<p class="small">Street layouts are made up. Road names are real ones used in this city, or common local names.</p>';
  }
  if (b._h !== h) { b.innerHTML = h; b._h = h; }
  $('phoneMini').textContent = (mini || '📱 Vandi Ride') + '  ▴';
}
function nearPOI(types, dist){ if (!W) return null; let best = null, bd = dist; for (const p of W.pois) { if (!types.includes(p.type)) continue; const M = me(); const d = Math.hypot(p.stop.x-M.x, p.stop.z-M.z); if (d < bd) { bd = d; best = p; } } return best; }
let ACTION = null;
const SHOP_TYPES = ['carshow','autoshow','taxishow','busshow'];
function updateAction(){
  ACTION = null;
  const fb = $('footBtn');
  if (INTERIOR) {
    if (Math.hypot(FOOT.x-INTERIOR.door.x, FOOT.z-INTERIOR.door.z) < 3) ACTION = {label:'Go outside', f:leaveBuilding};
    fb.classList.add('hidden');
  } else if (onFoot) {
    const walk = nearPOI(['temple','church','mosque','museum'], 8), sh = nearPOI(SHOP_TYPES, 9), rto = nearPOI(['rto'], 9), tea = nearPOI(['tea'], 9);
    if (rto) ACTION = {label:'RTO: licences & papers', f:openRTO};
    else if (tea) ACTION = {label:'☕ Chai break (₹15)', f:chaiBreak};
    else if (walk) ACTION = {label:'Go inside the ' + PLACE_TYPES[walk.type].en.replace('Juma ',''), f:() => enterBuilding(walk)};
    else if (sh) ACTION = {label:'Enter ' + PLACE_TYPES[sh.type].en, f:() => openShowroom(PLACE_TYPES[sh.type].shop)};
    fb.textContent = '🚗'; fb.title = 'Get in (F)'; fb.classList.toggle('hidden', !nearOwnVehicle());
  } else {
    if (Math.abs(P.v) < 2.5 && !wanted) {
      const sh = nearPOI(SHOP_TYPES, 11), pt = nearPOI(['petrol'], 12), holy = nearPOI(['temple','church','mosque','museum'], 10), rto = nearPOI(['rto'], 11), tea = nearPOI(['tea'], 10);
      if (sh) ACTION = {label:'Enter ' + PLACE_TYPES[sh.type].en, f:() => openShowroom(PLACE_TYPES[sh.type].shop)};
      else if (rto) ACTION = {label:'RTO: licences & papers', f:openRTO};
      else if (tea) ACTION = {label:'☕ Chai break (₹15)', f:chaiBreak};
      else if (pt) ACTION = {label: S.damage > 0 ? 'Repair (' + money(repairCost()) + ')' : 'Garage', f:() => openGarage(true)};
      else if (holy) ACTION = {label:'Park & walk in', f:() => { getOut(); }};
    }
    fb.textContent = '🚶'; fb.title = 'Get out (F)'; fb.classList.toggle('hidden', Math.abs(P.v) > 1.5);
  }
  const b = $('actBtn');
  if (ACTION) { b.textContent = ACTION.label + (IS_TOUCH ? '' : '  [E]'); b.classList.remove('hidden'); } else b.classList.add('hidden');
}
function toggleFoot(){ if (INTERIOR) return; if (onFoot) { if (nearOwnVehicle()) getIn(); else toast('Walk back to your ' + P.def.name + ' to get in', 'info'); } else getOut(); }
function drawGPS(){
  const cv = $('gps'), x = cv.getContext('2d'), w = cv.width, c = w/2, R = c - 4;
  const M = me();
  x.clearRect(0,0,w,w);
  x.save(); x.beginPath(); x.arc(c,c,R,0,7); x.clip();
  x.fillStyle = '#1b2a22'; x.fillRect(0,0,w,w);
  if (INTERIOR) { x.fillStyle = '#4a235a'; x.fillRect(0,0,w,w); x.fillStyle = '#fff'; x.font = '800 36px sans-serif'; x.textAlign = 'center'; x.fillText('Inside', c, c+12); x.restore(); return; }
  const range = onFoot ? 120 : 240, k = R/range;            // pixels per metre
  const toS = (px, pz) => [c + (px - M.x)*k, c + (pz - M.z)*k];
  const [mx0, my0] = toS(-HALF, -HALF);
  x.globalAlpha = 0.95; x.drawImage(W.miniCanvas, mx0, my0, W.N*T*k, W.N*T*k); x.globalAlpha = 1;
  // route line
  if (ROUTE) {
    const col = RIDER ? '#19c3b8' : BUS ? '#3c8dff' : '#ff9f1c';
    x.lineJoin = 'round'; x.lineCap = 'round';
    [[14,'rgba(0,0,0,.55)'],[8,col]].forEach(([lw,cl]) => { x.strokeStyle = cl; x.lineWidth = lw; x.beginPath(); ROUTE.forEach((p,i) => { const [sx,sy] = toS(p.x,p.z); i ? x.lineTo(sx,sy) : x.moveTo(sx,sy); }); x.stroke(); });
    const end = ROUTE[ROUTE.length-1]; const [ex,ey] = toS(end.x,end.z);
    x.fillStyle = col; x.beginPath(); x.arc(ex,ey,11,0,7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
  }
  // place labels
  x.font = '700 17px "Baloo Chettan 2",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  W.pois.forEach(p => { const [sx,sy] = toS(p.x,p.z); if (Math.hypot(sx-c,sy-c) > R-20) return; const lab = PLACE_TYPES[p.type].en.replace('Juma ','').replace(' & Garage','');
    x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(lab, sx, sy); x.fillStyle = '#fff'; x.fillText(lab, sx, sy); });
  const dot = (px,pz,col,rad) => { let [sx,sy] = toS(px,pz); const d = Math.hypot(sx-c,sy-c); if (d > R-10) { sx = c + (sx-c)/d*(R-10); sy = c + (sy-c)/d*(R-10); } x.fillStyle = col; x.beginPath(); x.arc(sx,sy,rad,0,7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); };
  NPCS.forEach(n => { const [sx,sy] = toS(n.x,n.z); if (Math.hypot(sx-c,sy-c) < R) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(sx-2,sy-2,4,4); } });
  if (PROC) dot(PROC.members[0].x, PROC.members[0].z, '#bf5af2', 8);
  if (CHECK) dot(CHECK.x, CHECK.z, '#1f3a93', 8);
  POLICE.forEach(p => dot(p.x, p.z, Math.floor(simT*4)%2 ? '#ff3b30' : '#0a84ff', 7));
  if (onFoot) dot(P.x, P.z, '#f5a623', 8);
  // player marker (north-up map, marker turns with you)
  x.save(); x.translate(c,c); x.rotate(-M.h + Math.PI);
  x.fillStyle = '#ffd15c'; x.strokeStyle = '#3a2a00'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0,-20); x.lineTo(13,14); x.lineTo(0,7); x.lineTo(-13,14); x.closePath(); x.fill(); x.stroke();
  x.restore();
  x.restore();
  // compass ring
  x.strokeStyle = 'rgba(244,208,63,.85)'; x.lineWidth = 6; x.beginPath(); x.arc(c,c,R-2,0,7); x.stroke();
  x.fillStyle = '#0e161e'; x.font = '800 20px sans-serif';
  [['N',0,-1],['E',1,0],['S',0,1],['W',-1,0]].forEach(([t,dx,dy]) => { const px = c+dx*(R-18), py = c+dy*(R-18); x.fillStyle = 'rgba(14,22,30,.85)'; x.beginPath(); x.arc(px,py,14,0,7); x.fill(); x.fillStyle = t === 'N' ? '#ff6b5a' : '#f6efd9'; x.fillText(t, px, py+1); });
}
function toast(msg, kind){
  const el = document.createElement('div'); el.className = 'toast ' + (kind||'info'); el.textContent = msg;
  $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3700);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
}
let bubbleTO = null;
function bubble(name, native, eng){
  $('bName').textContent = name; $('bText').textContent = native; $('bEng').textContent = eng;
  $('bubble').classList.remove('hidden'); clearTimeout(bubbleTO); bubbleTO = setTimeout(() => $('bubble').classList.add('hidden'), 5000);
}
function flash(){ const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); tone(1800,0.08,'square',0.08); }

// ============ Speech bubbles above heads ============
const SPEECH = [];
const _v3 = new THREE.Vector3();
function reactLang(){
  const l = S.settings.reactLang || 'auto', KLs = W && W.city.st === 'KL';
  if (l === 'auto') return KLs ? 'ml' : 'ta';
  if (l === 'mix') return pick(KLs ? ['ml','mg','en','mg'] : ['ta','tg','en','tg']);
  return l;
}
function speak(target, kind, height){
  if (!S || S.settings.reactions === false || !target) return;
  if (target._saidT && simT - target._saidT < 6) return;
  const M = me(); if (Math.hypot(target.x - M.x, target.z - M.z) > 60) return;
  target._saidT = simT;
  const lang = reactLang(); const arr = REACT[kind][lang]; const idx = Math.floor(Math.random()*arr.length);
  const text = arr[idx];
  const roman = lang === 'ml' ? REACT[kind].mg[idx] : lang === 'ta' ? REACT[kind].tg[idx] : text;
  const dist = Math.hypot(target.x - M.x, target.z - M.z);
  sayAloud(text, lang, roman, {volume: clamp(1 - dist/60, 0.25, 1), force: kind === 'police', pitch: kind === 'police' ? 0.8 : undefined});
  const el = document.createElement('div'); el.className = 'sb ' + kind; el.textContent = (kind === 'angry' || kind === 'crash' ? '💢 ' : kind === 'police' ? '🚨 ' : '') + text;
  $('bubbles').appendChild(el);
  SPEECH.push({el, t:target, h: height || 2.2, until: simT + 3.2});
  while (SPEECH.length > 5) { const o = SPEECH.shift(); o.el.remove(); }
}
function updateSpeech(){
  for (let i = SPEECH.length-1; i >= 0; i--) {
    const b = SPEECH[i];
    if (simT > b.until || INTERIOR) { b.el.remove(); SPEECH.splice(i,1); continue; }
    _v3.set(b.t.x, b.h + (b.t.down > 0 ? -1.2 : 0), b.t.z).project(camera);
    if (_v3.z > 1 || Math.abs(_v3.x) > 1.2 || Math.abs(_v3.y) > 1.2) { b.el.style.display = 'none'; continue; }
    b.el.style.display = '';
    b.sx = (_v3.x + 1)/2*innerWidth; b.sy = (1 - _v3.y)/2*innerHeight;
    b.el.style.opacity = Math.min(1, (b.until - simT)*2);
  }
  // nudge overlapping bubbles apart
  const vis = SPEECH.filter(b => b.el.style.display !== 'none' && b.sx !== undefined).sort((a,b) => a.sy - b.sy);
  for (let i = 0; i < vis.length; i++) for (let j = 0; j < i; j++) {
    const a = vis[j], b = vis[i];
    if (Math.abs(a.sx - b.sx) < (a.el.offsetWidth + b.el.offsetWidth)/2 + 4 && Math.abs(a.sy - b.sy) < 34) b.sy = a.sy + 34;
  }
  vis.forEach(b => { b.el.style.left = b.sx + 'px'; b.el.style.top = b.sy + 'px'; });
}
function clearSpeech(){ SPEECH.forEach(b => b.el.remove()); SPEECH.length = 0; }
const vehH = n => n.kind === 'bus' ? 3.9 : n.kind === 'bike' ? 2.4 : 2.6;

// ============ Menus ============
function showModal(html, buttons){
  $('modalBody').innerHTML = html;
  const bb = $('modalBtns'); bb.innerHTML = '';
  (buttons||[{t:'OK', f:closeModal}]).forEach(b => { const e = document.createElement('button'); e.className = 'btn' + (b.ghost ? ' ghost' : ''); e.textContent = b.t; e.onclick = b.f; bb.appendChild(e); });
  $('modal').classList.remove('hidden'); setPaused(true, true);
}
function closeModal(){ $('modal').classList.add('hidden'); if ($('pause').classList.contains('hidden')) setPaused(false); }
function setPaused(v, quiet){
  paused = v;
  if (v && !quiet) { $('pause').classList.remove('hidden'); renderPause(); persist(); }
  if (!v) { $('pause').classList.add('hidden'); }
}
function togglePause(){ if (!playing) return; if (!$('modal').classList.contains('hidden')) { closeModal(); return; } setPaused(!paused); }
function renderPause(){
  $('pStats').innerHTML = '<b>' + escapeHtml(S.name) + '</b> · ' + money(S.money) + '<br>' +
    S.stats.trips + ' fares · ' + S.stats.busPax + ' bus passengers · ' + Math.round(S.stats.km) + ' km driven<br>' +
    'Fines paid ' + money(S.stats.fines) + ' · Escapes ' + S.stats.escapes + ' · Busted ' + S.stats.busts + '<br>' +
    'Cities visited: ' + S.stats.cities.length + ' of ' + CITIES.length;
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function repairCost(){ return Math.round(S.damage * (P.def.cat === 'bus' ? 12 : P.def.cat === 'car' ? 10 : 5)); }

const SHOP_OF = {car:'carshow', auto:'autoshow', taxi:'taxishow', bus:'busshow'};
function openShowroom(cat){
  let tab = cat || P.def.cat;
  const render = () => {
    const list = VEHICLES.filter(v => v.cat === tab).sort((a,b) => a.price - b.price);
    const pt = PLACE_TYPES[SHOP_OF[tab]];
    const needL = LICENCE_NEEDS[tab].filter(k => !S.docs[k]);
    let html = '<h2>' + {car:'🏎',auto:'🛺',taxi:'🚕',bus:'🚌'}[tab] + ' ' + escapeHtml(W.city.en) + ' ' + pt.en + '</h2><p class="native">' + escapeHtml(pt[W.city.st]) + '</p><p class="small">You have <b>' + money(S.money) + '</b>' + (onFoot ? ' · A vehicle you buy here is parked outside for you.' : '') + ' · ' + list.length + ' models</p>' + (needL.length ? '<p class="festbox">You\'ll need a ' + needL.map(k => LICENCE_NAMES[k]).join(' and ') + ' from the RTO office to drive these legally.</p>' : '');
    html += '<div class="vlist">';
    list.forEach(v => {
      const owned = S.owned.includes(v.id), active = S.active === v.id;
      const extra = v.cat === 'bus' ? v.seats + ' seats · ₹' + v.ticket + '/ticket' : v.cat === 'car' ? (v.lux ? '✨ Luxury · ' : '') + '0–100 in ' + (27.8/v.accel).toFixed(1) + ' s' : '₹' + v.base + ' base + ₹' + v.perKm + '/km';
      html += '<div class="vrow"><div class="sw" style="background:#' + v.colors[0].toString(16).padStart(6,'0') + ';border-color:#' + v.colors[1].toString(16).padStart(6,'0') + '"></div><div class="vinfo"><b>' + v.name + '</b><span>Top speed ' + v.speed + ' km/h · ' + extra + '</span></div>' +
        (active ? '<span class="tag">Driving</span>' : owned ? '<button class="btn small" data-drive="' + v.id + '">Drive</button>' : '<button class="btn small" data-buy="' + v.id + '"' + (S.money < v.price ? ' disabled' : '') + '>' + money(v.price) + '</button>') + '</div>';
    });
    html += '</div>';
    showModal(html, [{t:'Leave', f:closeModal}]);
    $('modalBody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const v = vehDef(b.dataset.buy); if (S.money < v.price) return; S.money -= v.price; S.owned.push(v.id); toast('Bought ' + v.name + '!', 'good'); ding(2); persist(); render(); });
    $('modalBody').querySelectorAll('[data-drive]').forEach(b => b.onclick = () => { switchVehicle(b.dataset.drive); render(); });
  };
  render();
}
function openGarage(atPump){
  const render = () => {
    let html = '<h2>🔧 My vehicles</h2>';
    if (atPump) html += '<p>Pollution certificate valid to Day ' + S.docs.pucUntil + '. <button class="btn small" id="pucBtn"' + (S.money < 100 ? ' disabled' : '') + '>Renew 15 days · ₹100</button></p>';
    if (atPump && S.damage > 0) html += '<p>Your ' + escapeHtml(P.def.name) + ' is ' + Math.round(S.damage) + '% damaged. <button class="btn small" id="repBtn"' + (S.money < repairCost() ? ' disabled' : '') + '>Repair for ' + money(repairCost()) + '</button></p>';
    else if (!atPump) html += '<p class="small">Repairs are done at any petrol pump. Buy new vehicles at the showroom.</p>';
    html += '<div class="vlist">';
    S.owned.forEach(id => { const v = vehDef(id); html += '<div class="vrow"><div class="sw" style="background:#' + v.colors[0].toString(16).padStart(6,'0') + '"></div><div class="vinfo"><b>' + v.name + '</b><span>' + CAT_NAMES[v.cat].slice(0,-1) + ' · ' + v.speed + ' km/h</span></div>' + (S.active === id ? '<span class="tag">Driving</span>' : '<button class="btn small" data-drive="' + id + '">Drive</button>') + '</div>'; });
    html += '</div>';
    showModal(html, [{t:'Close', f:closeModal}]);
    const pb = $('pucBtn'); if (pb) pb.onclick = () => { if (S.money < 100) return; S.money -= 100; S.docs.pucUntil = Math.max(S.docs.pucUntil, S.day) + 15; toast('Pollution certificate renewed', 'good'); persist(); render(); };
    const rb = $('repBtn'); if (rb) rb.onclick = () => { const c = repairCost(); if (S.money < c) return; S.money -= c; S.damage = 0; spawnPlayer(S.active, P.x, P.z, P.h); setupJob(); toast('Repaired and good as new', 'good'); persist(); render(); };
    $('modalBody').querySelectorAll('[data-drive]').forEach(b => b.onclick = () => { switchVehicle(b.dataset.drive); render(); });
  };
  render();
}
function visitHoly(p){
  const fest = festToday && festToday.poi === p ? festToday.info : null;
  const note = p.type === 'church' ? 'You park outside and step in quietly.' : 'You park outside, leave your footwear at the entrance and step in quietly.';
  let html = '<h2>' + escapeHtml(p.en) + '</h2><p class="native">' + escapeHtml(p.nt) + '</p><p>' + note + '</p>';
  if (fest) html += '<p class="festbox">🎉 <b>' + fest.en + '</b> (' + fest.nt + ') is being celebrated here today. The procession leaves around 4:00 PM. Expect road blocks nearby until about 8:30 PM.</p>';
  else html += '<p class="small">No festival here today. Check back on other days. Festivals change daily.</p>';
  showModal(html, [{t:'Back to the road', f:closeModal}]);
}

// ===== State map (travel between district headquarters)
function openMap(){
  $('mapScreen').classList.remove('hidden'); setPaused(true, true);
  drawStateMap(); selectCity(null);
}
let MAPSEL = null, MAPBOX = null;
function drawStateMap(){
  const cv = $('stateMap'); const box = cv.getBoundingClientRect(); cv.width = box.width*devicePixelRatio; cv.height = box.height*devicePixelRatio;
  const x = cv.getContext('2d'); x.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const w = box.width, h = box.height;
  const lat0 = 7.9, lat1 = 13.4, lon0 = 74.7, lon1 = 80.6;
  const sc = Math.min(w/(lon1-lon0), h/(lat1-lat0)) * 0.94;
  const ox = (w - (lon1-lon0)*sc)/2, oy = (h - (lat1-lat0)*sc)/2;
  const P2 = (lat, lon) => [ox + (lon-lon0)*sc, oy + (lat1-lat)*sc];
  MAPBOX = {P2, sc};
  x.fillStyle = '#123b44'; x.fillRect(0,0,w,h);
  // rough land outline (stylised)
  const land = [[13.4,74.7],[12.8,74.85],[12.0,75.2],[11.3,75.7],[10.4,76.1],[9.6,76.3],[8.9,76.55],[8.3,77.0],[8.08,77.55],[8.6,78.1],[9.2,78.6],[9.3,79.1],[10.0,79.4],[10.4,79.85],[11.3,79.85],[12.2,79.98],[13.0,80.3],[13.4,80.35],[13.4,74.7]];
  x.fillStyle = '#3b5f3a'; x.beginPath(); land.forEach(([la,lo],i) => { const [px,py] = P2(la,lo); i ? x.lineTo(px,py) : x.moveTo(px,py); }); x.closePath(); x.fill();
  // Kerala region tint (west strip)
  const kl = [[12.8,74.85],[12.0,75.2],[11.3,75.7],[10.4,76.1],[9.6,76.3],[8.9,76.55],[8.3,77.0],[8.5,77.2],[9.4,77.15],[10.2,77.1],[10.6,76.85],[11.0,76.75],[11.5,76.45],[12.2,75.9],[12.8,75.2]];
  x.fillStyle = '#4e8a3f'; x.beginPath(); kl.forEach(([la,lo],i) => { const [px,py] = P2(la,lo); i ? x.lineTo(px,py) : x.moveTo(px,py); }); x.closePath(); x.fill();
  x.font = '700 13px "Baloo Chettan 2",sans-serif'; x.fillStyle = 'rgba(255,255,255,.55)';
  let [kx,ky] = P2(9.2,75.0); x.fillText('KERALA · കേരളം', kx-40, ky);
  [kx,ky] = P2(13.25,77.1); x.fillText('TAMIL NADU · தமிழ்நாடு', kx-60, ky);
  const cur = cityById(S.city);
  CITIES.forEach(c => {
    const [px,py] = P2(c.lat, c.lon);
    const visited = S.stats.cities.includes(c.id);
    x.fillStyle = c.st === 'KL' ? '#f4d03f' : '#ff8a3d';
    x.beginPath(); x.arc(px,py, c.big ? 6 : 4.2, 0, 7); x.fill();
    x.strokeStyle = c === MAPSEL ? '#fff' : visited ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.4)'; x.lineWidth = c === MAPSEL ? 3 : 1.4; x.stroke();
    if (c === cur) { x.strokeStyle = '#19c3b8'; x.lineWidth = 2.5; x.beginPath(); x.arc(px,py,10,0,7); x.stroke(); }
    if (c.big || c === MAPSEL || c === cur) { x.fillStyle = '#fff'; x.font = '600 11px sans-serif'; x.fillText(c.en, px+8, py+4); }
  });
}
function selectCity(c){
  MAPSEL = c; drawStateMap();
  const card = $('cityCard');
  if (!c) { card.innerHTML = '<p class="small">Tap a city to travel there. 🟡 Kerala · 🟠 Tamil Nadu. All ' + CITIES.length + ' district headquarters are open.</p>'; return; }
  const cur = cityById(S.city);
  const km = Math.round(haversine(cur, c)*1.3);
  const cost = Math.round(km * (P.def.cat === 'bus' ? 3 : P.def.cat === 'auto' ? 1 : 2));
  const hrs = (km / 55);
  card.innerHTML = '<h3>' + c.en + ' <span class="native">' + c.nt + '</span></h3><p class="small">' + c.dist + ' district · ' + (c.st === 'KL' ? 'Kerala' : 'Tamil Nadu') + (S.stats.cities.includes(c.id) ? ' · visited' : '') + '</p>' +
    (c === cur ? '<p>You are here.</p>' : '<p>' + km + ' km by road · about ' + (hrs < 1 ? Math.round(hrs*60) + ' min' : hrs.toFixed(1) + ' h') + ' · fuel & tolls ' + money(cost) + '</p><button class="btn" id="goBtn">Drive to ' + c.en + '</button>');
  const gb = $('goBtn');
  if (gb) gb.onclick = () => {
    const pay = Math.min(cost, Math.max(0, S.money));
    S.money -= pay;
    advanceTime(Math.round(hrs*60));
    $('mapScreen').classList.add('hidden');
    $('loading').classList.remove('hidden'); $('loadTxt').textContent = 'Driving to ' + c.en + '…';
    setTimeout(() => { S.pos = null; if (onFoot) { if (INTERIOR) leaveBuilding(); getIn(); } loadCity(c.id, false); updateCamera(0, true); $('loading').classList.add('hidden'); setPaused(false); persist(); toast('Welcome to ' + c.en + ' · ' + c.nt, 'good'); }, 60);
  };
}
function advanceTime(mins){ S.min += mins; while (S.min >= 1440) { S.min -= 1440; S.day++; if (W) setupDay(); } }

// ============ Main loop ============
let last = performance.now(), autosave = 0;
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last)/1000); last = now;
  if (!W || !P) return;
  pollGamepad();
  if (playing && !paused) {
    simT += dt;
    const before = S.min;
    S.min += dt;  // 1 real second = 1 game minute
    if (S.min >= 1440) { S.min -= 1440; S.day++; setupDay(); S.today = {day:S.day, earned:0, fines:0, trips:0, night:0}; toast('A new day: Day ' + S.day, 'info'); persist(); }
    if (Math.floor(before) % 1440 < 1320 && Math.floor(S.min) % 1440 >= 1320) { toast('🌙 Night fares: +50% until 4 AM', 'good'); phoneNote('Night fares active: +50% until 4 AM'); }
    if (onFoot) stepFoot(dt); else stepPlayer(dt);
    updateWeather(dt); updateChecks(dt); updateRoute(dt);
    if (PHONE.noteT > 0) PHONE.noteT -= dt;
    updateTraffic(dt); updatePeds(dt); updateAnimals(dt); updatePolice(dt);
    if (!onFoot) updateJobs(dt); else { $('prompt').textContent = ''; destBeam.visible = !!RIDER; }
    updateProcession(dt); updateDebris(dt);
    autosave += dt; if (autosave > 30) { autosave = 0; persist(); }
  }
  updateEnvironment(dt);
  updateCamera(dt);
  if (playing) updateSpeech();
  updateAudio();
  if (playing) updateHUD(dt);
  renderer.render(scene, camera);
}

// ============ Input ============
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase(); K[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  if (e.repeat || !playing) return;
  if (k === 'p' || k === 'escape') { if (!$('mapScreen').classList.contains('hidden')) { $('mapScreen').classList.add('hidden'); setPaused(false); } else togglePause(); }
  if (k === 'c') cycleCam();
  if (k === 'h' && !onFoot) { honk(); honkReact(); }
  if (k === 'f' && !paused) toggleFoot();
  if (k === 'r' && !paused) radioToggle();
  if ((k === 'e' || k === 'enter') && ACTION && !paused) ACTION.f();
  if (k === 'm' && !paused && !INTERIOR) openMap();
});
addEventListener('keyup', e => { K[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { Object.keys(K).forEach(k => K[k] = false); });
function cycleCam(){ const m = ['chase','high','cab']; S.settings.cam = m[(m.indexOf(S.settings.cam)+1)%3]; updateCamera(0, true); }
let gpPrev = {};
function pollGamepad(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...gps].find(g => g);
  if (!gp) { GP = {gas:0,brake:0,steer:0}; return; }
  GP.steer = gp.axes[0] || 0; GP.gas = gp.buttons[7] ? gp.buttons[7].value : 0; GP.brake = gp.buttons[6] ? gp.buttons[6].value : 0;
  const edge = i => { const p = gp.buttons[i] && gp.buttons[i].pressed; const r = p && !gpPrev[i]; gpPrev[i] = p; return r; };
  if (edge(0)) { honk(); honkReact(); } if (edge(3)) cycleCam(); if (edge(9)) togglePause(); if (edge(2) && ACTION && !paused) ACTION.f();
}
function bindTouch(){
  document.querySelectorAll('#touch [data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); initAudio(); if (k === 'horn') { honk(); honkReact(); return; } TOUCH[k] = true; b.classList.add('down'); };
    const off = e => { e.preventDefault(); TOUCH[k] = false; b.classList.remove('down'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
}

// ============ Account screens ============
function renderAccounts(){
  const acc = accounts();
  const list = $('accList'); list.innerHTML = '';
  if (!acc.list.length) list.innerHTML = '<p class="small">No accounts on this phone yet. Create one to start.</p>';
  acc.list.forEach(a => {
    const sv = store.get(SAVE_PREFIX + a.id);
    const b = document.createElement('button'); b.className = 'acct';
    b.innerHTML = '<b>' + escapeHtml(a.name) + '</b><span>' + (sv ? money(sv.money) + ' · ' + escapeHtml(cityById(sv.city).en) + ' · Day ' + sv.day : 'New') + '</span>';
    b.onclick = () => askPin(a);
    list.appendChild(b);
  });
}
function askPin(a){
  $('pinFor').textContent = a.name; $('pinIn').value = ''; $('pinErr').textContent = '';
  $('pinBox').classList.remove('hidden'); $('pinIn').focus();
  $('pinGo').onclick = () => {
    if (pinHash($('pinIn').value, a.name) !== a.pin) { $('pinErr').textContent = 'Wrong PIN'; return; }
    $('pinBox').classList.add('hidden'); login(a.id, a.name);
  };
}
function createAccount(){
  const name = $('newName').value.trim().slice(0,20), pin = $('newPin').value.trim();
  if (!name) { $('newErr').textContent = 'Enter a driver name'; return; }
  if (!/^\d{4}$/.test(pin)) { $('newErr').textContent = 'PIN must be 4 digits'; return; }
  const acc = accounts();
  if (acc.list.some(a => a.name.toLowerCase() === name.toLowerCase())) { $('newErr').textContent = 'That name is already used on this phone'; return; }
  const id = 'u' + Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36);
  acc.list.push({id, name, pin: pinHash(pin, name)});
  if (!store.set(ACC_KEY, acc)) { $('newErr').textContent = 'This browser is blocking storage, so progress can\'t be saved.'; return; }
  const sv = defaultSave(name); sv.city = $('startCity').value; sv.stats.cities = [sv.city];
  store.set(SAVE_PREFIX + id, sv);
  login(id, name);
}
function login(id, name){
  const sv = store.get(SAVE_PREFIX + id);
  ACC = id; S = mergeSave(sv || defaultSave(name));
  $('accScreen').classList.add('hidden');
  $('loading').classList.remove('hidden'); $('loadTxt').textContent = 'Loading ' + cityById(S.city).en + '…';
  initAudio();
  setTimeout(() => {
    applyGfx();
    loadCity(S.city, true);
    updateCamera(0, true);
    $('loading').classList.add('hidden'); $('hud').classList.remove('hidden');
    document.body.classList.add('playing');
    playing = true; paused = false;
    toast('Welcome back, ' + S.name + '! You are in ' + W.city.en + '.', 'good');
    persist();
  }, 50);
}
function logout(){
  persist(); if (RADIO_SYS.on) { RADIO_SYS.on = false; stopRadio(); } playing = false; paused = false;
  $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); document.body.classList.remove('playing');
  disposeTown(); if (P) scene.remove(P.mesh); W = null; P = null; S = null; ACC = null;
  renderAccounts(); $('accScreen').classList.remove('hidden');
}
function openSettings(){
  const s = S.settings;
  showModal('<h2>⚙ Settings</h2>' +
    '<label class="row">Graphics <select id="gfxSel"><option value="low">Smooth (phones)</option><option value="high">Sharp (laptops)</option></select></label>' +
    '<label class="row">Camera <select id="camSel"><option value="chase">Behind</option><option value="high">High</option><option value="cab">Driver seat</option></select></label>' +
    '<label class="row">Sound <input type="checkbox" id="sndChk"' + (s.sound ? ' checked' : '') + '></label>' +
    '<label class="row">People react (speech bubbles) <input type="checkbox" id="reactChk"' + (s.reactions !== false ? ' checked' : '') + '></label>' +
    '<label class="row">Hear people shout (voice) <input type="checkbox" id="voiceChk"' + (s.voices !== false ? ' checked' : '') + '></label>' +
    '<p class="small">Voices come from your phone. ' + (hasVoice('ml') ? 'Malayalam ✓ ' : 'No Malayalam voice (Manglish is used instead) · ') + (hasVoice('ta') ? 'Tamil ✓' : 'No Tamil voice (Tanglish is used instead)') + '. Add voices under your phone\'s Settings → Text-to-speech.</p>' +
    '<label class="row">Reaction language <select id="reactSel">' + Object.entries(REACT_LANGS).map(([k,v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label>' +
    '<h3>Backup</h3><p class="small">Your progress is saved on this device. To move it to another phone or keep a copy, copy this backup code and keep it somewhere safe.</p>' +
    '<textarea id="bkTxt" rows="3" readonly></textarea><div class="row"><button class="btn small" id="bkCopy">Copy code</button></div>' +
    '<p class="small">Restore from a code (replaces this account\'s progress):</p><textarea id="rsTxt" rows="2" placeholder="Paste a backup code"></textarea><div class="row"><button class="btn small ghost" id="rsGo">Restore</button><span id="rsMsg" class="small"></span></div>',
    [{t:'Done', f:() => { s.gfx = $('gfxSel').value; s.cam = $('camSel').value; s.sound = $('sndChk').checked; s.reactions = $('reactChk').checked; s.voices = $('voiceChk').checked; s.reactLang = $('reactSel').value; setSound(s.sound); applyGfx(); persist(); closeModal(); setPaused(true); }}]);
  $('gfxSel').value = s.gfx; $('camSel').value = s.cam; $('reactSel').value = s.reactLang || 'auto';
  persist();
  $('bkTxt').value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  $('bkCopy').onclick = () => { $('bkTxt').select(); (navigator.clipboard ? navigator.clipboard.writeText($('bkTxt').value) : Promise.reject()).then(() => $('rsMsg').textContent = 'Copied', () => { try { document.execCommand('copy'); $('rsMsg').textContent = 'Copied'; } catch(e) { $('rsMsg').textContent = 'Select the text and copy it'; } }); };
  $('rsGo').onclick = () => {
    try { const d = JSON.parse(decodeURIComponent(escape(atob($('rsTxt').value.trim())))); if (typeof d.money !== 'number') throw 0; const name = S.name; S = mergeSave(d); S.name = name; persist(); $('rsMsg').textContent = 'Restored'; loadCity(S.city, true); updateCamera(0,true); }
    catch(e) { $('rsMsg').textContent = 'That code is not valid'; }
  };
}

// ============ Boot ============
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('installBtn').classList.remove('hidden'); });
function boot(){
  initThree();
  // starting-city picker
  const sel = $('startCity');
  [['KL','Kerala'],['TN','Tamil Nadu']].forEach(([st,lab]) => { const og = document.createElement('optgroup'); og.label = lab; CITIES.filter(c => c.st === st).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.en + ' · ' + c.nt; og.appendChild(o); }); sel.appendChild(og); });
  sel.value = 'ekm';
  renderAccounts();
  $('newGo').onclick = createAccount;
  $('pinCancel').onclick = () => $('pinBox').classList.add('hidden');
  $('pinIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('pinGo').click(); });
  $('installBtn').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('installBtn').classList.add('hidden'); };
  $('pauseBtn').onclick = () => togglePause();
  $('actBtn').onclick = () => { if (ACTION) ACTION.f(); };
  $('camBtn').onclick = cycleCam;
  $('mapBtn').onclick = () => { if (!INTERIOR) openMap(); };
  $('footBtn').onclick = toggleFoot;
  $('radioBtn').onclick = openRadioPicker; $('radioChip').onclick = openRadioPicker;
  document.querySelectorAll('#phoneTabs button').forEach(b => b.onclick = () => { PHONE.tab = b.dataset.tab; document.querySelectorAll('#phoneTabs button').forEach(x => x.classList.toggle('on', x === b)); phoneT = 0; $('phoneBody')._h = null; });
  $('phoneMini').onclick = () => { PHONE.open = !$('phone').classList.contains('open'); $('phone').classList.toggle('open', PHONE.open); };
  if (IS_TOUCH) $('phone').classList.remove('open');
  $('pResume').onclick = () => setPaused(false);
  $('pMap').onclick = () => { $('pause').classList.add('hidden'); openMap(); };
  $('pGarage').onclick = () => { $('pause').classList.add('hidden'); openGarage(false); };
  $('pSettings').onclick = () => { $('pause').classList.add('hidden'); openSettings(); };
  $('pLogout').onclick = logout;
  $('mapClose').onclick = () => { $('mapScreen').classList.add('hidden'); setPaused(false); };
  $('stateMap').addEventListener('click', e => {
    if (!MAPBOX) return; const r = e.currentTarget.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 22; CITIES.forEach(c => { const [px,py] = MAPBOX.P2(c.lat,c.lon); const d = Math.hypot(px-mx, py-my); if (d < bd) { bd = d; best = c; } });
    selectCity(best);
  });
  addEventListener('resize', () => { if (!$('mapScreen').classList.contains('hidden')) drawStateMap(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { persist(); if (!paused) setPaused(true); } });
  addEventListener('pagehide', persist);
  bindTouch();
  if (IS_TOUCH) document.body.classList.add('touch');
  // show a scenic town behind the account screen
  // load Malayalam & Tamil fonts before drawing any signs
  const fontLoad = document.fonts ? Promise.race([Promise.all(['600','700','800'].flatMap(w => [document.fonts.load(w+' 40px "Baloo Chettan 2"', 'abc വണ്ടി'), document.fonts.load(w+' 40px "Baloo Thambi 2"', 'வண்டி')])), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
  fontLoad.catch(() => {}).then(() => {
    if (playing) return;
    S = defaultSave('preview'); W = buildTown(cityById('ekm'), scene, {aniso: 4}); spawnPlayer('auto1', W.spawn.x, W.spawn.z, W.spawn.h); spawnTraffic(); setupDay();
    S.min = 17*60; updateCamera(0,true);
    const previewSpin = () => { if (playing || !W || !P) return; P.h += 0.002; updateTraffic(1/60); simT += 1/60; requestAnimationFrame(previewSpin); };
    previewSpin();
  });
  const origLogin = login;
  // remove preview world on login
  window.__clearPreview = () => { disposeTown(); if (P) scene.remove(P.mesh); W = null; P = null; };
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
// wrap login to clear the preview world first
const _login = login;
login = function(id, name){ if (!playing && window.__clearPreview) { window.__clearPreview(); window.__clearPreview = null; } _login(id, name); };
window.addEventListener('DOMContentLoaded', boot);
