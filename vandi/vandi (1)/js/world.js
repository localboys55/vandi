// Vandi — procedural town generation for each district headquarters
'use strict';

const T = 14, HALF = 7, ROAD_HALF = 4.6;
const ROAD = 1, BUILD = 2, GRASS = 3, WATER = 5, PUMP = 6;

function hashStr(s){ let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// Shared textures
const TEX = {};
function windowTextures() {
  if (TEX.win) return TEX;
  const mk = (lit) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = lit ? '#000' : '#fff'; x.fillRect(0,0,64,64);
    x.fillStyle = lit ? '#ffd27a' : '#3c4a55'; x.fillRect(18,16,28,30);
    if (!lit) { x.fillStyle = '#d8d2c4'; x.fillRect(15,46,34,4); x.fillStyle='#55636e'; x.fillRect(31,16,2,30); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  TEX.win = mk(false); TEX.winLit = mk(true);
  return TEX;
}
function boxForFloors(floors) {
  const g = new THREE.BoxGeometry(1,1,1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i/4);
    if (face === 2 || face === 3) uv.setXY(i, 0.05, 0.05);
    else uv.setXY(i, uv.getX(i)*2, uv.getY(i)*floors);
  }
  g.translate(0,0.5,0);
  return g;
}

function makeSignTexture(lines, bg, fg, w, h) {
  const c = document.createElement('canvas'); c.width = w || 512; c.height = h || 160;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0,0,c.width,c.height);
  x.strokeStyle = '#f4d03f'; x.lineWidth = 8; x.strokeRect(6,6,c.width-12,c.height-12);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((ln, i) => {
    let size = i === 0 ? 52 : 44;
    x.font = (i===0?'800 ':'700 ') + size + 'px "Baloo Chettan 2","Baloo Thambi 2","Noto Sans Tamil","Noto Sans Malayalam",sans-serif';
    while (x.measureText(ln).width > c.width - 40 && size > 16) { size -= 2; x.font = (i===0?'800 ':'700 ') + size + 'px "Baloo Chettan 2","Baloo Thambi 2","Noto Sans Tamil","Noto Sans Malayalam",sans-serif'; }
    x.fillText(ln, c.width/2, c.height*(i+0.5)/n + (n===1?0:(i===0?6:-6)));
  });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return t;
}

function buildTown(city, scene, opts) {
  const R = mulberry(hashStr(city.id));
  const KL = city.st === 'KL';
  const N = city.big ? 46 : 36;
  const W = {city, N, KL, R, group: new THREE.Group(), pois: [], busStops: [], signals: [], cams: [], roadLines: [], lamps: []};
  scene.add(W.group);
  const tiles = new Uint8Array(N*N);
  W.tiles = tiles;
  const waterRows = city.coast ? 3 : 0;
  const maxRoad = N - 1 - waterRows - (city.coast ? 1 : 0);

  // road grid with irregular spacing
  const rows = [0], cols = [0];
  while (rows[rows.length-1] < maxRoad - 4) rows.push(rows[rows.length-1] + 4 + Math.floor(R()*3));
  if (rows[rows.length-1] !== maxRoad) rows.push(maxRoad);
  while (cols[cols.length-1] < N - 5) cols.push(cols[cols.length-1] + 4 + Math.floor(R()*3));
  if (cols[cols.length-1] !== N-1) cols.push(N-1);
  W.rows = rows; W.cols = cols;
  const rowSet = new Set(rows), colSet = new Set(cols);

  for (let tz = 0; tz < N; tz++) for (let tx = 0; tx < N; tx++) {
    let t;
    if (tz >= N - waterRows) t = WATER;
    else if (tz > maxRoad) t = GRASS;
    else if (rowSet.has(tz) || colSet.has(tx)) t = ROAD;
    else t = R() < 0.84 ? BUILD : GRASS;
    tiles[tz*N+tx] = t;
  }
  const tileAt = (tx,tz) => (tx<0||tz<0||tx>=N||tz>=N) ? WATER : tiles[tz*N+tx];
  W.tileAt = tileAt;
  const isRoad = (tx,tz) => tileAt(tx,tz) === ROAD;
  W.isRoad = isRoad;
  W.isInter = (tx,tz) => rowSet.has(tz) && colSet.has(tx) && isRoad(tx,tz);

  // road lines for traffic
  rows.forEach(r => W.roadLines.push({axis:'x', fixed:r*T, idx:r, min:0, max:(N-1)*T}));
  cols.forEach(c => W.roadLines.push({axis:'z', fixed:c*T, idx:c, min:0, max:maxRoad*T}));
  { const pool = (ROADS_CITY[city.id] || []).slice(); const gen = ROADS_GENERIC[city.st].slice().sort(() => R()-0.5);
    gen.forEach(g => { if (!pool.some(p => p[0] === g[0])) pool.push(g); });
    let k = 0; W.roadLines.forEach(l => { l.name = pool[k % pool.length]; if (k >= pool.length) l.name = [l.name[0] + ' ' + (Math.floor(k/pool.length)+1), l.name[1] + ' ' + (Math.floor(k/pool.length)+1)]; k++; }); }
  W.roadAt = (x, z, h) => {
    const tx = Math.round(x/T), tz = Math.round(z/T);
    const onRow = rowSet.has(tz) && Math.abs(z - tz*T) < HALF+1, onCol = colSet.has(tx) && Math.abs(x - tx*T) < HALF+1;
    const alongX = Math.abs(Math.sin(h||0)) > 0.7;
    if (onRow && (!onCol || alongX)) return W.roadLines.find(l => l.axis === 'x' && l.idx === tz);
    if (onCol) return W.roadLines.find(l => l.axis === 'z' && l.idx === tx);
    return null;
  };

  // signals at interior intersections (some)
  rows.slice(1,-1).forEach((r,i) => cols.slice(1,-1).forEach((c,j) => { if ((i+j)%2===0) W.signals.push({tx:c, tz:r, grp:(i+j)%4===0?0:1}); }));
  W.sigSet = new Set(W.signals.map(s => s.tx+','+s.tz));

  // --- Points of interest
  const want = ['busstand','temple','church','mosque','museum','rto','police','hospital','carshow','autoshow','taxishow','busshow','petrol','restaurant','restaurant','tea','textiles','bakery','school','market'];
  if (city.big) want.push('mall','college','rail','restaurant','petrol');
  else if (R() < 0.6) want.push('rail');
  const cand = [];
  for (let tz = 1; tz < N-1; tz++) for (let tx = 1; tx < N-1; tx++) {
    if (tileAt(tx,tz) !== BUILD) continue;
    const ds = [[0,-1],[0,1],[-1,0],[1,0]].filter(([dx,dz]) => isRoad(tx+dx,tz+dz) && !W.isInter(tx+dx,tz+dz));
    if (ds.length) cand.push({tx,tz,d:ds[Math.floor(R()*ds.length)]});
  }
  // shuffle
  for (let i = cand.length-1; i > 0; i--) { const j = Math.floor(R()*(i+1)); [cand[i],cand[j]] = [cand[j],cand[i]]; }
  const used = [];
  const bizCount = {};
  want.forEach(type => {
    // bus stand near centre
    let best = null;
    for (const c of cand) {
      if (used.some(u => Math.abs(u.tx-c.tx)+Math.abs(u.tz-c.tz) < (type==='busstand'?2:4))) continue;
      if (type === 'busstand' && (Math.abs(c.tx-N/2)+Math.abs(c.tz-N/2)) > N*0.35) continue;
      best = c; break;
    }
    if (!best) return;
    used.push(best);
    const pt = PLACE_TYPES[type];
    let en = pt.en, nt = pt[city.st];
    if (BIZ_NAMES[type]) {
      const list = BIZ_NAMES[type]; const k = (bizCount[type] = (bizCount[type]||0)) ; bizCount[type]++;
      const b = list[(hashStr(city.id+type)+k) % list.length];
      en = b[0]; nt = KL ? b[1] : b[2];
    } else if (type === 'temple' || type === 'church' || type === 'mosque' || type === 'museum' || type === 'busstand' || type === 'rail' || type === 'police' || type === 'hospital') {
      en = city.en + ' ' + pt.en; nt = (KL ? city.nt + ' ' : city.nt + ' ') + pt[city.st];
    }
    const roadC = {x:(best.tx+best.d[0])*T, z:(best.tz+best.d[1])*T};
    const stop = {x: roadC.x - best.d[0]*3.2, z: roadC.z - best.d[1]*3.2};
    const poi = {type, en, nt, tx:best.tx, tz:best.tz, d:best.d, x:best.tx*T, z:best.tz*T, stop, holy:!!pt.holy, col:pt.col};
    if (type === 'petrol') tiles[best.tz*N+best.tx] = PUMP;
    W.pois.push(poi);
  });
  W.poiBy = t => W.pois.filter(p => p.type === t);

  // bus stops along roads
  const straight = [];
  for (let tz = 0; tz <= maxRoad; tz++) for (let tx = 0; tx < N; tx++) {
    if (!isRoad(tx,tz) || W.isInter(tx,tz)) continue;
    const h = isRoad(tx-1,tz) && isRoad(tx+1,tz) && !isRoad(tx,tz-1) && !isRoad(tx,tz+1);
    const v = isRoad(tx,tz-1) && isRoad(tx,tz+1) && !isRoad(tx-1,tz) && !isRoad(tx+1,tz);
    if (h || v) straight.push({tx,tz,h});
  }
  W.straight = straight;
  const bsPick = straight.slice().sort(() => R()-0.5);
  for (const s of bsPick) {
    if (W.busStops.length >= 6) break;
    if (W.busStops.some(b => Math.abs(b.tx-s.tx)+Math.abs(b.tz-s.tz) < 8)) continue;
    if (W.pois.some(p => Math.abs(p.tx-s.tx)+Math.abs(p.tz-s.tz) < 2)) continue;
    const side = R() < 0.5 ? -1 : 1;
    const bx = s.tx*T + (s.h ? 0 : side*3.2), bz = s.tz*T + (s.h ? side*3.2 : 0);
    W.busStops.push({tx:s.tx, tz:s.tz, h:s.h, side, x:bx, z:bz, name:['Junction','Stop','Kavala','Corner','Nagar','Road'][W.busStops.length]});
  }
  // speed cameras
  straight.slice().sort(() => R()-0.5).slice(0, city.big ? 6 : 4).forEach(s => {
    const cx = s.tx*T + (s.h ? 0 : 6.2), cz = s.tz*T + (s.h ? -6.2 : 0);
    W.cams.push({x:s.tx*T, z:s.tz*T, px:cx, pz:cz, h:s.h, last:-99});
  });

  // spawn: road in front of bus stand
  const bs = W.poiBy('busstand')[0] || W.pois[0];
  W.spawn = bs ? {x: bs.stop.x + bs.d[0]*-0.5, z: bs.stop.z, h: Math.atan2(bs.d[1]===0?0:1, bs.d[0]===0?0:1)} : {x:0,z:T,h:0};
  if (bs) { // face along the road
    W.spawn.h = bs.d[0] === 0 ? Math.PI/2 : 0;
  }

  // --- surface & collisions
  W.surfaceAt = (x,z) => tileAt(Math.round(x/T), Math.round(z/T));
  W.collide = (px, pz, r) => {
    let hit = false;
    const tx0 = Math.round(px/T), tz0 = Math.round(pz/T);
    for (let dz=-1; dz<=1; dz++) for (let dx=-1; dx<=1; dx++) {
      const tx = tx0+dx, tz = tz0+dz, t = tileAt(tx,tz);
      if (t !== BUILD && t !== WATER) continue;
      const m = (t === WATER) ? HALF : HALF - 1.3;
      const cx = tx*T, cz = tz*T;
      const qx = Math.max(cx-m, Math.min(px, cx+m)), qz = Math.max(cz-m, Math.min(pz, cz+m));
      let ddx = px-qx, ddz = pz-qz; const d2 = ddx*ddx+ddz*ddz;
      if (d2 < r*r) {
        hit = true;
        if (d2 > 1e-6) { const d = Math.sqrt(d2); px = qx + ddx/d*r; pz = qz + ddz/d*r; }
        else { const opts2 = [[cx-m-r, pz],[cx+m+r, pz],[px, cz-m-r],[px, cz+m+r]]; let bd=1e9, bp=null; opts2.forEach(o=>{const dd=Math.abs(o[0]-px)+Math.abs(o[1]-pz); if(dd<bd){bd=dd;bp=o;}}); px=bp[0]; pz=bp[1]; }
      }
    }
    return {x:px, z:pz, hit};
  };

  drawGround(W);
  buildScenery(W, opts);
  return W;
}

function drawGround(W) {
  const {N, tileAt, isRoad, KL} = W;
  const size = 2048, S = size/(N*T);
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const x = cv.getContext('2d');
  const R = mulberry(hashStr(W.city.id+'g'));
  x.fillStyle = KL ? '#5f9a3a' : '#8f9a4a'; x.fillRect(0,0,size,size);
  const px = v => v*S;
  for (let tz = 0; tz < N; tz++) for (let tx = 0; tx < N; tx++) {
    const t = tileAt(tx,tz), X = tx*T*S, Z = tz*T*S, s = T*S;
    if (t === GRASS) { x.fillStyle = KL ? '#5e9b37' : '#93a04c'; x.fillRect(X,Z,s,s); for (let i=0;i<6;i++){ x.fillStyle = KL?'rgba(40,90,30,.35)':'rgba(120,110,50,.35)'; x.beginPath(); x.arc(X+R()*s, Z+R()*s, 2+R()*5, 0, 7); x.fill(); } }
    else if (t === BUILD) { x.fillStyle = KL ? '#b98a64' : '#c9a878'; x.fillRect(X,Z,s,s); }
    else if (t === WATER) { x.fillStyle = W.city.coast && !KL ? '#2a6f9a' : '#2e7280'; x.fillRect(X,Z,s,s); x.strokeStyle='rgba(255,255,255,.18)'; for(let i=0;i<4;i++){x.beginPath(); const yy=Z+R()*s; x.moveTo(X+R()*s*0.3,yy); x.lineTo(X+s*0.6+R()*s*0.4,yy); x.stroke();} }
    else if (t === PUMP) { x.fillStyle = '#8b8b8b'; x.fillRect(X,Z,s,s); }
    else if (t === ROAD) {
      x.fillStyle = '#b5aea2'; x.fillRect(X,Z,s,s);
      const cx = X+s/2, cz = Z+s/2, rh = ROAD_HALF*S;
      x.fillStyle = '#4b4b50';
      x.fillRect(cx-rh, cz-rh, rh*2, rh*2);
      if (isRoad(tx-1,tz) || tileAt(tx-1,tz)===PUMP) x.fillRect(X, cz-rh, s/2, rh*2);
      if (isRoad(tx+1,tz) || tileAt(tx+1,tz)===PUMP) x.fillRect(cx, cz-rh, s/2, rh*2);
      if (isRoad(tx,tz-1) || tileAt(tx,tz-1)===PUMP) x.fillRect(cx-rh, Z, rh*2, s/2);
      if (isRoad(tx,tz+1) || tileAt(tx,tz+1)===PUMP) x.fillRect(cx-rh, cz, rh*2, s/2);
      for (let k = 0; k < 90; k++) { x.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.07)'; x.fillRect(cx-rh+R()*rh*2, cz-rh+R()*rh*2, 1+R()*2, 1+R()*2); }
      if (R() < 0.15) { x.fillStyle = 'rgba(30,30,32,.5)'; x.beginPath(); x.ellipse(cx+(R()-0.5)*rh, cz+(R()-0.5)*rh, 3+R()*6, 2+R()*4, R()*3, 0, 7); x.fill(); }
      const h = isRoad(tx-1,tz) && isRoad(tx+1,tz) && !isRoad(tx,tz-1) && !isRoad(tx,tz+1);
      const v = isRoad(tx,tz-1) && isRoad(tx,tz+1) && !isRoad(tx-1,tz) && !isRoad(tx+1,tz);
      const kerb = (x0,y0,w,hh,horiz) => { const n = Math.floor((horiz?w:hh)/4); for (let k=0;k<n;k++){ x.fillStyle = k%2 ? '#f2c21b' : '#1b1b1b'; horiz ? x.fillRect(x0+k*4,y0,4,hh) : x.fillRect(x0,y0+k*4,w,4); } };
      if (h) { kerb(X, cz-rh-2.5, s, 2.5, true); kerb(X, cz+rh, s, 2.5, true); }
      if (v) { kerb(cx-rh-2.5, Z, 2.5, s, false); kerb(cx+rh, Z, 2.5, s, false); }
      x.fillStyle = '#e9e4d0';
      if (h) for (let k=0;k<3;k++) x.fillRect(X+k*s/3+2, cz-1, s/6, 2);
      if (v) for (let k=0;k<3;k++) x.fillRect(cx-1, Z+k*s/3+2, 2, s/6);
      x.fillStyle = 'rgba(240,200,60,.8)';
      if (h) { x.fillRect(X, cz-rh, s, 1.5); x.fillRect(X, cz+rh-1.5, s, 1.5); }
      if (v) { x.fillRect(cx-rh, Z, 1.5, s); x.fillRect(cx+rh-1.5, Z, 1.5, s); }
    }
  }
  // zebra crossings at signals
  x.fillStyle = '#efefe6';
  W.signals.forEach(sg => {
    const cx = sg.tx*T*S + T*S/2, cz = sg.tz*T*S + T*S/2, off = (HALF+1.5)*S, rh = ROAD_HALF*S;
    for (let k = -rh+2; k < rh-2; k += 4) {
      x.fillRect(cx+off-3, cz+k, 6, 2); x.fillRect(cx-off-3, cz+k, 6, 2);
      x.fillRect(cx+k, cz+off-3, 2, 6); x.fillRect(cx+k, cz-off-3, 2, 6);
    }
  });
  W.groundCanvas = cv;
  // minimap base
  const mm = document.createElement('canvas'); mm.width = mm.height = 512;
  const m = mm.getContext('2d'); m.drawImage(cv, 0, 0, 512, 512);
  const ms = 512/(N*T);
  W.pois.forEach(p => { m.fillStyle = p.col; m.fillRect((p.x+HALF)*ms-5, (p.z+HALF)*ms-5, 10, 10); m.strokeStyle='#fff'; m.lineWidth=1.5; m.strokeRect((p.x+HALF)*ms-5,(p.z+HALF)*ms-5,10,10); });
  W.miniCanvas = mm;
}

function buildScenery(W, opts) {
  const {N, tileAt, R, KL, group} = W;
  const size = N*T;
  const tex = new THREE.CanvasTexture(W.groundCanvas);
  tex.anisotropy = opts.aniso || 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({map:tex}));
  ground.rotation.x = -Math.PI/2; ground.position.set(size/2-HALF, 0, size/2-HALF);
  group.add(ground);
  // outer land
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(size*5, size*5), new THREE.MeshLambertMaterial({color: KL ? 0x4f8a33 : 0x8a9445}));
  outer.rotation.x = -Math.PI/2; outer.position.set(size/2-HALF, -0.05, size/2-HALF); group.add(outer);
  if (W.city.coast) {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(size*5, size*2), new THREE.MeshLambertMaterial({color:0x2e7280}));
    sea.rotation.x = -Math.PI/2; sea.position.set(size/2, -0.02, size - HALF*2 + size); group.add(sea);
  }
  // hills around
  const hillM = new THREE.MeshLambertMaterial({color: W.city.hill ? 0x3d7a3a : (KL ? 0x4b8a3e : 0x8b8a5a)});
  const hillCount = W.city.hill ? 26 : 10;
  for (let i = 0; i < hillCount; i++) {
    const a = R()*Math.PI*2, d = size*0.9 + R()*size*0.6;
    const hx = size/2 + Math.cos(a)*d, hz = size/2 + Math.sin(a)*d;
    if (W.city.coast && hz > size) continue;
    const hh = (W.city.hill ? 90 : 35) + R()*(W.city.hill ? 120 : 40);
    const hm = new THREE.Mesh(new THREE.ConeGeometry(hh*1.6, hh, 7), hillM);
    hm.position.set(hx, hh/2-2, hz); group.add(hm);
  }

  // --- buildings (instanced by floor count)
  const {win, winLit} = windowTextures();
  W.winMats = [];
  const PAL_KL = [0xf4efe0,0xcfe8f3,0xf6d6d6,0xd6f0d8,0xf7e8a6,0xe8d9f3,0xffffff,0xf3d9b1];
  const PAL_TN = [0xf7e3a1,0xf4c2c2,0xbfe3f0,0xd5f5c6,0xf9d8a8,0xe6cff2,0xfff3e0,0xf6b8a0];
  const pal = KL ? PAL_KL : PAL_TN;
  const byFloors = {1:[],2:[],3:[],4:[]};
  const roofs = [], slabs = [], awn = [];
  const poiTiles = new Set(W.pois.map(p => p.tx+','+p.tz));
  const trees = [];
  for (let tz = 0; tz < N; tz++) for (let tx = 0; tx < N; tx++) {
    const t = tileAt(tx,tz), cx = tx*T, cz = tz*T;
    if (t === BUILD && !poiTiles.has(tx+','+tz)) {
      const central = 1 - (Math.abs(tx-N/2)+Math.abs(tz-N/2))/N;
      let floors = 1 + Math.floor(R()*(1.5 + central*3));
      if (W.city.big && R() < central*0.5) floors = Math.min(4, floors+1);
      floors = Math.max(1, Math.min(4, floors));
      const w = 7 + R()*3.6, d = 7 + R()*3.6, h = floors*3.2;
      const ox = (R()-0.5)*(10.8-w), oz = (R()-0.5)*(10.8-d);
      const col = pal[Math.floor(R()*pal.length)];
      byFloors[floors].push({x:cx+ox, z:cz+oz, w, d, h, col});
      const sloped = KL ? (floors <= 2 && R() < 0.75) : (floors === 1 && R() < 0.25);
      if (sloped) roofs.push({x:cx+ox, z:cz+oz, w:w+1.0, d:d+1.0, y:h, col:[0xb5482f,0xa63d28,0xc25a3a,0x8e3b26][Math.floor(R()*4)]});
      else slabs.push({x:cx+ox, z:cz+oz, w:w+0.3, d:d+0.3, y:h});
      if (R() < 0.4) { // shop awning facing a road
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]].filter(([dx,dz]) => W.isRoad(tx+dx,tz+dz));
        if (dirs.length) { const [dx,dz] = dirs[0]; awn.push({x:cx+ox+dx*(w/2+0.6), z:cz+oz+dz*(d/2+0.6), w: dx?1.2:w*0.9, d: dz?1.2:d*0.9, col:[0xc0392b,0x2874a6,0x229954,0xd68910][Math.floor(R()*4)]}); }
      }
      if (R() < 0.5) trees.push({x: cx + (R()<0.5?-1:1)*5.6, z: cz + (R()<0.5?-1:1)*5.6});
    } else if (t === GRASS) {
      const n = 2 + Math.floor(R()*3);
      for (let i = 0; i < n; i++) trees.push({x: cx + (R()-0.5)*11, z: cz + (R()-0.5)*11});
    }
  }
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let f = 1; f <= 4; f++) {
    const list = byFloors[f]; if (!list.length) continue;
    const m = new THREE.MeshLambertMaterial({map:win, emissiveMap:winLit, emissive:0xffffff, emissiveIntensity:0});
    W.winMats.push(m);
    const im = new THREE.InstancedMesh(boxForFloors(f), m, list.length);
    list.forEach((b,i) => { dummy.position.set(b.x,0,b.z); dummy.rotation.set(0,0,0); dummy.scale.set(b.w,b.h,b.d); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.setHex(b.col)); });
    im.frustumCulled = false; group.add(im);
  }
  if (roofs.length) {
    const g = new THREE.ConeGeometry(0.7071, 1, 4); g.rotateY(Math.PI/4); g.translate(0,0.5,0);
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({color:0xffffff}), roofs.length);
    roofs.forEach((r,i) => { dummy.position.set(r.x,r.y,r.z); dummy.rotation.set(0,0,0); dummy.scale.set(r.w,2.2,r.d); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix); im.setColorAt(i,col.setHex(r.col)); });
    im.frustumCulled = false; group.add(im);
  }
  if (slabs.length) {
    const g = new THREE.BoxGeometry(1,1,1); g.translate(0,0.5,0);
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({color:0xcfcac0}), slabs.length);
    slabs.forEach((r,i) => { dummy.position.set(r.x,r.y,r.z); dummy.rotation.set(0,0,0); dummy.scale.set(r.w,0.5,r.d); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix); });
    im.frustumCulled = false; group.add(im);
  }
  if (awn.length) {
    const g = new THREE.BoxGeometry(1,0.15,1);
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({color:0xffffff}), awn.length);
    awn.forEach((a,i) => { dummy.position.set(a.x,2.9,a.z); dummy.rotation.set(0,0,0); dummy.scale.set(a.w,1,a.d); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix); im.setColorAt(i,col.setHex(a.col)); });
    im.frustumCulled = false; group.add(im);
  }
  // trees: coconut palms in Kerala, palmyra + neem in Tamil Nadu
  if (trees.length) {
    const trunkG = new THREE.CylinderGeometry(0.16,0.26,1,5); trunkG.translate(0,0.5,0);
    const palmG = new THREE.ConeGeometry(2.4,1.3,7);
    const roundG = new THREE.IcosahedronGeometry(2.4, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat(0x7a5a3a), trees.length);
    const palms = [], rounds = [];
    trees.forEach((t,i) => {
      const round = !KL && R() < 0.5;
      const h = round ? 3 + R()*2 : 6 + R()*5;
      const lx = (R()-0.5)*0.25, lz = (R()-0.5)*0.25;
      dummy.position.set(t.x,0,t.z); dummy.rotation.set(lx,0,lz); dummy.scale.set(round?1.6:1,h,round?1.6:1); dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix);
      const tip = new THREE.Vector3(0,h,0).applyEuler(new THREE.Euler(lx,0,lz)).add(new THREE.Vector3(t.x,0,t.z));
      (round ? rounds : palms).push(tip);
    });
    trunks.frustumCulled = false; group.add(trunks);
    const pm = new THREE.InstancedMesh(palmG, new THREE.MeshLambertMaterial({color:0xffffff}), Math.max(1,palms.length));
    palms.forEach((p,i) => { dummy.position.set(p.x,p.y-0.2,p.z); dummy.rotation.set(0,R()*6,0); dummy.scale.set(1,1,1); dummy.updateMatrix(); pm.setMatrixAt(i,dummy.matrix); pm.setColorAt(i,col.setHex([0x2e7d32,0x387c2b,0x3f8f3a,0x2b6e2f][i%4])); });
    pm.count = palms.length; pm.frustumCulled = false; group.add(pm);
    const rm = new THREE.InstancedMesh(roundG, new THREE.MeshLambertMaterial({color:0xffffff}), Math.max(1,rounds.length));
    rounds.forEach((p,i) => { dummy.position.set(p.x,p.y+1.2,p.z); dummy.rotation.set(R(),R(),R()); dummy.scale.setScalar(0.8+R()*0.6); dummy.updateMatrix(); rm.setMatrixAt(i,dummy.matrix); rm.setColorAt(i,col.setHex([0x3d7a2e,0x4a8a33,0x356b28][i%3])); });
    rm.count = rounds.length; rm.frustumCulled = false; group.add(rm);
  }

  // street lamps along straight roads
  const lampSpots = W.straight.filter((s,i) => i % 2 === 0);
  const poleG = new THREE.CylinderGeometry(0.08,0.1,6,5); poleG.translate(0,3,0);
  const poles = new THREE.InstancedMesh(poleG, mat(0x777777), lampSpots.length);
  W.lampMat = new THREE.MeshBasicMaterial({color:0x555555});
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5,0.18,0.9), W.lampMat, lampSpots.length);
  lampSpots.forEach((s,i) => {
    const x = s.tx*T + (s.h ? 0 : 5.6), z = s.tz*T + (s.h ? 5.6 : 0);
    dummy.position.set(x,0,z); dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1); dummy.updateMatrix(); poles.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,6,z); dummy.updateMatrix(); heads.setMatrixAt(i,dummy.matrix);
  });
  poles.frustumCulled = heads.frustumCulled = false; group.add(poles, heads);

  // traffic lights: three-lamp heads (red / amber / green) with hoods on a white backplate, one per approach
  W.sigLamp = [0,1].map(() => [0,1].map(() => [0x3a0d0d,0x3a2a0a,0x0d3a18].map(c => new THREE.MeshBasicMaterial({color:c}))));
  if (W.signals.length) {
    const heads = [];
    W.signals.forEach(sg => {
      const cx = sg.tx*T, cz = sg.tz*T, o = 6.0;
      [[cx+o,cz-o,0,Math.PI],[cx-o,cz+o,0,0],[cx-o,cz-o,1,-Math.PI/2],[cx+o,cz+o,1,Math.PI/2]].forEach(([x,z,ax,ry]) => heads.push({x,z,ax,ry,g:sg.grp}));
    });
    const lists = {}; const add = (key, m) => (lists[key] = lists[key] || []).push(m);
    const H = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const local = (x,y,z,rx) => { const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,0,0)); return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), q2, new THREE.Vector3(1,1,1)); };
    heads.forEach(hd => {
      e.set(0,hd.ry,0); q.setFromEuler(e); H.compose(new THREE.Vector3(hd.x,0,hd.z), q, new THREE.Vector3(1,1,1));
      add('pole', H.clone().multiply(local(0,0,0)));
      add('back', H.clone().multiply(local(0,4.0,-0.17)));
      add('box', H.clone().multiply(local(0,4.0,0)));
      [0.4,0,-0.4].forEach((dy,ci) => {
        add('visor', H.clone().multiply(local(0,4.0+dy+0.02,0.27,Math.PI/2)));
        add('lamp_'+hd.g+'_'+hd.ax+'_'+ci, H.clone().multiply(local(0,4.0+dy,0.15,Math.PI/2)));
      });
    });
    const geos = {
      pole: new THREE.CylinderGeometry(0.09,0.11,4.7,6).translate(0,2.35,0),
      back: new THREE.BoxGeometry(0.66,1.55,0.04),
      box: new THREE.BoxGeometry(0.44,1.32,0.3),
      visor: new THREE.CylinderGeometry(0.18,0.18,0.24,10,1,true,-Math.PI/2,Math.PI),
      lamp: new THREE.CylinderGeometry(0.15,0.15,0.03,14),
    };
    const mats = { pole: mat(0x6b6f73), back: mat(0xf2f2f2), box: mat(0x161616), visor: new THREE.MeshLambertMaterial({color:0x161616, side:THREE.DoubleSide}) };
    Object.entries(lists).forEach(([key, arr]) => {
      let geo, m;
      if (key.startsWith('lamp_')) { const [,g,a,c] = key.split('_').map(Number); geo = geos.lamp; m = W.sigLamp[g][a][c]; }
      else { geo = geos[key]; m = mats[key]; }
      const im = new THREE.InstancedMesh(geo, m, arr.length); arr.forEach((mx,i) => im.setMatrixAt(i, mx)); im.frustumCulled = false; group.add(im);
    });
  }

  // speed cameras
  const camTex = makeSignTexture(['50','km/h'], '#ffffff', '#c0392b', 128, 128);
  W.cams.forEach(c => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,5,5), mat(0x555555)); p.position.set(c.px,2.5,c.pz); group.add(p);
    const b = new THREE.Mesh(boxGeo(0.6,0.5,0.8), mat(0x222222)); b.position.set(c.px,5,c.pz); group.add(b);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({map:camTex, side:THREE.DoubleSide})); s.position.set(c.px,3.6,c.pz); s.rotation.y = c.h ? 0 : Math.PI/2; group.add(s);
    c.led = new THREE.Mesh(new THREE.SphereGeometry(0.09,6,5), new THREE.MeshBasicMaterial({color:0xff0000})); c.led.position.set(c.px,5.3,c.pz); group.add(c.led);
  });

  // bus stop shelters
  W.busStops.forEach(b => {
    const g = new THREE.Group();
    const x = b.tx*T + (b.h ? 0 : b.side*6.2), z = b.tz*T + (b.h ? b.side*6.2 : 0);
    g.position.set(x,0,z); if (!b.h) g.rotation.y = Math.PI/2;
    addBox(g, 4,0.15,1.6, mat(0x2471a3), 0,2.6,0);
    addBox(g, 0.1,2.6,0.1, mat(0x666666), -1.9,1.3,0.7); addBox(g, 0.1,2.6,0.1, mat(0x666666), 1.9,1.3,0.7);
    addBox(g, 3.6,0.1,0.5, mat(0x8e6e4e), 0,0.6,0.3);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.8), new THREE.MeshBasicMaterial({map:makeSignTexture(['BUS STOP', KL?'ബസ് സ്റ്റോപ്പ്':'பேருந்து நிறுத்தம்'], '#1f618d', '#fff'), side:THREE.DoubleSide}));
    sign.position.set(0,3.2,0); g.add(sign);
    group.add(g);
  });

  // POI landmarks + bilingual signboards
  W.pois.forEach(p => buildPOI(W, p));
  buildStreetLife(W, byFloors, poiTiles);
  // welcome arch near spawn
  buildArch(W);
  W.festDecor = new THREE.Group(); group.add(W.festDecor);
}

function signBoard(W, p, lines, bg, fg, w, h, y) {
  const tex = makeSignTexture(lines, bg, fg);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w||5.6, h||1.75), new THREE.MeshBasicMaterial({map:tex}));
  const backM = new THREE.Mesh(new THREE.PlaneGeometry(w||5.6, h||1.75), mat(0x555555)); backM.rotation.y = Math.PI; m.add(backM);
  // place at front edge of tile, facing road
  const fx = p.x + p.d[0]*(HALF-0.6), fz = p.z + p.d[1]*(HALF-0.6);
  m.position.set(fx, y||3.6, fz);
  m.rotation.y = Math.atan2(p.d[0], p.d[1]);
  W.group.add(m);
  [-1,1].forEach(s => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,y||3.6,5), mat(0x444444)); post.position.set(fx + (p.d[1]!==0 ? s*2.6 : 0), (y||3.6)/2 - 0.4, fz + (p.d[0]!==0 ? s*2.6 : 0)); W.group.add(post); });
  return m;
}

function buildPOI(W, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = Math.atan2(p.d[0], p.d[1]); // local +z faces the road
  const KL = W.KL;
  const white = mat(0xf7f5ef);
  switch (p.type) {
    case 'temple':
      if (KL) {
        addBox(g, 11,0.8,11, mat(0x9c4a2f), 0,0.4,-0.5);
        addBox(g, 7,3.2,7, mat(0x5b3a24), 0,2.4,-1);
        { const r1 = new THREE.Mesh(new THREE.ConeGeometry(7.2,3.2,4), mat(0x8e3b26)); r1.rotation.y=Math.PI/4; r1.position.set(0,5.6,-1); g.add(r1); }
        { const r2 = new THREE.Mesh(new THREE.ConeGeometry(4.6,2.6,4), mat(0x6f8f6a)); r2.rotation.y=Math.PI/4; r2.position.set(0,7.9,-1); g.add(r2); }
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,5,8), new THREE.MeshLambertMaterial({color:0xd4a017, emissive:0x2a1d00})); lamp.position.set(0,2.5,4.5); g.add(lamp);
      } else {
        addBox(g, 10,4,8, mat(0xe9d8b4), 0,2,-1.5);
        const cols = [0xe74c3c,0xf1c40f,0x3498db,0x27ae60,0xe67e22];
        for (let i = 0; i < 6; i++) addBox(g, 6-i*0.8, 2, 3-i*0.25, mat(cols[i%5]), 0, 5+i*2, 3);
        addBox(g, 1.2, 0.8, 0.8, new THREE.MeshLambertMaterial({color:0xd4a017, emissive:0x2a1d00}), 0, 17.2, 3);
      }
      break;
    case 'church': {
      addBox(g, 7,7,10, white, 0,3.5,-1.5);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1,5.2,3,4,1), mat(0x9c4a2f)); roof.rotation.y=Math.PI/4; roof.scale.set(1,1,1.4); roof.position.set(0,8.5,-1.5); g.add(roof);
      addBox(g, 3.6,13,3, white, 0,6.5,4);
      const gold = new THREE.MeshLambertMaterial({color:0xd4a017, emissive:0x2a1d00});
      addBox(g, 0.25,2.2,0.25, gold, 0,14.1,4); addBox(g, 1.2,0.25,0.25, gold, 0,14.5,4);
      addBox(g, 1.6,2.6,0.1, mat(0x5d4037), 0,1.3,5.55);
      break; }
    case 'mosque': {
      addBox(g, 9,5,8, white, 0,2.5,-1);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3,16,10,0,Math.PI*2,0,Math.PI/2), mat(0x1e8449)); dome.position.set(0,5,-1); g.add(dome);
      [-4,4].forEach(x => { const mi = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,11,10), white); mi.position.set(x,5.5,3); g.add(mi); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.7,10,8), mat(0x1e8449)); cap.position.set(x,11.2,3); g.add(cap); });
      addBox(g, 2.2,3,0.1, mat(0x145a32), 0,1.5,3.05);
      break; }
    case 'rto': {
      addBox(g, 11,6.4,8, mat(0xeaf2f8), 0,3.2,-1.5);
      addBox(g, 11.2,0.5,8.2, mat(0x1a5276), 0,6.6,-1.5);
      for (let i = 0; i < 5; i++) addBox(g, 1.2,1.4,0.1, mat(0x2e4053), -4+i*2,4.2,2.55);
      addBox(g, 2.2,2.6,0.1, mat(0x5d4037), 0,1.3,2.55);
      const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,8,5), mat(0xcccccc)); fp.position.set(-5,4,4.5); g.add(fp);
      break; }
    case 'museum': {
      const stone = mat(0xe8e0cc);
      addBox(g, 12,0.8,9, mat(0xbfb6a0), 0,0.4,-1.2);
      addBox(g, 11,6.5,7, stone, 0,4.05,-2);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.01,7.6,2.2,4,1), mat(0x9c4a2f)); ped.rotation.y = Math.PI/4; ped.scale.set(1,1,0.75); ped.position.set(0,8.4,-1.2); g.add(ped);
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.4,6.5,12), mat(0xf7f5ef)); c.position.set(-4.5+i*1.8,4.05,2.6); g.add(c); }
      addBox(g, 12,0.5,1.8, stone, 0,7.55,2.6);
      addBox(g, 2,3,0.1, mat(0x5d4037), 0,2.3,1.52);
      break; }
    case 'busstand': {
      addBox(g, 12,0.4,7, mat(0x2471a3), 0,4.2,0);
      for (let i=-2;i<=2;i++) { addBox(g, 0.3,4.2,0.3, mat(0x888888), i*2.8,2.1,3); addBox(g, 0.3,4.2,0.3, mat(0x888888), i*2.8,2.1,-3); }
      addBox(g, 12,3.5,1.5, mat(0xe8d9b5), 0,1.75,-5);
      const bus = makeVehicle('bus', VEHICLES[7], [0x1f8f6f,0xf4efe0]); bus.position.set(-2,0,0); bus.rotation.y = Math.PI/2; g.add(bus);
      break; }
    case 'police': {
      addBox(g, 10,6.4,8, mat(0xd6e4f0), 0,0,-1).geometry; g.children[g.children.length-1].position.y = 3.2;
      addBox(g, 10.2,0.6,8.2, mat(0x1f3a93), 0,6.6,-1);
      const pc = makeVehicle('police', VEHICLES[10], null); pc.position.set(3,0,4.5); pc.rotation.y = Math.PI/2; g.add(pc);
      break; }
    case 'hospital': {
      addBox(g, 11,9.6,9, white, 0,4.8,-1);
      const red = mat(0xd91e18);
      addBox(g, 2.4,0.7,0.1, red, 0,7.6,3.55); addBox(g, 0.7,2.4,0.1, red, 0,7.6,3.55);
      break; }
    case 'carshow': case 'taxishow': {
      const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.4});
      addBox(g, 12,5,9, glass, 0,2.5,-1);
      addBox(g, 12.2,0.5,9.2, mat(parseInt(p.col.slice(1),16)), 0,5.25,-1);
      addBox(g, 12,0.12,9, mat(0xe8e8e8), 0,0.06,-1);
      const ids = p.type === 'carshow' ? ['car3','car4'] : ['taxi1','taxi2'];
      ids.forEach((id,i) => { const v = vehDefW(id); const m = makeVehicle(p.type==='carshow'?'car':'taxi', v, v.colors); m.position.set(i?2.8:-2.8,0.12,-1); m.rotation.y = i?-0.6:0.6; g.add(m); });
      break; }
    case 'autoshow': {
      const wall = mat(0xf7dc6f);
      addBox(g, 12,4.5,0.4, wall, 0,2.25,-5.2); addBox(g, 0.4,4.5,8, wall, -5.8,2.25,-1.4); addBox(g, 0.4,4.5,8, wall, 5.8,2.25,-1.4);
      addBox(g, 12.4,0.4,8.6, mat(0x1d1d1d), 0,4.7,-1.3);
      addBox(g, 12,0.12,8, mat(0xdcdcdc), 0,0.06,-1.3);
      ['auto1','auto2','auto3'].forEach((id,i) => { const v = vehDefW(id); const m = makeVehicle('auto', v, v.colors); m.position.set(-3.6+i*3.6,0.12,-0.6); m.rotation.y = 0.25-i*0.25; g.add(m); });
      for (let i = 0; i < 12; i++) addBox(g, 0.5,0.5,0.05, mat([0xe74c3c,0xf1c40f,0x27ae60,0x3498db][i%4]), -5.5+i, 4.3, 3.0);
      break; }
    case 'busshow': {
      addBox(g, 5,3.2,4, mat(0xf0e6d2), -3.5,1.6,-4.2);
      addBox(g, 5.2,0.3,4.2, mat(0xa04000), -3.5,3.35,-4.2);
      const b1 = makeVehicle('bus', vehDefW('bus1'), vehDefW('bus1').colors); b1.position.set(2.5,0,-1.5); b1.rotation.y = 0.15; g.add(b1);
      const b2 = makeVehicle('bus', vehDefW('bus2'), vehDefW('bus2').colors); b2.position.set(-2.2,0,1.6); b2.rotation.y = Math.PI/2; b2.scale.setScalar(0.85); g.add(b2);
      [[-6.5,0],[6.5,0]].forEach(([x]) => addBox(g, 0.15,1.2,12, mat(0x888888), x,0.6,0));
      break; }
    case 'petrol': {
      addBox(g, 10,0.5,7, mat(0xd35400), 0,5,0);
      [[-4,-3],[4,-3],[-4,3],[4,3]].forEach(([x,z]) => addBox(g, 0.35,5,0.35, white, x,2.5,z));
      addBox(g, 0.8,1.6,0.6, mat(0xc0392b), -1.5,0.8,0); addBox(g, 0.8,1.6,0.6, mat(0xc0392b), 1.5,0.8,0);
      addBox(g, 4,3,2.5, mat(0xf0e6d2), 0,1.5,-5.3);
      break; }
    case 'mall': {
      addBox(g, 12.5,14,11, mat(0xdfe6e9), 0,7,-0.5);
      for (let i = 0; i < 4; i++) addBox(g, 12.6,1.2,11.1, new THREE.MeshLambertMaterial({color:0x5dade2, transparent:true, opacity:0.75}), 0,2.5+i*3.2,-0.5);
      break; }
    case 'market': {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(8.4,3,4), mat(0x2471a3)); roof.rotation.y=Math.PI/4; roof.position.set(0,5.5,-0.5); g.add(roof);
      [[-5,-5],[5,-5],[-5,4],[5,4]].forEach(([x,z]) => addBox(g, 0.4,4.2,0.4, mat(0x888888), x,2.1,z));
      for (let i = 0; i < 6; i++) addBox(g, 1.6,0.9,1.0, mat([0xe67e22,0x27ae60,0xf1c40f][i%3]), -4+i*1.7,0.45,-1+(i%2)*2);
      break; }
    case 'school': case 'college': {
      const big = p.type === 'college';
      addBox(g, 12, big?9.6:6.4, 7, mat(big?0xf3e5c0:0xf7dc6f), 0,(big?9.6:6.4)/2,-2);
      if (KL) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.7071,1,4), mat(0xb5482f)); r.rotation.y = Math.PI/4; r.scale.set(13,2.6,8); r.position.set(0,(big?9.6:6.4)+1.3,-2); g.add(r); }
      const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,8,5), mat(0xcccccc)); fp.position.set(5,4,4); g.add(fp);
      break; }
    case 'rail': {
      addBox(g, 12,1,6, mat(0xb0a89a), 0,0.5,0);
      addBox(g, 12,0.3,4, mat(0xc0392b), 0,4.4,0);
      [-5,0,5].forEach(x => addBox(g, 0.3,3.9,0.3, mat(0x666666), x,2.5,0));
      addBox(g, 12.5,3,3, mat(0x7b241c), 0,1.8,-4.8);
      addBox(g, 12.6,0.8,3.05, mat(0xf1c40f), 0,2.3,-4.8);
      break; }
    default: { // restaurants, tea, textiles, bakery: shop buildings
      const h = p.type === 'tea' ? 3.2 : 6.4;
      const c = {restaurant:0xf5cba7, tea:0xd5b48a, textiles:0xf9e79f, bakery:0xfadbd8}[p.type] || 0xeeeeee;
      addBox(g, 10, h, 8, mat(c), 0,h/2,-1.2);
      addBox(g, 10.4,0.2,2.2, mat(parseInt(p.col.slice(1),16)), 0,3.1,3.6);
      if (p.type === 'tea') { const r = new THREE.Mesh(new THREE.ConeGeometry(7.4,2.2,4), mat(0x9a7b4f)); r.rotation.y=Math.PI/4; r.position.set(0,4.3,-1.2); g.add(r); addBox(g, 3,0.5,0.6, mat(0x6e4b2e), 2.5,0.5,4); }
    }
  }
  W.group.add(g);
  p.mesh = g;
  const pt = PLACE_TYPES[p.type];
  const bg = p.col;
  p.sign = signBoard(W, p, [p.en, p.nt], bg, '#ffffff', 6.2, 1.9, p.holy ? 4.2 : 3.6);
  // floating label for holy places & key services (visible from distance)
  if (p.holy || pt.shop || pt.walkin || p.type === 'rto' || p.type === 'petrol' || p.type === 'busstand' || p.type === 'police') {
    const tex = makeSignTexture([pt.en.toUpperCase(), pt[W.city.st]], bg, '#fff', 512, 160);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:true}));
    sp.scale.set(10, 3.1, 1); sp.position.set(p.x, p.type==='temple' && !W.KL ? 21 : 16, p.z); W.group.add(sp);
  }
}

function vehDefW(id){ return VEHICLES.find(v => v.id === id) || VEHICLES[0]; }

function buildArch(W) {
  const bs = W.poiBy('busstand')[0]; if (!bs) return;
  // find straight road tile next to the bus stand road
  const rx = bs.tx + bs.d[0], rz = bs.tz + bs.d[1];
  const horiz = bs.d[1] !== 0; // road runs along x
  const ax = horiz ? rx + 1 : rx, az = horiz ? rz : rz + 1;
  const g = new THREE.Group(); g.position.set(ax*T, 0, az*T); if (!horiz) g.rotation.y = Math.PI/2;
  const pc = mat(W.KL ? 0xc0392b : 0xd68910);
  addBox(g, 0.7,7,0.7, pc, -0.0,3.5,-6.2); addBox(g, 0.7,7,0.7, pc, 0,3.5,6.2);
  const tex = makeSignTexture(['Welcome to ' + W.city.en, WELCOME[W.city.st](W.city.nt)], W.KL ? '#145a32' : '#7b241c', '#fff', 1024, 200);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 13.2), [mat(0x333333),mat(0x333333),mat(0x333333),mat(0x333333),mat(0x333333),mat(0x333333)]);
  b.position.set(0, 7.4, 0); g.add(b);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.1), new THREE.MeshBasicMaterial({map:tex}));
  front.rotation.y = Math.PI/2; front.position.set(0.22, 7.4, 0); g.add(front);
  const back = front.clone(); back.rotation.y = -Math.PI/2; back.position.x = -0.22; g.add(back);
  W.group.add(g);
}

// Festival decorations around a holy place
function decorateFestival(W, p, fest) {
  const g = W.festDecor;
  const bulbs = [];
  const colors = [0xff3b30,0xffcc00,0x34c759,0x0a84ff,0xff9f0a,0xbf5af2];
  const r = HALF+0.3;
  const corners = [[-r,-r],[r,-r],[r,r],[-r,r],[-r,-r]];
  for (let s = 0; s < 4; s++) {
    const [x1,z1] = corners[s], [x2,z2] = corners[s+1];
    for (let i = 0; i < 14; i++) { const t = i/14; bulbs.push([p.x + x1+(x2-x1)*t, 5.2 - Math.sin(t*Math.PI)*0.9, p.z + z1+(z2-z1)*t]); }
  }
  const bg = new THREE.SphereGeometry(0.13,6,4);
  colors.forEach((c,k) => {
    const list = bulbs.filter((b,i) => i % colors.length === k);
    const im = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({color:c}), list.length);
    const d = new THREE.Object3D(); list.forEach((b,i)=>{ d.position.set(b[0],b[1],b[2]); d.updateMatrix(); im.setMatrixAt(i,d.matrix); });
    im.frustumCulled = false; g.add(im);
  });
  corners.slice(0,4).forEach(([x,z]) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,5.4,5), mat(0x8e6e4e)); pole.position.set(p.x+x, 2.7, p.z+z); g.add(pole); });
  // festival banner
  const tex = makeSignTexture([fest.en + ' Today', fest.nt], '#7d3c98', '#fff', 768, 160);
  const ban = new THREE.Sprite(new THREE.SpriteMaterial({map:tex})); ban.scale.set(11, 2.3, 1);
  ban.position.set(p.x + p.d[0]*HALF, 7.2, p.z + p.d[1]*HALF); g.add(ban);
}

// Route along roads starting from a POI: list of points (lane center), looping back
function makeRoute(W, startX, startZ, steps, R) {
  const pts = [{x:startX, z:startZ}];
  // snap to nearest road line intersection walk
  let tx = Math.round(startX/T), tz = Math.round(startZ/T);
  // move to nearest intersection along the road
  const rowsIdx = W.rows, colsIdx = W.cols;
  let dir = null;
  if (W.rows.includes(tz)) { // horizontal road
    const nc = colsIdx.reduce((a,c) => Math.abs(c-tx) < Math.abs(a-tx) ? c : a, colsIdx[0]);
    tx = nc;
  } else {
    const nr = rowsIdx.reduce((a,r) => Math.abs(r-tz) < Math.abs(a-tz) ? r : a, rowsIdx[0]);
    tz = nr;
  }
  pts.push({x:tx*T, z:tz*T});
  let ci = colsIdx.indexOf(tx), ri = rowsIdx.indexOf(tz);
  const visited = [];
  for (let s = 0; s < steps; s++) {
    const opts = [];
    if (ci > 0) opts.push([-1,0]); if (ci < colsIdx.length-1) opts.push([1,0]);
    if (ri > 0) opts.push([0,-1]); if (ri < rowsIdx.length-1) opts.push([0,1]);
    let o = opts[Math.floor(R()*opts.length)];
    if (dir && opts.length > 1 && o[0] === -dir[0] && o[1] === -dir[1]) o = opts.find(q => !(q[0]===-dir[0] && q[1]===-dir[1])) || o;
    dir = o; ci += o[0]; ri += o[1];
    pts.push({x:colsIdx[ci]*T, z:rowsIdx[ri]*T});
  }
  // return path back (reverse)
  const back = pts.slice(0,-1).reverse();
  return pts.concat(back);
}

// Power lines, compound walls, floor ledges, billboards (made-up local brands)
const ADS = [
  {en:'Kayal Silks', KL:'കായൽ സിൽക്സ്', TN:'காயல் சில்க்ஸ்', sub:'Wedding sarees since 1985', bg:'#7b1fa2'},
  {en:'Sree Gold Jewellers', KL:'ശ്രീ ഗോൾഡ് ജ്വല്ലേഴ്സ്', TN:'ஸ்ரீ கோல்டு ஜுவல்லர்ஸ்', sub:'22K hallmark gold', bg:'#b7950b'},
  {en:'Malabar Pickles', KL:'മലബാർ അച്ചാർ', TN:'மலபார் ஊறுகாய்', sub:'Taste of home', bg:'#c0392b'},
  {en:'Vandi Ride', KL:'വണ്ടി റൈഡ്', TN:'வண்டி ரைட்', sub:'Drive with us · Earn more', bg:'#0f3b2e'},
  {en:'Ponni Rice', KL:'പൊന്നി അരി', TN:'பொன்னி அரிசி', sub:'Fresh from the fields', bg:'#1e8449'},
  {en:'Thendral Mobiles', KL:'തെന്നൽ മൊബൈൽസ്', TN:'தென்றல் மொபைல்ஸ்', sub:'Latest phones · Easy EMI', bg:'#1f618d'},
  {en:'Nila Coconut Oil', KL:'നിലാ വെളിച്ചെണ്ണ', TN:'நிலா தேங்காய் எண்ணெய்', sub:'Pure & natural', bg:'#117a65'},
  {en:'Drive Safe', KL:'സുരക്ഷിതമായി ഓടിക്കുക', TN:'பாதுகாப்பாக ஓட்டுங்கள்', sub:'Wear your seatbelt', bg:'#d35400'},
];
function lerpW(a,b,t){ return a+(b-a)*t; }
function buildStreetLife(W, byFloors, poiTiles){
  const {N, tileAt, R, KL, group} = W;
  const dummy = new THREE.Object3D();
  const ledges = [];
  for (let f = 2; f <= 4; f++) byFloors[f].forEach(b => { for (let k = 1; k < f; k++) ledges.push([b.x, k*3.2, b.z, b.w+0.6, b.d+0.6]); });
  if (ledges.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.16,1), mat(0xdcd6c8), ledges.length);
    ledges.forEach((l,i) => { dummy.position.set(l[0],l[1],l[2]); dummy.rotation.set(0,0,0); dummy.scale.set(l[3],1,l[4]); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix); });
    im.frustumCulled = false; group.add(im);
  }
  const walls = [];
  for (let tz = 0; tz < N; tz++) for (let tx = 0; tx < N; tx++) {
    if (tileAt(tx,tz) !== BUILD || poiTiles.has(tx+','+tz)) continue;
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dz]) => {
      if (!W.isRoad(tx+dx,tz+dz)) return;
      const ex = tx*T + dx*(HALF-1.0), ez = tz*T + dz*(HALF-1.0);
      const along = dx === 0;
      [-1,1].forEach(sd => { const off = sd*3.6; walls.push([ex + (along?off:0), ez + (along?0:off), along?4.6:0.25, along?0.25:4.6]); });
    });
  }
  if (walls.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1.2,1).translate(0,0.6,0), mat(KL ? 0xb8573a : 0xe8dcc0), walls.length);
    walls.forEach((w,i) => { dummy.position.set(w[0],0,w[1]); dummy.rotation.set(0,0,0); dummy.scale.set(w[2],1,w[3]); dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix); });
    im.frustumCulled = false; group.add(im);
  }
  const poles = [], wires = [];
  W.roadLines.forEach(l => {
    const pts = [];
    for (let k = 0; k < N; k++) {
      const tx = l.axis === 'x' ? k : l.idx, tz = l.axis === 'x' ? l.idx : k;
      if (!W.isRoad(tx,tz) || W.isInter(tx,tz) || k % 2) continue;
      const x = tx*T + (l.axis === 'z' ? -6.4 : 0), z = tz*T + (l.axis === 'x' ? -6.4 : 0);
      pts.push([x,z]); poles.push([x,z,l.axis]);
    }
    for (let i = 1; i < pts.length; i++) {
      const [x0,z0] = pts[i-1], [x1,z1] = pts[i];
      if (Math.hypot(x1-x0, z1-z0) > T*2.5) continue;
      [-0.7,0,0.7].forEach(o => {
        const ox = l.axis === 'x' ? 0 : o, oz = l.axis === 'x' ? o : 0;
        let px = x0+ox, py = 8.3, pz = z0+oz;
        for (let s2 = 1; s2 <= 6; s2++) { const t = s2/6; const nx = lerpW(x0,x1,t)+ox, nz = lerpW(z0,z1,t)+oz, ny = 8.3 - Math.sin(t*Math.PI)*0.8; wires.push(px,py,pz,nx,ny,nz); px = nx; py = ny; pz = nz; }
      });
    }
  });
  if (poles.length) {
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12,0.17,8.6,6).translate(0,4.3,0), mat(0x9a9a92), poles.length);
    const cb = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,0.12,0.12), mat(0x707070), poles.length);
    poles.forEach((p,i) => { dummy.position.set(p[0],0,p[1]); dummy.rotation.set(0, p[2] === 'x' ? Math.PI/2 : 0, 0); dummy.scale.set(1,1,1); dummy.updateMatrix(); pm.setMatrixAt(i,dummy.matrix); dummy.position.y = 8.3; dummy.updateMatrix(); cb.setMatrixAt(i,dummy.matrix); });
    pm.frustumCulled = cb.frustumCulled = false; group.add(pm, cb);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({color:0x222222, transparent:true, opacity:0.7})); wl.frustumCulled = false; group.add(wl);
  }
  const spots = [];
  const maxB = W.city.big ? 9 : 6;
  for (let tz = 1; tz < N-1 && spots.length < maxB; tz += 3) for (let tx = 1; tx < N-1 && spots.length < maxB; tx += 4) {
    if (tileAt(tx,tz) !== BUILD || poiTiles.has(tx+','+tz) || R() > 0.3) continue;
    const ds = [[0,-1],[0,1],[-1,0],[1,0]].filter(([dx,dz]) => W.isRoad(tx+dx,tz+dz)); if (!ds.length) continue;
    spots.push({tx,tz,d:ds[0]});
  }
  spots.forEach((sp,i) => {
    const ad = ADS[(hashStr(W.city.id) + i) % ADS.length];
    const tex = makeSignTexture([ad[W.city.st], ad.en, ad.sub], ad.bg, '#fff', 768, 384);
    const g = new THREE.Group(); g.position.set(sp.tx*T + sp.d[0]*4.5, 0, sp.tz*T + sp.d[1]*4.5); g.rotation.y = Math.atan2(sp.d[0], sp.d[1]);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7,3.5), new THREE.MeshBasicMaterial({map:tex})); board.position.y = 8.2; g.add(board);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(7,3.5), mat(0x444444)); back.rotation.y = Math.PI; back.position.set(0,8.2,-0.02); g.add(back);
    [-2.6,2.6].forEach(x => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.25,6.5,0.25), mat(0x555555)); post.position.set(x,3.25,-0.15); g.add(post); });
    group.add(g);
  });
}
