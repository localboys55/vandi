// Vandi — low-poly models: vehicles with breakable parts, people, animals, elephants
'use strict';

const MAT = {};
function mat(color, opts) {
  const key = color + JSON.stringify(opts || {});
  if (!MAT[key]) MAT[key] = new THREE.MeshLambertMaterial(Object.assign({color}, opts || {}));
  return MAT[key];
}
const GLASS = () => new THREE.MeshLambertMaterial({color:0x8fc3dc, transparent:true, opacity:0.55});
const BOXG = {};
function boxGeo(w,h,d){ const k=w+'_'+h+'_'+d; if(!BOXG[k]) BOXG[k]=new THREE.BoxGeometry(w,h,d); return BOXG[k]; }
const WHEEL_GEO = (()=>{ const g=new THREE.CylinderGeometry(0.34,0.34,0.24,12); g.rotateZ(Math.PI/2); return g; })();
const WHEEL_GEO_BIG = (()=>{ const g=new THREE.CylinderGeometry(0.5,0.5,0.32,12); g.rotateZ(Math.PI/2); return g; })();

function addBox(g, w,h,d, m, x,y,z, part) {
  const me = new THREE.Mesh(boxGeo(w,h,d), m);
  me.position.set(x,y,z);
  if (part) me.userData.part = part;
  g.add(me);
  return me;
}

// Build a vehicle. kind: auto | taxi | car | bus | police | bike. Front faces +z.
function makeVehicle(kind, def, colors) {
  const g = new THREE.Group();
  const len = def.len, wid = def.wid;
  const c1 = colors ? colors[0] : 0xcccccc, c2 = colors ? colors[1] : 0x222222;
  const wheels = [];
  const ud = {kind, len, wid, wheels, parts: [], lights: []};
  const headM = new THREE.MeshBasicMaterial({color:0xfff6cc});
  const tailM = new THREE.MeshBasicMaterial({color:0xd01818});

  if (kind === 'auto') {
    const body = mat(c1), top = mat(c2), trim = mat(0x1b1b1b), seat = mat(0x5a2e1b);
    addBox(g, 1.3,0.3,2.7, trim, 0,0.42,0);
    addBox(g, 1.42,0.62,1.25, body, 0,0.86,-0.68);
    addBox(g, 1.0,0.9,0.35, body, 0,0.95,1.12);
    addBox(g, 1.5,0.1,2.3, top, 0,2.02,-0.08);
    if (def.style === 'modern') { addBox(g, 1.52,0.06,2.32, mat(0xdddddd), 0,2.1,-0.08); }
    if (def.style === 'electric') { addBox(g, 1.44,0.1,1.27, mat(0x2ecc71), 0,1.0,-0.68); }
    addBox(g, 1.5,0.95,0.1, top, 0,1.55,-1.28);
    [[-0.66,0.95],[0.66,0.95],[-0.7,-0.2],[0.7,-0.2]].forEach(([x,z])=>addBox(g,0.07,1.0,0.07,trim,x,1.5,z));
    addBox(g, 1.3,0.18,0.55, seat, 0,1.2,-0.75);
    addBox(g, 1.3,0.5,0.12, seat, 0,1.45,-1.05);
    addBox(g, 0.9,0.05,0.05, trim, 0,1.35,0.78);
    // breakable
    addBox(g, 1.12,0.7,0.05, GLASS(), 0,1.62,0.98, 'front');
    addBox(g, 0.26,0.2,0.1, headM, 0,1.25,1.32, 'front');
    addBox(g, 1.05,0.18,0.16, mat(0x444444), 0,0.42,1.4, 'front');
    addBox(g, 0.2,0.14,0.06, tailM, -0.55,0.95,-1.33, 'rear');
    addBox(g, 0.2,0.14,0.06, tailM, 0.55,0.95,-1.33, 'rear');
    addBox(g, 1.35,0.14,0.14, mat(0x444444), 0,0.45,-1.42, 'rear');
    // driver
    addBox(g, 0.45,0.55,0.3, mat(0xb59b62), 0,1.55,0.35);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8), mat(0x8a5a3c)); head.position.set(0,1.95,0.38); g.add(head);
    [[0,1.15],[-0.68,-0.85],[0.68,-0.85]].forEach(([x,z])=>{const w=new THREE.Mesh(WHEEL_GEO,mat(0x111111)); w.scale.set(1,0.85,0.85); w.position.set(x,0.3,z); g.add(w); wheels.push(w);});
    ud.headY = 1.25; ud.paint = [body, top];
  } else if (kind === 'bus') {
    const body = mat(c1), band = mat(c2), dark = mat(0x1f2a33);
    const dd = def.style === 'dd';
    const bh = dd ? 4.2 : 2.5;
    addBox(g, wid,bh,len, body, 0,0.4+bh/2,0);
    addBox(g, wid+0.02,0.25,len*0.98, band, 0,0.75,0);
    addBox(g, wid+0.03,def.style === 'sleeper' ? 0.55 : 0.95,len*0.82, dark, 0,2.15,-len*0.05);
    if (dd) addBox(g, wid+0.03,0.9,len*0.9, dark, 0,3.75,0);
    addBox(g, wid*0.98,0.15,len*0.98, band, 0,0.45+bh,0);
    if (def.style === 'electric') addBox(g, wid*0.6,0.3,len*0.5, mat(0x7fb3d5), 0,0.6+bh,0);
    if (def.style === 'express' || def.style === 'sleeper') addBox(g, wid+0.04,0.12,len*0.95, mat(c2), 0,1.35,0);
    addBox(g, wid*0.9,1.1,0.06, GLASS(), 0,2.15,len/2+0.02, 'front');
    addBox(g, wid*0.8,0.8,0.06, GLASS(), 0,2.2,-len/2-0.02, 'rear');
    addBox(g, 0.35,0.22,0.08, headM, -wid*0.36,0.95,len/2+0.04, 'front');
    addBox(g, 0.35,0.22,0.08, headM, wid*0.36,0.95,len/2+0.04, 'front');
    addBox(g, wid+0.05,0.3,0.25, mat(0x333333), 0,0.45,len/2+0.1, 'front');
    addBox(g, 0.3,0.25,0.08, tailM, -wid*0.38,1.0,-len/2-0.04, 'rear');
    addBox(g, 0.3,0.25,0.08, tailM, wid*0.38,1.0,-len/2-0.04, 'rear');
    addBox(g, wid+0.05,0.3,0.25, mat(0x333333), 0,0.45,-len/2-0.1, 'rear');
    [len*0.33, -len*0.33].forEach(z=>[-wid/2+0.12, wid/2-0.12].forEach(x=>{const w=new THREE.Mesh(WHEEL_GEO_BIG,mat(0x111111)); w.position.set(x,0.5,z); g.add(w); wheels.push(w);}));
    ud.headY = 0.95; ud.paint = [body, band];
  } else if (kind === 'bike') {
    addBox(g, 0.35,0.5,1.7, mat(0x222222), 0,0.55,0);
    addBox(g, 0.42,0.35,0.9, mat(c1), 0,0.85,0.1);
    addBox(g, 0.45,0.6,0.32, mat(c2), 0,1.35,-0.1);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.17,8,6), mat(0x333333)); h.position.set(0,1.82,-0.05); g.add(h);
    [0.7,-0.7].forEach(z=>{const w=new THREE.Mesh(WHEEL_GEO,mat(0x111111)); w.scale.set(0.6,0.95,0.95); w.position.set(0,0.33,z); g.add(w); wheels.push(w);});
    ud.headY = 0.9;
  } else {
    // cars, taxis, police
    const st = def.style;
    const suv = def.id === 'taxi3' || def.lux === 'suv' || st === 'suv' || st === 'mpv';
    const sporty = def.id === 'car3' || def.id === 'car4' || def.id === 'car5' || def.lux === 'super' || def.lux === 'hyper' || st === 'coupe' || st === 'super' || st === 'hyper';
    const bodyH = suv ? (st === 'mpv' ? 0.95 : 0.85) : (def.lux === 'hyper' || st === 'hyper') ? 0.42 : (sporty ? 0.5 : st === 'retro' ? 0.7 : 0.62);
    const body = mat(kind === 'police' ? 0xf4f6f7 : c1), trim = mat(kind === 'police' ? 0x1f3a93 : c2);
    const y0 = 0.32 + bodyH/2;
    addBox(g, wid,bodyH,len, body, 0,y0,0);
    const cabH = suv ? 0.7 : (sporty ? 0.42 : st === 'retro' ? 0.62 : 0.55);
    const cabL = st === 'pickup' ? len*0.32 : st === 'mpv' ? len*0.66 : st === 'hatch' ? len*0.55 : len*(sporty?0.42:0.5);
    if (st === 'pickup') { addBox(g, wid*0.96,0.35,len*0.42, mat(c2), 0,0.32+bodyH+0.17,-len*0.27); }
    addBox(g, wid*0.86,cabH,cabL, mat(0x1f2a33), 0,y0+bodyH/2+cabH/2,-len*0.06);
    addBox(g, wid*0.88,0.06,cabL*0.9, body, 0,y0+bodyH/2+cabH+0.02,-len*0.06);
    if (kind === 'police') {
      addBox(g, wid+0.02,0.14,len*0.9, trim, 0,y0+0.05,0);
      const r = new THREE.Mesh(boxGeo(0.45,0.16,0.3), new THREE.MeshBasicMaterial({color:0xff2020})); r.position.set(-0.25,y0+bodyH/2+cabH+0.13,-len*0.06); g.add(r);
      const b = new THREE.Mesh(boxGeo(0.45,0.16,0.3), new THREE.MeshBasicMaterial({color:0x2050ff})); b.position.set(0.25,y0+bodyH/2+cabH+0.13,-len*0.06); g.add(b);
      ud.siren = [r, b];
    } else if (kind === 'taxi') {
      addBox(g, wid+0.02,0.12,len*0.92, trim, 0,y0+0.1,0);
      addBox(g, 0.6,0.2,0.3, mat(0xf2d21b), 0,y0+bodyH/2+cabH+0.15,-len*0.06);
    }
    if (def.lux) { // chrome strips, gold wheels trim, side skirts
      const chrome = new THREE.MeshLambertMaterial({color:0xdadfe3, emissive:0x222222});
      addBox(g, wid+0.04,0.05,len*0.9, chrome, 0,y0+bodyH/2-0.02,0);
      addBox(g, wid+0.06,0.12,len*0.7, mat(c2), 0,0.36,0);
      if (def.lux === 'hyper') { addBox(g, 0.12,0.5,len*0.35, mat(c2), -wid*0.35,y0+bodyH/2+0.25,-len*0.15); addBox(g, 0.12,0.5,len*0.35, mat(c2), wid*0.35,y0+bodyH/2+0.25,-len*0.15); }
    }
    if (sporty && kind !== 'police' && kind !== 'taxi') {
      addBox(g, wid*0.9,0.06,0.35, trim, 0,y0+bodyH/2+0.25,-len/2+0.15); // spoiler
      addBox(g, 0.08,0.22,0.08, trim, -wid*0.35,y0+bodyH/2+0.12,-len/2+0.15);
      addBox(g, 0.08,0.22,0.08, trim, wid*0.35,y0+bodyH/2+0.12,-len/2+0.15);
    }
    const ws = addBox(g, wid*0.84,cabH*0.95,0.05, GLASS(), 0,y0+bodyH/2+cabH/2,-len*0.06+cabL/2+0.03, 'front');
    ws.rotation.x = -0.35;
    const rg = addBox(g, wid*0.8,cabH*0.9,0.05, GLASS(), 0,y0+bodyH/2+cabH/2,-len*0.06-cabL/2-0.03, 'rear');
    rg.rotation.x = 0.35;
    addBox(g, 0.32,0.14,0.06, headM, -wid*0.33,y0+0.08,len/2+0.03, 'front');
    addBox(g, 0.32,0.14,0.06, headM, wid*0.33,y0+0.08,len/2+0.03, 'front');
    addBox(g, wid+0.04,0.22,0.18, mat(0x2b2b2b), 0,0.42,len/2+0.05, 'front');
    addBox(g, 0.3,0.13,0.06, tailM, -wid*0.36,y0+0.1,-len/2-0.03, 'rear');
    addBox(g, 0.3,0.13,0.06, tailM, wid*0.36,y0+0.1,-len/2-0.03, 'rear');
    addBox(g, wid+0.04,0.22,0.18, mat(0x2b2b2b), 0,0.42,-len/2-0.05, 'rear');
    [len*0.32, -len*0.32].forEach(z=>[-wid/2+0.05, wid/2-0.05].forEach(x=>{const w=new THREE.Mesh(WHEEL_GEO,mat(0x111111)); w.position.set(x,0.34,z); g.add(w); wheels.push(w);}));
    ud.headY = y0+0.08; ud.paint = [body, trim];
  }
  g.children.forEach(ch => { if (ch.userData.part) ud.parts.push(ch); });
  g.userData = ud;
  return g;
}

// Detach parts on one side (front / rear). Returns detached meshes in world space.
function breakParts(veh, side, count, scene, debris, impulse) {
  const ud = veh.userData;
  const cands = ud.parts.filter(p => p.userData.part === side && p.parent === veh);
  const out = [];
  for (let i = 0; i < count && cands.length; i++) {
    const k = Math.floor(Math.random()*cands.length);
    const p = cands.splice(k,1)[0];
    const wp = new THREE.Vector3(); p.getWorldPosition(wp);
    const wq = new THREE.Quaternion(); p.getWorldQuaternion(wq);
    veh.remove(p);
    p.position.copy(wp); p.quaternion.copy(wq);
    scene.add(p);
    debris.push({m:p, vx:(impulse.x||0)+(Math.random()-0.5)*4, vy:2.5+Math.random()*3, vz:(impulse.z||0)+(Math.random()-0.5)*4,
      ax:(Math.random()-0.5)*10, az:(Math.random()-0.5)*10, life:14});
    out.push(p);
  }
  return out;
}
function intactParts(veh, side){ return veh.userData.parts.filter(p=>p.userData.part===side && p.parent===veh).length; }

// People
const PERSON_G = {
  legs: new THREE.CylinderGeometry(0.2,0.25,0.9,8),
  body: new THREE.CylinderGeometry(0.24,0.21,0.62,8),
  head: new THREE.SphereGeometry(0.15,10,8),
  arm: new THREE.BoxGeometry(0.1,0.55,0.1),
};
const SKINS = [0x8a5a3c,0x6b4430,0xa06a46,0x5a3a26];
const SHIRTS = [0xe74c3c,0x3498db,0xf1c40f,0x27ae60,0x9b59b6,0xecf0f1,0xe67e22,0x16a085,0xd35400,0x2c3e50];
const LOWERS = [0xf4f1e6,0xf4f1e6,0x2c3e50,0x5d4037,0xf4f1e6,0x1f618d];
function makePerson(shirt, lower, skin) {
  const g = new THREE.Group();
  shirt = shirt ?? SHIRTS[Math.floor(Math.random()*SHIRTS.length)];
  lower = lower ?? LOWERS[Math.floor(Math.random()*LOWERS.length)];
  skin = skin ?? SKINS[Math.floor(Math.random()*SKINS.length)];
  const legs = new THREE.Mesh(PERSON_G.legs, mat(lower)); legs.position.y = 0.45;
  const body = new THREE.Mesh(PERSON_G.body, mat(shirt)); body.position.y = 1.18;
  const head = new THREE.Mesh(PERSON_G.head, mat(skin)); head.position.y = 1.66;
  const hair = new THREE.Mesh(PERSON_G.head, mat(0x1a1a1a)); hair.position.set(0,1.71,-0.03); hair.scale.set(1.02,0.7,1.02);
  const aL = new THREE.Mesh(PERSON_G.arm, mat(skin)); aL.position.set(-0.32,1.15,0);
  const aR = new THREE.Mesh(PERSON_G.arm, mat(skin)); aR.position.set(0.32,1.15,0);
  g.add(legs, body, head, hair, aL, aR);
  g.userData = {arms:[aL,aR]};
  return g;
}

// Elephant, optionally decorated for a procession
function makeElephant(decor) {
  const g = new THREE.Group();
  const grey = mat(0x5d5a58), dark = mat(0x4a4745);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6,12,10), grey); body.scale.set(1.0,0.95,1.45); body.position.y = 2.6; g.add(body);
  [[-0.75,1.15],[0.75,1.15],[-0.75,-1.2],[0.75,-1.2]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.46,2.0,8),grey); l.position.set(x,1.0,z); g.add(l);});
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.0,10,8), grey); head.position.set(0,3.25,2.15); g.add(head);
  let tz = 2.85, ty = 2.8;
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.28-i*0.03,0.3-i*0.03,0.55,7), dark); s.position.set(0,ty,tz); s.rotation.x = 0.25+i*0.12; g.add(s); ty -= 0.48; tz += 0.12 + i*0.02; }
  [-1,1].forEach(sx=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,6),dark); e.scale.set(0.25,1.0,0.8); e.position.set(sx*0.95,3.3,1.8); g.add(e);});
  [-1,1].forEach(sx=>{const t=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.8,6),mat(0xf3eedd)); t.position.set(sx*0.4,2.55,2.75); t.rotation.x=1.9; g.add(t);});
  if (decor) {
    const gold = new THREE.MeshLambertMaterial({color:0xd4a017, emissive:0x3a2a00});
    const cap = new THREE.Mesh(boxGeo(0.9,1.5,0.12), gold); cap.position.set(0,3.2,3.12); cap.rotation.x = -0.2; g.add(cap);
    const cloth = new THREE.Mesh(boxGeo(3.1,1.2,2.6), mat(0xa31515)); cloth.position.set(0,3.2,-0.1); g.add(cloth);
    [-1,0,1].forEach(i=>{ const p = makePerson(0xf4f1e6, 0xf4f1e6); p.scale.setScalar(0.85); p.position.set(0,4.0,i*0.75-0.1); g.add(p); });
    const um = new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.12,16), new THREE.MeshLambertMaterial({color:[0xe74c3c,0x27ae60,0xf1c40f,0x8e44ad][Math.floor(Math.random()*4)], emissive:0x220000}));
    um.position.set(0,6.4,-0.1); g.add(um);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.4,5), gold); pole.position.set(0,5.7,-0.1); g.add(pole);
  }
  return g;
}

function makeCow() {
  const g = new THREE.Group();
  const c = [0xf2efe8,0x8b5a2b,0xd8cfc0][Math.floor(Math.random()*3)];
  const m = mat(c);
  addBox(g, 0.75,0.75,1.7, m, 0,1.05,0);
  [[-0.27,0.6],[0.27,0.6],[-0.27,-0.6],[0.27,-0.6]].forEach(([x,z])=>addBox(g,0.16,0.75,0.16,m,x,0.38,z));
  addBox(g, 0.42,0.42,0.6, m, 0,1.3,1.05);
  addBox(g, 0.05,0.3,0.05, mat(0xe8e0d0), -0.18,1.62,1.0).rotation.z = 0.5;
  addBox(g, 0.05,0.3,0.05, mat(0xe8e0d0), 0.18,1.62,1.0).rotation.z = -0.5;
  addBox(g, 0.32,0.22,0.1, mat(0x3a2a20), 0,1.22,1.38);
  return g;
}
function makeDog() {
  const g = new THREE.Group();
  const m = mat([0xb5835a,0x3b2f2a,0xd9b98c][Math.floor(Math.random()*3)]);
  addBox(g, 0.32,0.32,0.8, m, 0,0.55,0);
  [[-0.11,0.28],[0.11,0.28],[-0.11,-0.28],[0.11,-0.28]].forEach(([x,z])=>addBox(g,0.08,0.4,0.08,m,x,0.2,z));
  addBox(g, 0.26,0.26,0.32, m, 0,0.78,0.5);
  addBox(g, 0.06,0.06,0.35, m, 0,0.7,-0.5).rotation.x = -0.6;
  return g;
}

// Text panel on the back of the player's vehicle: city, district, state
function rearPanelTexture(t, plate){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0,0,512,256);
  x.fillStyle = '#f4d03f'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const fit = (txt, y, size, w, font) => { let s2 = size; do { x.font = '800 ' + s2 + 'px ' + font; s2 -= 2; } while (x.measureText(txt).width > w && s2 > 12); x.fillText(txt, 256, y); };
  fit(t.nt, 52, 60, 500, '"Baloo Chettan 2","Baloo Thambi 2",sans-serif');
  x.fillStyle = '#ffffff'; fit(t.en, 122, 44, 500, '"Baloo Chettan 2",sans-serif');
  x.fillStyle = '#f7f3e3'; x.fillRect(96,168,320,78); x.strokeStyle = '#222'; x.lineWidth = 5; x.strokeRect(96,168,320,78);
  x.fillStyle = '#111'; x.font = '800 50px "Share Tech Mono",monospace'; x.fillText(plate, 256, 209);
  const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; return tx;
}
function attachRearPanel(veh, city, plate){
  const ud = veh.userData; if (ud.rear) { veh.remove(ud.rear); ud.rear.material.map.dispose(); }
  const k = ud.kind, L = ud.len, Wd = ud.wid;
  let w, h, y, z;
  if (k === 'auto') { w = 1.3; h = 0.65; y = 1.3; z = -1.345; }
  else if (k === 'bus') { w = Wd*0.85; h = w/2; y = 1.2; z = -L/2 - 0.05; }
  else { w = Wd*0.7; h = w/2; y = 0.75; z = -L/2 - 0.09; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: rearPanelTexture(rearText(city), plate)}));
  m.position.set(0, y, z); m.rotation.y = Math.PI; veh.add(m); ud.rear = m;
}
