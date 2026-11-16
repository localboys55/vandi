// Vandi — drivable national highways between district headquarters
'use strict';

const HINDI = {
  tvm:'तिरुवनंतपुरम', klm:'कोल्लम', pta:'पत्तनमतिट्टा', alp:'आलप्पुझा', ktm:'कोट्टयम', idk:'पैनावु', ekm:'काक्कनाड', tsr:'त्रिशूर', pkd:'पालक्काड', mlp:'मलप्पुरम', kkd:'कोझिकोड', wyd:'कल्पेट्टा', knr:'कन्नूर', ksd:'कासरगोड',
  ari:'अरियालूर', cgl:'चेंगलपट्टू', che:'चेन्नई', cbe:'कोयंबटूर', cud:'कडलूर', dpi:'धर्मपुरी', dgl:'डिंडीगुल', erd:'ईरोड', kkr:'कल्लाकुरिची', kpm:'कांचीपुरम', ngl:'नागरकोइल', krr:'करूर', kgi:'कृष्णगिरि', mdu:'मदुरै',
  myl:'मयिलादुतुरै', ngp:'नागपट्टिनम', nmk:'नामक्कल', ooty:'ऊटी', pmb:'पेरम्बलूर', pdk:'पुदुक्कोट्टई', rmd:'रामनाथपुरम', rpt:'रानीपेट', slm:'सेलम', svg:'शिवगंगा', tks:'तेनकासी', tnj:'तंजावुर', thn:'तेनी', tut:'तूत्तुक्कुडी',
  try:'तिरुचिरापल्ली', tvl:'तिरुनेलवेली', tpt:'तिरुपत्तूर', tup:'तिरुप्पुर', tlr:'तिरुवल्लूर', tvm2:'तिरुवन्नामलाई', tvr:'तिरुवारूर', vlr:'वेल्लोर', vpm:'विलुप्पुरम', vnr:'विरुधुनगर',
};
const STATE_WELCOME = {
  KL: ['കേരളത്തിലേക്ക് സ്വാഗതം', 'केरल में आपका हार्दिक स्वागत है', 'Welcome to Kerala'],
  TN: ['தமிழ்நாட்டிற்கு வரவேற்கிறோம்', 'तमिलनाडु में आपका हार्दिक स्वागत है', 'Welcome to Tamil Nadu'],
};
// Highway numbers are picked from real NH numbers that run through each state, for illustration.
function highwayNumber(a, b){
  const list = a.st === 'KL' && b.st === 'KL' ? [66, 544, 183, 85] : a.st === 'TN' && b.st === 'TN' ? [44, 32, 38, 544, 48, 81, 83] : [544, 744, 66, 183];
  return 'NH ' + list[hashStr(a.id < b.id ? a.id + b.id : b.id + a.id) % list.length];
}

function hwTex(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
function fitText(x, txt, cx, cy, maxW, size, weight, font){ let s = size; do { x.font = (weight||800) + ' ' + s + 'px ' + (font || '"Baloo Chettan 2","Baloo Thambi 2","Noto Sans Devanagari",sans-serif'); s -= 2; } while (x.measureText(txt).width > maxW && s > 10); x.fillText(txt, cx, cy); }

// Green district board like Indian highway direction signs: native + Hindi + English, arrows & distances
function districtBoardTex(nh, cols, st){
  return hwTex(1536, 512, (x, w, h) => {
    x.fillStyle = '#0d6b3a'; x.fillRect(0,0,w,h); x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(10,10,w-20,h-20);
    x.fillStyle = '#ffd400'; x.fillRect(10,10,w-20,70); x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
    fitText(x, (st === 'KL' ? 'ദേശീയ പാത' : 'தேசிய நெடுஞ்சாலை') + '  ·  NATIONAL HIGHWAY  ·  ' + nh, w/2, 47, w-60, 44);
    const cw = (w-20)/cols.length;
    cols.forEach((c, i) => {
      const cx = 10 + cw*i + cw/2;
      if (i) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4; x.beginPath(); x.moveTo(10+cw*i, 100); x.lineTo(10+cw*i, h-30); x.stroke(); }
      x.fillStyle = '#fff';
      // arrow
      x.save(); x.translate(cx - cw*0.36, 300); x.rotate(c.arrow === 'left' ? -Math.PI/4 : c.arrow === 'right' ? Math.PI/4 : 0);
      x.beginPath(); x.moveTo(0,-62); x.lineTo(30,-18); x.lineTo(12,-18); x.lineTo(12,58); x.lineTo(-12,58); x.lineTo(-12,-18); x.lineTo(-30,-18); x.closePath(); x.fill(); x.restore();
      x.textAlign = 'left';
      fitText(x, c.nt, cx - cw*0.24, 160, cw*0.68, 58);
      fitText(x, c.hi, cx - cw*0.24, 245, cw*0.68, 50);
      fitText(x, c.en, cx - cw*0.24, 330, cw*0.68, 54);
      x.textAlign = 'center'; x.fillStyle = '#ffd400';
      fitText(x, c.km != null ? c.km + ' km' : 'EXIT', cx, 430, cw*0.8, 60, 800, '"Share Tech Mono",monospace');
    });
  });
}
// State welcome gantry: native + Hindi + English with an NH shield
function stateBoardTex(st, nh){
  const t = STATE_WELCOME[st];
  return hwTex(1536, 384, (x, w, h) => {
    x.fillStyle = '#0b6b55'; x.fillRect(0,0,w,h); x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(10,10,w-20,h-20);
    x.fillStyle = '#ffd400'; x.fillRect(40, 190, 150, 130); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(40,190,150,130);
    x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 54px "Share Tech Mono",monospace'; x.fillText(nh.split(' ')[0], 115, 228); x.fillText(nh.split(' ')[1], 115, 284);
    x.fillStyle = '#4fa3d8'; x.beginPath(); x.arc(115, 105, 62, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(70, 135); x.quadraticCurveTo(115, 40, 160, 135); x.lineTo(150,135); x.quadraticCurveTo(115, 70, 80, 135); x.fill();
    x.fillStyle = '#fff';
    fitText(x, t[0], w/2 + 90, 85, w-320, 70);
    fitText(x, t[1], w/2 + 90, 180, w-320, 62);
    fitText(x, t[2], w/2 + 90, 280, w-320, 76);
  });
}
function kmStoneTex(name, km){
  return hwTex(128, 160, (x, w, h) => {
    x.fillStyle = '#f4f4f0'; x.fillRect(0,0,w,h); x.fillStyle = '#f2c21b'; x.fillRect(0,0,w,56);
    x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
    fitText(x, name, w/2, 90, w-10, 26, 800);
    x.font = '800 40px "Share Tech Mono",monospace'; x.fillText(String(km), w/2, 132);
  });
}

function smooth01(t){ t = Math.max(0, Math.min(1, t)); return t*t*(3 - 2*t); }
function buildHighway(from, to, scene, opts){
  const R = mulberry(hashStr(from.id + '>' + to.id));
  const realKm = Math.max(20, Math.round(haversine(from, to) * 1.3));
  const L = Math.round(clamp(realKm * 12, 800, 4200));
  const nh = highwayNumber(from, to);
  const group = new THREE.Group(); scene.add(group);
  const dummyM = new THREE.MeshBasicMaterial({color:0x333333});
  const W = {highway: true, city: from, fromId: from.id, toId: to.id, from, to, nh, KL: from.st === 'KL', group, len: L, realKm,
    pois: [], signals: [], sigSet: new Set(), cams: [], crossings: [], pillars: [], straight: [], roadLines: [], rows: [], cols: [], winMats: [],
    lampMat: dummyM, sigLamp: [[[dummyM,dummyM,dummyM],[dummyM,dummyM,dummyM]],[[dummyM,dummyM,dummyM],[dummyM,dummyM,dummyM]]], festDecor: new THREE.Group(),
    spawn: {x: 7.8, z: -88, h: 0}, exits: [], border: null, N: 1, approaches: []};
  W.isCrossing = () => false; W.tileAt = () => ROAD; W.isRoad = () => true; W.isInter = () => false; W.poiBy = t => W.pois.filter(p => p.type === t);
  const kmAt = z => Math.max(0, Math.round((L - z) / L * realKm));

  // ---- route: towns along the way, district changes, state border
  const dx = to.lon - from.lon, dy = to.lat - from.lat, d2 = dx*dx + dy*dy || 1;
  const mids = CITIES.filter(c => c !== from && c !== to).map(c => {
    const t = ((c.lon - from.lon)*dx + (c.lat - from.lat)*dy) / d2;
    const px = from.lon + dx*t, py = from.lat + dy*t;
    const off = haversine({lat:py, lon:px}, c);
    return {c, t, off};
  }).filter(o => o.t > 0.08 && o.t < 0.92 && o.off < 32).sort((a,b) => a.t - b.t);
  const stops = [{c: from, t: 0}, ...mids, {c: to, t: 1}];
  // keep stops spaced out on the road
  W.stops = stops.filter((s, i) => i === 0 || i === stops.length-1 || (s.t - stops[i-1].t) * L > 220);
  for (let i = 1; i < W.stops.length; i++) {
    if (W.stops[i].c.st !== W.stops[i-1].c.st && !W.border) W.border = {z: Math.round((W.stops[i].t + W.stops[i-1].t)/2 * L), st: W.stops[i].c.st};
  }
  W.zones = W.stops.map((s, i) => ({c: s.c, z: i === 0 ? 0 : Math.round(s.t*L) - 160}));

  // ---- surfaces & collisions
  const pads = []; // petrol station forecourts
  W.surfaceAt = (x, z) => { if (Math.abs(x) <= 10.6) return ROAD; if (pads.some(p => x > 10 && x < 30 && Math.abs(z - p) < 22)) return PUMP; for (const e of W.exits) if (x > 10 && x < 19 && z > e.z - 70 && z < e.z + 25) return ROAD; return GRASS; };
  W.collide = (px, pz, r) => {
    let hit = false;
    if (Math.abs(px) < 0.7 + r && pz > -5 && pz < L + 5) { hit = true; px = Math.sign(px || 1) * (0.7 + r); }
    if (pz < -100) { hit = true; pz = -100; }
    // flyover decks at both ends: stay between the railings while up on them
    if (W.heightAt(px < 5.2 ? 7.8 : px, pz) > 1.2 && (pz < -20 || pz > L - 110)) {
      if (px < 5.4 + r) { hit = true; px = 5.4 + r; } if (px > 10.2 - r) { hit = true; px = 10.2 - r; }
    }
    if (Math.abs(px) > 85) { hit = true; px = Math.sign(px) * 85; }
    for (const tl of (W.tolls || [])) for (const bx of tl.islands) if (Math.abs(pz - tl.z) < 4.5 + r && Math.abs(px - bx) < 0.9 + r) { hit = true; px = bx + Math.sign(px - bx || 1)*(0.9 + r); }
    for (const p of pads) if (px > 18.5 && px < 26.5 && Math.abs(pz - p - 0) < 5) { hit = true; px = 18.5 - r; }
    return {x: px, z: pz, hit};
  };
  // flyovers: come down into the highway at the start, climb up into the next town at the end
  const fyH = z => z < -60 ? 7 : z < -12 ? 7*(1 - smooth01((z + 60)/48)) : z > L - 50 ? 7 : z > L - 110 ? 7*smooth01((z - (L - 110))/60) : 0;
  W.heightAt = (x, z) => (x > 5.2 && x < 10.5) ? fyH(z) : 0;
  {
    const segs = 30;
    const deckMat = new THREE.MeshLambertMaterial({map: rampTex()}), wallM = new THREE.MeshLambertMaterial({color: 0xc9c3b6, side: THREE.DoubleSide});
    [[-110, 0], [L - 120, L + 130]].forEach(([z0, z1]) => {
      const g = new THREE.Group(); g.position.set(7.8, 0, z0);
      const hf = s2 => fyH(z0 + s2), len = z1 - z0;
      g.add(rampStrip(5.4, len, hf, 0, deckMat, segs, 0.08));
      [-2.75, 2.75].forEach(x => g.add(rampWall(len, hf, x, 1.0, wallM, segs)));
      group.add(g);
    });
    const tex = makeSignTexture([nh + '  ·  ' + to.en + '  ' + realKm + ' km', to.nt + '  ·  ' + (HINDI[to.id] || '')], '#0d6b3a', '#fff', 1024, 240);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide})); bd.rotation.y = Math.PI; bd.position.set(7.8, 7 + 5.2, -40 - 30); group.add(bd);
    const tex2 = makeSignTexture(['Welcome to ' + to.en, to.nt], '#0d6b3a', '#fff', 768, 220);
    const bd2 = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), new THREE.MeshBasicMaterial({map: tex2, side: THREE.DoubleSide})); bd2.rotation.y = Math.PI; bd2.position.set(7.8, 7 + 4.6, L - 30); group.add(bd2);
  }
  W.roadAt = (x, z) => ({name: [nh + ' · ' + to.en, (W.KL ? 'ദേശീയ പാത ' : 'தேசிய நெடுஞ்சாலை ') + nh.split(' ')[1]]});

  // ---- road surface (repeating texture)
  const roadTex = hwTex(256, 512, (x, w, h) => {
    const sx = v => (v + 10.6) / 21.2 * w;
    x.fillStyle = '#6b6b63'; x.fillRect(0,0,w,h);
    x.fillStyle = '#45464b'; x.fillRect(sx(-10), 0, sx(-0.8)-sx(-10), h); x.fillRect(sx(0.8), 0, sx(10)-sx(0.8), h);
    for (let i = 0; i < 400; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.06)'; x.fillRect(Math.random()*w, Math.random()*h, 2, 2); }
    x.fillStyle = '#f2f2f2'; [-4.5, 4.5].forEach(v => { for (let y = 0; y < h; y += 128) x.fillRect(sx(v)-1.5, y, 3, 64); });
    x.fillStyle = '#f2c21b'; [-9.6, 9.6].forEach(v => x.fillRect(sx(v)-2, 0, 4, h));
    x.fillStyle = '#f2f2f2'; [-1.1, 1.1].forEach(v => x.fillRect(sx(v)-1.5, 0, 3, h));
    x.fillStyle = '#5e8a3a'; x.fillRect(sx(-0.7), 0, sx(0.7)-sx(-0.7), h);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, (L + 400) / 40);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(21.2, L + 400), new THREE.MeshLambertMaterial({map: roadTex}));
  road.rotation.x = -Math.PI/2; road.position.set(0, 0.02, L/2); group.add(road);
  const groundCol = from.st === 'KL' ? 0x4f8a33 : 0x8f9a4a;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, L + 1400), new THREE.MeshLambertMaterial({color: groundCol})); ground.rotation.x = -Math.PI/2; ground.position.set(0, 0, L/2); group.add(ground);
  // paddy / field patches
  const fieldG = new THREE.PlaneGeometry(1, 1);
  const fields = new THREE.InstancedMesh(fieldG, new THREE.MeshLambertMaterial({color: 0xffffff}), 160);
  const dm = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < 160; i++) {
    const side = R() < 0.5 ? -1 : 1; const x0 = side * (40 + R()*260), z0 = -200 + R()*(L+400);
    dm.position.set(x0, 0.03, z0); dm.rotation.set(-Math.PI/2, 0, 0); dm.scale.set(40 + R()*60, 30 + R()*60, 1); dm.updateMatrix(); fields.setMatrixAt(i, dm.matrix);
    fields.setColorAt(i, col.setHex([0x7cc04a, 0x5fae3e, 0x9bbf4a, 0xb9a46a, 0x6aa84f][Math.floor(R()*5)]));
  }
  fields.frustumCulled = false; group.add(fields);
  // median barrier with shrubs, street lights
  const med = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, L + 400), mat(0xd8d8d0)); med.position.set(0, 0.38, L/2); group.add(med);
  const shrubN = Math.floor((L + 400) / 9);
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.8, 0), mat(0x3f8a3a), shrubN);
  for (let i = 0; i < shrubN; i++) { dm.position.set((i%2 ? 0.35 : -0.35), 1.0, -200 + i*9); dm.rotation.set(R(), R(), R()); dm.scale.setScalar(0.7 + R()*0.5); dm.updateMatrix(); shrubs.setMatrixAt(i, dm.matrix); }
  shrubs.frustumCulled = false; group.add(shrubs);
  const lampN = Math.floor(L / 60);
  const lampPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 9, 6).translate(0, 4.5, 0), mat(0x8a8a8a), lampN);
  const lampArms = new THREE.InstancedMesh(new THREE.BoxGeometry(4.2, 0.15, 0.3), mat(0x8a8a8a), lampN);
  for (let i = 0; i < lampN; i++) { dm.position.set(0, 0, i*60 + 30); dm.rotation.set(0,0,0); dm.scale.set(1,1,1); dm.updateMatrix(); lampPoles.setMatrixAt(i, dm.matrix); dm.position.y = 9; dm.updateMatrix(); lampArms.setMatrixAt(i, dm.matrix); }
  lampPoles.frustumCulled = lampArms.frustumCulled = false; group.add(lampPoles, lampArms);
  // roadside trees
  const treeN = Math.floor(L / 7);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 1, 5).translate(0, 0.5, 0), mat(0x7a5a3a), treeN);
  const crowns = new THREE.InstancedMesh(from.st === 'KL' ? new THREE.ConeGeometry(2.4, 1.3, 7) : new THREE.IcosahedronGeometry(2.6, 0), new THREE.MeshLambertMaterial({color: 0xffffff}), treeN);
  for (let i = 0; i < treeN; i++) {
    const side = R() < 0.5 ? -1 : 1; const x0 = side * (14 + R()*70), z0 = -150 + R()*(L+300);
    if (x0 > 9 && x0 < 32 && pads.some(p => Math.abs(z0 - p) < 30)) continue;
    const h = from.st === 'KL' ? 6 + R()*6 : 3 + R()*3;
    dm.position.set(x0, 0, z0); dm.rotation.set(0,0,0); dm.scale.set(1, h, 1); dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
    dm.position.set(x0, h + (from.st === 'KL' ? -0.2 : 1.4), z0); dm.rotation.set(0, R()*6, 0); dm.scale.setScalar(from.st === 'KL' ? 1 : 0.9 + R()*0.5); dm.updateMatrix(); crowns.setMatrixAt(i, dm.matrix);
    crowns.setColorAt(i, col.setHex([0x2e7d32, 0x3f8f3a, 0x356b28, 0x4a8a33][i % 4]));
  }
  trunks.frustumCulled = crowns.frustumCulled = false; group.add(trunks, crowns);
  // hills in the distance
  for (let i = 0; i < 24; i++) { const side = i % 2 ? -1 : 1; const hh = 60 + R()*140; const hm = new THREE.Mesh(new THREE.ConeGeometry(hh*1.7, hh, 7), mat(from.st === 'KL' ? 0x3d7a3a : 0x8b8a5a)); hm.position.set(side*(350 + R()*300), hh/2 - 2, -300 + R()*(L+600)); group.add(hm); }

  // ---- gantries
  const gantry = (z, tex, w, h) => {
    const g = new THREE.Group(); g.position.set(0, 0, z);
    [-11, 11].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 9, 8), mat(0x9a9a9a)); p.position.set(x, 4.5, 0); g.add(p); });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.6, 0.6), mat(0x9a9a9a)); beam.position.set(0, 8.4, 0.2); g.add(beam);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex})); board.rotation.y = Math.PI; board.position.set(0, 8.2 - h/2 + 1.6, -0.15); g.add(board);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(0x5a5a5a)); back.position.set(0, 8.2 - h/2 + 1.6, 0.0); g.add(back);
    group.add(g);
  };
  const hiOf = c => HINDI[c.id] || c.en;
  // district boards at each district boundary (and one at the start)
  W.zones.forEach((zn, i) => {
    const next = W.stops[i+1], after = W.stops[i+2];
    const cols = [];
    if (i > 0 && i < W.stops.length - 1) cols.push({nt: zn.c.nt, hi: hiOf(zn.c), en: zn.c.en, km: null, arrow: 'left'});
    if (next) cols.push({nt: next.c.nt, hi: hiOf(next.c), en: next.c.en, km: Math.max(1, Math.round((next.t*L - (zn.z+60)) / L * realKm)), arrow: 'up'});
    if (!next || next.c !== to) cols.push({nt: to.nt, hi: hiOf(to), en: to.en, km: kmAt(zn.z + 60), arrow: 'up'});
    if (cols.length < 3 && after && after.c !== to) cols.splice(cols.length-1, 0, {nt: after.c.nt, hi: hiOf(after.c), en: after.c.en, km: Math.round((after.t*L - (zn.z+60)) / L * realKm), arrow: 'up'});
    gantry(zn.z + 60, districtBoardTex(nh, cols.slice(0,3), zn.c.st), 20, 6.6);
  });
  if (W.border) gantry(W.border.z, stateBoardTex(W.border.st, nh), 20, 5);

  // ---- exits to towns along the way
  W.stops.slice(1, -1).forEach(s => {
    const z = Math.round(s.t * L);
    W.exits.push({c: s.c, z});
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(9, 95), mat(0x4b4b50)); slip.rotation.x = -Math.PI/2; slip.position.set(14.5, 0.025, z - 22); group.add(slip);
    const tex = makeSignTexture(['EXIT  ' + s.c.en, s.c.nt + '  ·  ' + hiOf(s.c)], '#0d6b3a', '#fff', 768, 200);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.9), new THREE.MeshBasicMaterial({map: tex})); sg.rotation.y = Math.PI; sg.position.set(13, 4.2, z - 90); group.add(sg);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 5), mat(0x888888)); post.position.set(13, 2, z - 89.9); group.add(post);
    // a few town buildings around the exit
    for (let k = 0; k < 14; k++) {
      const bw = 7 + R()*5, bh = 3.2*(1 + Math.floor(R()*3)), bx = (R() < 0.6 ? 1 : -1) * (26 + R()*50), bz = z - 60 + R()*140;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), mat([0xf4efe0,0xcfe8f3,0xf6d6d6,0xf7e8a6,0xd6f0d8][k%5])); b.position.set(bx, bh/2, bz); group.add(b);
      if (s.c.st === 'KL' && R() < 0.6) { const rf = new THREE.Mesh(new THREE.ConeGeometry(bw*0.75, 2, 4), mat(0xb5482f)); rf.rotation.y = Math.PI/4; rf.position.set(bx, bh + 1, bz); group.add(rf); }
    }
  });

  // ---- toll plazas and the state border check post
  W.tolls = [];
  const tollAt = [0.42]; if (L > 2600) tollAt.push(0.8);
  tollAt.forEach(f => {
    let z = Math.round(L*f);
    for (let k = 0; k < 8 && (W.exits.some(e => Math.abs(e.z - z) < 170) || (W.border && Math.abs(W.border.z - z) < 220) || W.cams.some(c => Math.abs(c.z - z) < 60)); k++) z += 90;
    if (z > L - 200) return;
    W.tolls.push(buildTollPlaza(W, z, false));
  });
  if (W.border) W.tolls.push(buildTollPlaza(W, W.border.z + 70, true));

  // ---- petrol pumps along the way (left side, our direction)
  for (let z = 420; z < L - 200; z += 650 + Math.floor(R()*200)) {
    if (W.exits.some(e => Math.abs(e.z - z) < 140) || (W.border && Math.abs(W.border.z - z) < 160) || W.tolls.some(t => Math.abs(t.z - z) < 120)) continue;
    pads.push(z);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(20, 44), mat(0x8b8b8b)); pad.rotation.x = -Math.PI/2; pad.position.set(20, 0.03, z); group.add(pad);
    const p = {type:'petrol', en:'Highway Fuels', nt: W.KL ? 'ഹൈവേ ഫ്യൂവൽസ്' : 'ஹைவே ஃப்யூயல்ஸ்', tx:0, tz:0, d:[-1,0], x: 22, z, stop: {x: 14, z}, holy: false, col: '#d35400'};
    W.pois.push(p);
    buildPOI(W, p);
  }
  // ---- km stones every ~250 m
  for (let z = 120; z < L - 60; z += 250) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.25), new THREE.MeshBasicMaterial({map: kmStoneTex(to.en, kmAt(z))}));
    st.rotation.y = Math.PI; st.position.set(11.6, 0.5, z); group.add(st);
  }
  // ---- speed cameras (100 km/h)
  [0.35, 0.7].forEach(f => { const z = Math.round(L*f); W.cams.push({x: 4.5, z, px: 10.8, pz: z, h: false, last: -99});
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 5), mat(0x555555)); p.position.set(10.8, 2.5, z); group.add(p);
    const b = new THREE.Mesh(boxGeo(0.6, 0.5, 0.8), mat(0x222222)); b.position.set(10.8, 5, z); group.add(b);
    const tex = makeSignTexture(['100', 'km/h'], '#ffffff', '#c0392b', 128, 128); const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: tex})); s.rotation.y = Math.PI; s.position.set(10.8, 3.6, z - 0.3); group.add(s);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({color: 0xff0000})); led.position.set(10.8, 5.3, z); group.add(led); W.cams[W.cams.length-1].led = led; });

  // ---- traffic lanes (left-hand traffic: our way on +x side)
  W.roadLines = [
    {axis:'z', fixed: 0.5, idx: -99, min: -120, max: L + 120, dirFixed: 1, name: [nh, nh]},
    {axis:'z', fixed: 3.9, idx: -98, min: -120, max: L + 120, dirFixed: 1, name: [nh, nh]},
    {axis:'z', fixed: -0.5, idx: -97, min: -120, max: L + 120, dirFixed: -1, name: [nh, nh]},
    {axis:'z', fixed: -3.9, idx: -96, min: -120, max: L + 120, dirFixed: -1, name: [nh, nh]},
  ];
  return W;
}

// Toll plaza (or state border check post) across the highway at z
function buildTollPlaza(W, z, border){
  const g = new THREE.Group(); g.position.set(0, 0, z); W.group.add(g);
  const KL = border ? W.border.st === 'KL' : W.KL;
  const islands = border ? [10.9] : [5.9, 10.9];
  // canopy over both carriageways
  const roofC = border ? 0x1f3a93 : 0xc0392b;
  addBox(g, 24, 0.8, 9, mat(roofC), 0, 6.6, 0);
  addBox(g, 24.2, 0.25, 9.2, mat(0xf4f4f0), 0, 7.1, 0);
  [-11.8, -5.9, 5.9, 11.8].forEach(x => addBox(g, 0.5, 6.6, 0.5, mat(0xd8d8d0), x, 3.3, 0));
  // booths on islands (our side and the other side)
  [...islands, -5.9, -10.9].forEach(x => {
    addBox(g, 1.8, 0.3, 9, mat(0xf2c21b), x, 0.15, 0);
    for (let k = -4; k <= 4; k += 1) addBox(g, 1.82, 0.31, 0.5, mat(0x222222), x, 0.16, k);
    addBox(g, 1.5, 2.6, 2.4, mat(0xf4efe0), x, 1.6, 0.8);
    addBox(g, 1.52, 0.9, 1.6, mat(0x5dade2), x, 2.2, 0.8);
    const lt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), new THREE.MeshBasicMaterial({color: 0x22cc44})); lt.position.set(x - 0.2, 5.6, -4.2); g.add(lt);
  });
  // boom barriers for our lanes
  const lanes = border ? [{x0: 0.8, x1: 10.0, cx: 5.4}] : [{x0: 0.8, x1: 5.0, cx: 2.9}, {x0: 6.8, x1: 10.0, cx: 8.4}];
  const pivX = border ? [10.9] : [5.9, 10.9];
  lanes.forEach((ln, i) => {
    const px = pivX[i];
    const pivot = new THREE.Group(); pivot.position.set(px - 0.9, 1.05, -3.2); g.add(pivot);
    const arm = new THREE.Group(); pivot.add(arm);
    const len = px - 0.9 - ln.x0;
    const nseg = Math.max(3, Math.round(len/1.1));
    for (let k = 0; k < nseg; k++) { const seg = new THREE.Mesh(boxGeo(len/nseg, 0.14, 0.14), mat(k%2 ? 0xd91e18 : 0xffffff)); seg.position.set(-(k + 0.5)*len/nseg, 0, 0); arm.add(seg); }
    ln.pivot = pivot; ln.arm = arm; ln.ang = 0; ln.broken = false;
  });
  // sign on the canopy facing traffic
  const hi = border ? (KL ? 'केरल चेक पोस्ट' : 'तमिलनाडु चेक पोस्ट') : 'टोल प्लाज़ा';
  const lines = border
    ? [(KL ? 'KERALA' : 'TAMIL NADU') + ' CHECK POST · STOP', (KL ? 'കേരള ചെക്ക് പോസ്റ്റ്' : 'தமிழ்நாடு சோதனைச் சாவடி') + ' · ' + hi]
    : ['TOLL PLAZA · ' + W.nh + ' · STOP & PAY', (W.KL ? 'ടോൾ പ്ലാസ' : 'சுங்கச் சாவடி') + ' · ' + hi];
  const tex = makeSignTexture(lines, border ? '#1f3a93' : '#c0392b', '#ffffff', 1024, 200);
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.4), new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide}));
  sb.rotation.y = Math.PI; sb.position.set(0, 6.6, -4.65); g.add(sb);
  // rumble strips & STOP marking
  for (let k = 0; k < 5; k++) addBox(g, 9.6, 0.05, 0.5, mat(0xf2f2f2), 5.5, 0.04, -12 - k*2.2);
  const offs = [];
  if (border) {
    // police at the check post
    for (let k = 0; k < 3; k++) { const o = makePerson(0xb08d57, 0x8a6d3b, 0x6b4430); o.position.set(11.8 + (k%2)*0.8, 0, -6 + k*1.6); o.rotation.y = -Math.PI/2; g.add(o); offs.push({mesh: o, x: 11.8, z: z - 6 + k*1.6}); }
    const jeep = makeVehicle('police', {len:4.4, wid:1.8, id:'police'}, null); jeep.position.set(14.5, 0, 8); jeep.rotation.y = Math.PI; g.add(jeep);
    // drums
    for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10), mat(k%2 ? 0xffffff : 0xd91e18)); d.position.set(k < 2 ? 1.1 : 10.1, 0.45, -14 - (k%2)*4); g.add(d); }
  }
  return {z, border, st: border ? W.border.st : null, lanes, islands, offs, paid: false, passed: false, stopT: 0, fee: 0};
}
