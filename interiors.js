// Vandi — walk-in interiors for temples, churches and mosques.
// Each interior is built far from the town and swapped in when the player walks through the door.
'use strict';

const IX = -4000, IZ = -4000; // interior origin

function floorTex(draw, size) {
  const c = document.createElement('canvas'); c.width = c.height = size || 512;
  draw(c.getContext('2d'), c.width);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function buildInterior(poi, KL, festival) {
  const g = new THREE.Group(); g.position.set(IX, 0, IZ);
  const boxes = []; // collision rectangles in local coords [x0,z0,x1,z1]
  const B = (x0,z0,x1,z1) => boxes.push([x0,z0,x1,z1]);
  const lights = [];
  const flame = new THREE.MeshBasicMaterial({color:0xffc04a});
  const gold = new THREE.MeshLambertMaterial({color:0xd4a017, emissive:0x3a2a00});
  const people = (n, area) => { for (let i = 0; i < n; i++) { const p = makePerson(); p.position.set(rnd(area[0],area[2]), 0, rnd(area[1],area[3])); p.rotation.y = rnd(-0.4,0.4) + Math.PI; g.add(p); } };
  const walls = (w, d, h, m, doorW) => {
    addBox(g, w,h,0.5, m, 0,h/2,-d/2); B(-w/2,-d/2-0.3,w/2,-d/2+0.3);
    addBox(g, 0.5,h,d, m, -w/2,h/2,0); B(-w/2-0.3,-d/2,-w/2+0.3,d/2);
    addBox(g, 0.5,h,d, m, w/2,h/2,0); B(w/2-0.3,-d/2,w/2+0.3,d/2);
    const side = (w-doorW)/2;
    addBox(g, side,h,0.5, m, -(doorW/2+side/2),h/2,d/2); B(-w/2,d/2-0.3,-doorW/2,d/2+0.3);
    addBox(g, side,h,0.5, m, (doorW/2+side/2),h/2,d/2); B(doorW/2,d/2-0.3,w/2,d/2+0.3);
    addBox(g, doorW,h-3.2,0.5, m, 0,3.2+(h-3.2)/2,d/2);
  };
  const lamp = (x,y,z,s) => { const f = new THREE.Mesh(new THREE.SphereGeometry(s||0.07,6,5), flame); f.position.set(x,y,z); g.add(f); };
  let w, d, info = {};

  if (poi.type === 'temple' && KL) {
    // Nalambalam: walled courtyard with the sreekovil (shrine) in the middle
    w = 30; d = 32;
    const fl = floorTex((x,s) => { x.fillStyle = '#c9a77c'; x.fillRect(0,0,s,s); for (let i=0;i<900;i++){ x.fillStyle = 'rgba(120,90,60,.12)'; x.fillRect(Math.random()*s,Math.random()*s,3,3);} });
    fl.repeat.set(4,4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({map:fl})); floor.rotation.x = -Math.PI/2; g.add(floor);
    walls(w, d, 3.6, mat(0x6b4226), 3);
    // tiled corridor roof around the inside of the walls
    const tile = mat(0x9c3b26);
    addBox(g, w,0.3,3.2, tile, 0,3.9,-d/2+1.6); addBox(g, w,0.3,3.2, tile, 0,3.9,d/2-1.6);
    addBox(g, 3.2,0.3,d, tile, -w/2+1.6,3.9,0); addBox(g, 3.2,0.3,d, tile, w/2-1.6,3.9,0);
    // rows of wall lamps (vilakkumadam)
    for (let i = 0; i < 40; i++) { lamp(-w/2+0.6+i*(w-1.2)/39, 1.3, -d/2+0.4); lamp(-w/2+0.6+i*(w-1.2)/39, 1.7, -d/2+0.4); }
    for (let i = 0; i < 30; i++) { lamp(-w/2+0.4, 1.3, -d/2+1+i*(d-2)/29); lamp(w/2-0.4, 1.3, -d/2+1+i*(d-2)/29); }
    // sreekovil
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.4,0.8,24), mat(0x7f7f7a)); base.position.set(0,0.4,-3); g.add(base);
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,3.2,24), mat(0x5b3a24)); cell.position.set(0,2.4,-3); g.add(cell);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8,3.8,24), mat(0x5f8a6a)); roof.position.set(0,5.9,-3); g.add(roof);
    const kal = new THREE.Mesh(new THREE.SphereGeometry(0.35,10,8), gold); kal.position.set(0,8.0,-3); g.add(kal);
    addBox(g, 1.4,2.3,0.15, gold, 0,1.95,0.42);
    B(-4.4,-7.4,4.4,1.4);
    [-1.6,1.6].forEach(x => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.25,1.4,10), gold); st.position.set(x,1.5,1.2); g.add(st); lamp(x,2.3,1.2,0.12); });
    // flag mast and balikkal
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.32,11,10), gold); mast.position.set(0,5.5,8.5); g.add(mast); B(-0.5,8,0.5,9);
    addBox(g, 1.6,0.9,1.6, mat(0x8a8a83), 0,0.45,5.2); B(-0.9,4.4,0.9,6);
    lights.push([0,4,0,0xffd08a]);
    info = {title:'Inside the temple courtyard', note:'You leave your footwear at the entrance and walk around the shrine clockwise, as people do here.'};
    people(festival ? 10 : 4, [-10,-12,10,12]);
  } else if (poi.type === 'temple') {
    // Tamil Nadu: pillared mandapam leading to the sanctum
    w = 22; d = 36;
    const fl = floorTex((x,s) => { x.fillStyle = '#9a958c'; x.fillRect(0,0,s,s); x.strokeStyle = 'rgba(60,55,50,.35)'; x.lineWidth = 3; for (let i=0;i<=s;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } });
    fl.repeat.set(3,5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({map:fl})); floor.rotation.x = -Math.PI/2; g.add(floor);
    walls(w, d, 6.5, mat(0xc8b48c), 3.2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(0x8e7f66)); ceil.rotation.x = Math.PI/2; ceil.position.y = 6.5; g.add(ceil);
    const pg = new THREE.BoxGeometry(0.9,6.5,0.9); pg.translate(0,3.25,0);
    const pl = []; [-7.5,-3.5,3.5,7.5].forEach(x => { for (let z = -11; z <= 13; z += 4) pl.push([x,z]); });
    const pil = new THREE.InstancedMesh(pg, mat(0xb3a07c), pl.length); const dm = new THREE.Object3D();
    pl.forEach(([x,z],i) => { dm.position.set(x,0,z); dm.updateMatrix(); pil.setMatrixAt(i, dm.matrix); B(x-0.5,z-0.5,x+0.5,z+0.5); });
    g.add(pil);
    // kolam at the entrance (an original dot pattern)
    const kol = floorTex((x,s) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0,0,s,s); x.strokeStyle = '#ffffff'; x.lineWidth = 6; for (let i=0;i<5;i++) for (let j=0;j<5;j++){ x.beginPath(); x.arc(64+i*96, 64+j*96, 30, 0, 7); x.stroke(); x.fillStyle = ['#e74c3c','#f1c40f','#8e44ad'][ (i+j)%3 ]; x.beginPath(); x.arc(64+i*96, 64+j*96, 8, 0, 7); x.fill(); } });
    const km = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshBasicMaterial({map:kol, transparent:true})); km.rotation.x = -Math.PI/2; km.position.set(0,0.02,15); g.add(km);
    // sanctum at the far end: closed doors with lamps
    addBox(g, 8,6.5,5, mat(0x7d705a), 0,3.25,-15.5); B(-4,-18,4,-13);
    addBox(g, 1.8,2.8,0.12, gold, 0,1.4,-12.94);
    [-1.5,1.5].forEach(x => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.25,1.4,10), gold); st.position.set(x,0.7,-12.4); g.add(st); lamp(x,1.5,-12.4,0.12); });
    for (let i = 0; i < 5; i++) { const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.22,0.35,10), gold); bell.position.set(-2+i,4.6,-12.6); g.add(bell); }
    lights.push([0,4,-10,0xffb060]);
    info = {title:'Inside the temple mandapam', note:'You leave your footwear at the entrance. The stone floor is cool and the hall smells of camphor and jasmine.'};
    people(festival ? 10 : 4, [-6,-10,6,12]);
  } else if (poi.type === 'church') {
    w = 16; d = 32;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(0xd9cbb0)); floor.rotation.x = -Math.PI/2; g.add(floor);
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.4,d-4), mat(0x8e1b1b)); carpet.rotation.x = -Math.PI/2; carpet.position.set(0,0.02,1); g.add(carpet);
    walls(w, d, 8, mat(0xf4f1ea), 3);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(0x7a5232)); ceil.rotation.x = Math.PI/2; ceil.position.y = 8; g.add(ceil);
    // pews
    const pewG = new THREE.BoxGeometry(5,0.9,0.5); pewG.translate(0,0.45,0);
    const rows = []; for (let z = -8; z <= 10; z += 1.6) { rows.push([-4.4,z]); rows.push([4.4,z]); }
    const pews = new THREE.InstancedMesh(pewG, mat(0x6e4126), rows.length); const dm = new THREE.Object3D();
    rows.forEach(([x,z],i) => { dm.position.set(x,0,z); dm.updateMatrix(); pews.setMatrixAt(i, dm.matrix); });
    g.add(pews); B(-7.2,-8.4,-1.6,10.4); B(1.6,-8.4,7.2,10.4);
    // altar and cross
    addBox(g, 10,0.5,4, mat(0xbfae8a), 0,0.25,-14); B(-5,-16,5,-12);
    addBox(g, 3.4,1.0,1.2, mat(0xf7f5ef), 0,1.0,-14.3);
    addBox(g, 0.3,3.2,0.12, gold, 0,4.6,-15.7); addBox(g, 1.8,0.3,0.12, gold, 0,5.4,-15.7);
    [-1.3,-0.6,0.6,1.3].forEach(x => { addBox(g, 0.08,0.4,0.08, mat(0xfffbe8), x,1.7,-14.3); lamp(x,1.95,-14.3,0.05); });
    // stained-glass windows
    const cols = [0xc0392b,0x2874a6,0xf1c40f,0x27ae60,0x8e44ad];
    for (let i = 0; i < 5; i++) { const z = -10 + i*5; [-1,1].forEach(s => { const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4,3.2), new THREE.MeshBasicMaterial({color:cols[(i+(s>0?2:0))%5], side:THREE.DoubleSide})); win.position.set(s*(w/2-0.27),4.4,z); win.rotation.y = Math.PI/2; g.add(win); }); }
    lights.push([0,6,-6,0xfff0d0]);
    info = {title:'Inside the church', note:'It is quiet inside. A few people are sitting in the pews.'};
    people(festival ? 8 : 3, [-1,-6,1,9]);
  } else if (poi.type === 'museum') {
    w = 28; d = 30;
    const fl = floorTex((x,s) => { for (let i=0;i<8;i++) for (let j=0;j<8;j++){ x.fillStyle = (i+j)%2 ? '#e9e2d2' : '#b9ae96'; x.fillRect(i*s/8,j*s/8,s/8,s/8);} });
    fl.repeat.set(4,4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({map:fl})); floor.rotation.x = -Math.PI/2; g.add(floor);
    walls(w, d, 7, mat(0xf3eee2), 3.2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(0xdcd3c0)); ceil.rotation.x = Math.PI/2; ceil.position.y = 7; g.add(ceil);
    const label = (txt, sub, x, z, ry) => { const t = makeSignTexture([txt, sub], '#4a235a', '#fff', 512, 140); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.66), new THREE.MeshBasicMaterial({map:t, side:THREE.DoubleSide})); m.position.set(x,1.25,z); m.rotation.y = ry||0; g.add(m); };
    const plinth = (x,z,ww,dd) => { addBox(g, ww,0.6,dd, mat(0xd8d0bf), x,0.3,z); B(x-ww/2-0.2,z-dd/2-0.2,x+ww/2+0.2,z+dd/2+0.2); };
    // 1. a vintage auto-rickshaw
    plinth(-8,-8,4.2,4.2); { const v = makeVehicle('auto', {len:2.7,wid:1.45,id:'x'}, [0x2f8f3a,0xf4f1e6]); v.position.set(-8,0.6,-8); v.rotation.y = 0.6; g.add(v); } label('Early Kerala auto-rickshaw', KL?'പഴയ ഓട്ടോറിക്ഷ':'பழைய ஆட்டோ', -8,-5.4);
    // 2. old town bus front
    plinth(8,-8,4.6,6); { const v = makeVehicle('bus', {len:5.5,wid:2.4,id:'x'}, [0x7b241c,0xf4efe0]); v.position.set(8,0.6,-8); v.rotation.y = -0.4; g.add(v); } label('Town bus, 1970s style', KL?'പഴയ ബസ്':'பழைய பேருந்து', 8,-4.6);
    // 3. long racing boat model
    plinth(0,-12,12,1.8); { const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,11,10,1,false,0,Math.PI), mat(0x3b2416)); hull.rotation.z = Math.PI/2; hull.rotation.y = 0; hull.position.set(0,1.0,-12); g.add(hull); const prow = new THREE.Mesh(new THREE.ConeGeometry(0.3,1.6,8), gold); prow.rotation.z = -1.1; prow.position.set(5.9,1.6,-12); g.add(prow); } label('Model of a long racing boat', KL?'വള്ളം മാതൃക':'படகு மாதிரி', 0,-10.8);
    // 4. pottery & brass lamps
    plinth(-8,4,3,3); [[-8.6,3.6,0xa0522d],[-7.4,4.4,0x8b4513],[-8,4.8,0xb5651d]].forEach(([x,z,c]) => { const u = new THREE.Mesh(new THREE.SphereGeometry(0.45,10,8), mat(c)); u.scale.y = 1.3; u.position.set(x,1.2,z); g.add(u); }); label('Clay pots from local potters', KL?'മൺപാത്രങ്ങൾ':'மண்பாண்டங்கள்', -8,5.9);
    plinth(8,4,3,3); [[7.4,3.6],[8.6,4.4]].forEach(([x,z]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.35,1.6,10), gold); st.position.set(x,1.4,z); g.add(st); lamp(x,2.25,z,0.1); }); label('Traditional brass lamps', KL?'നിലവിളക്കുകൾ':'குத்துவிளக்குகள்', 8,5.9);
    // 5. coins & tools case
    addBox(g, 4,1,1.6, mat(0x6e4126), 0,0.5,6); addBox(g, 4,0.6,1.6, new THREE.MeshLambertMaterial({color:0xbfe6ff, transparent:true, opacity:0.35}), 0,1.3,6); B(-2.2,5,2.2,7);
    for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.03,12), gold); c.position.set(-1.6+i*0.36,1.04,6+(i%2?0.3:-0.3)); g.add(c); }
    label('Old coins and trade weights', KL?'പഴയ നാണയങ്ങൾ':'பழைய நாணயங்கள்', 0,7.2);
    // abstract wall art (original colour panels)
    for (let i = 0; i < 6; i++) [-1,1].forEach(sd => { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6), new THREE.MeshBasicMaterial({color:[0xc0392b,0x1f618d,0xd4ac0d,0x1e8449,0x7d3c98,0xd35400][(i+(sd>0?3:0))%6], side:THREE.DoubleSide})); f.position.set(sd*(w/2-0.28),3.4,-11+i*4.4); f.rotation.y = Math.PI/2; g.add(f); });
    lights.push([0,6,-4,0xfff6e0]); lights.push([0,6,6,0xfff6e0]);
    info = {title:'Inside the ' + poi.en, note:'Exhibits on the history of local transport and crafts.'};
    people(festival ? 6 : 5, [-4,-4,4,10]);
  } else {
    // mosque prayer hall
    w = 26; d = 22;
    const ct = floorTex((x,s) => { x.fillStyle = '#1e6b45'; x.fillRect(0,0,s,s); x.fillStyle = '#d4b45a'; for (let i=0;i<s;i+=64) x.fillRect(0,i,s,5); x.fillStyle='rgba(255,255,255,.08)'; for (let i=0;i<s;i+=32) x.fillRect(i,0,2,s); });
    ct.repeat.set(4,4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({map:ct})); floor.rotation.x = -Math.PI/2; g.add(floor);
    walls(w, d, 7, mat(0xf7f3e8), 3.2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(0xe8e0cc)); ceil.rotation.x = Math.PI/2; ceil.position.y = 7; g.add(ceil);
    // mihrab niche in the far wall
    addBox(g, 2.6,3.6,0.6, mat(0x145a32), 0,1.8,-d/2+0.5);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.3,0.18,8,20,Math.PI), gold); arch.position.set(0,3.6,-d/2+0.82); g.add(arch);
    // minbar (steps)
    for (let i = 0; i < 4; i++) addBox(g, 1.2,0.4*(i+1),0.7, mat(0x6e4126), 3.4,0.2*(i+1),-d/2+1+i*0.7);
    B(2.8,-d/2,4.0,-d/2+3.8);
    // arches along side walls
    for (let i = 0; i < 5; i++) [-1,1].forEach(s => { const a = new THREE.Mesh(new THREE.TorusGeometry(1.4,0.12,6,16,Math.PI), mat(0x1e8449)); a.position.set(s*(w/2-0.28),3.2,-8+i*4); a.rotation.y = Math.PI/2; g.add(a); });
    // chandelier
    for (let i = 0; i < 16; i++) { const a = i/16*Math.PI*2; lamp(Math.cos(a)*1.6, 5.2, Math.sin(a)*1.6, 0.09); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6,0.05,6,32), gold); ring.rotation.x = Math.PI/2; ring.position.y = 5.2; g.add(ring);
    lights.push([0,5,0,0xfff0d0]);
    info = {title:'Inside the mosque', note:'You leave your footwear at the entrance. The prayer hall is calm, with soft carpet underfoot.'};
    people(festival ? 8 : 3, [-8,-6,8,4]);
  }
  if (festival) { // marigold strings
    for (let i = 0; i < 60; i++) { const t = i/59; const f = new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4), mat(i%2?0xff9f0a:0xffcc00)); f.position.set(-w/2+0.6+t*(w-1.2), 3.0 - Math.sin(t*Math.PI*4)*0.4, d/2-0.5); g.add(f); }
  }
  lights.forEach(([x,y,z,c]) => { const L = new THREE.PointLight(c, 0.9, 40); L.position.set(x,y,z); g.add(L); });
  return {group:g, boxes, w, d, door:{x:IX, z:IZ + d/2 - 1.2}, spawn:{x:IX, z:IZ + d/2 - 2.2, h:Math.PI}, info, poi};
}

// circle vs list of rectangles (local coords + offset)
function collideBoxes(px, pz, r, boxes) {
  for (const [x0,z0,x1,z1] of boxes) {
    const ax0 = IX+x0, ax1 = IX+x1, az0 = IZ+z0, az1 = IZ+z1;
    const qx = Math.max(ax0, Math.min(px, ax1)), qz = Math.max(az0, Math.min(pz, az1));
    const dx = px-qx, dz = pz-qz, d2 = dx*dx+dz*dz;
    if (d2 < r*r) {
      if (d2 > 1e-6) { const dd = Math.sqrt(d2); px = qx + dx/dd*r; pz = qz + dz/dd*r; }
      else { const o = [[ax0-r,pz],[ax1+r,pz],[px,az0-r],[px,az1+r]]; let best = o[0], bd = 1e9; o.forEach(q => { const v = Math.abs(q[0]-px)+Math.abs(q[1]-pz); if (v < bd) { bd = v; best = q; } }); px = best[0]; pz = best[1]; }
    }
  }
  return {x:px, z:pz};
}
