// Explicit physical scenery for Karting Canarias, traced from the user's annotated
// technical map. Grey annotations = guardrails. Magenta annotations = grandstands.
// No automatic lane detection is used here: these world-space paths are intentional.

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || scene?.track?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function catmull(a,b,c,d,t) {
  const t2=t*t, t3=t2*t;
  return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
}

function denseOpenSpline(ctrl, stepPx=10) {
  if (!Array.isArray(ctrl) || ctrl.length < 2) return ctrl || [];
  if (ctrl.length === 2) {
    const a=ctrl[0], b=ctrl[1], len=Math.hypot(b.x-a.x,b.y-a.y);
    const steps=Math.max(2,Math.ceil(len/stepPx));
    return Array.from({length:steps+1},(_,i)=>({x:a.x+(b.x-a.x)*(i/steps),y:a.y+(b.y-a.y)*(i/steps)}));
  }
  const out=[], n=ctrl.length;
  const at=i=>ctrl[Math.max(0,Math.min(n-1,i))];
  for (let i=0;i<n-1;i++) {
    const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
    const chord=Math.hypot(p2.x-p1.x,p2.y-p1.y);
    const steps=Math.max(4,Math.min(36,Math.ceil(chord/stepPx)));
    for (let s=0;s<steps;s++) {
      const t=s/steps;
      out.push({x:catmull(p0.x,p1.x,p2.x,p3.x,t),y:catmull(p0.y,p1.y,p2.y,p3.y,t)});
    }
  }
  out.push({...ctrl[n-1]});
  return out;
}

function drawSmooth(g,pts) {
  if (!pts?.length) return;
  g.beginPath(); g.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length-1;i++) {
    const p=pts[i],q=pts[i+1];
    g.quadraticBezierTo(p.x,p.y,(p.x+q.x)*0.5,(p.y+q.y)*0.5);
  }
  const last=pts[pts.length-1]; g.lineTo(last.x,last.y); g.strokePath();
}

function addCircleCollision(scene, group, store, curve, radius=10, spacing=10) {
  for (let k=1;k<curve.length;k++) {
    const a=curve[k-1],b=curve[k];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if (len<0.5) continue;
    const ang=Math.atan2(dy,dx), count=Math.max(1,Math.ceil(len/spacing));
    for (let s=0;s<=count;s++) {
      const u=s/count, x=a.x+dx*u, y=a.y+dy*u;
      const c=scene.add.circle(x,y,radius,0x000000,0);
      scene.physics.add.existing(c,true);
      try { c.body.setCircle(radius); c.body.updateFromGameObject(); } catch (_) {}
      c.setVisible(false); c._kcBarrierAngle=ang;
      group.add(c); store.push(c);
    }
  }
}

function addGuardrail(scene, group, placed, physicsBodies, controls) {
  const curve=denseOpenSpline(controls,9);
  if (curve.length<3) return;

  const rail=scene.add.graphics().setDepth(16.2);
  rail.lineStyle(13,0x000000,0.24); drawSmooth(rail,curve);
  rail.lineStyle(9,0x5f676d,1); drawSmooth(rail,curve);
  rail.lineStyle(3,0xdbe1e5,0.98); drawSmooth(rail,curve);
  scene.uiCam?.ignore?.(rail); placed.push(rail);

  let total=0,nextPost=48;
  for (let k=1;k<curve.length;k++) {
    const a=curve[k-1],b=curve[k],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if (len<0.5) continue;
    const ang=Math.atan2(dy,dx);
    while (nextPost<=total+len) {
      const u=(nextPost-total)/len, x=a.x+dx*u, y=a.y+dy*u;
      const post=scene.add.rectangle(x,y,4,13,0x41474c,1)
        .setStrokeStyle(1,0xb8c0c5,0.82).setRotation(ang+Math.PI/2).setDepth(16.25);
      scene.uiCam?.ignore?.(post); placed.push(post); nextPost+=48;
    }
    total+=len;
  }

  addCircleCollision(scene,group,physicsBodies,curve,10,9);
}

function addGrandstand(scene, group, placed, physicsBodies, controls, width) {
  const curve=denseOpenSpline(controls,10);
  if (curve.length<3) return;

  // Shadow + structural base + rows of seats. The whole stand follows the user's
  // magenta stroke rather than inventing a new footprint.
  const stand=scene.add.graphics().setDepth(15.9);
  stand.lineStyle(width+12,0x05080a,0.42); drawSmooth(stand,curve);
  stand.lineStyle(width,0x8f123f,1); drawSmooth(stand,curve);
  stand.lineStyle(Math.max(5,width*0.62),0xd61d68,1); drawSmooth(stand,curve);
  stand.lineStyle(3,0xff8db8,0.86); drawSmooth(stand,curve);
  scene.uiCam?.ignore?.(stand); placed.push(stand);

  // Light seat separators / supports at regular intervals.
  let total=0,next=42;
  for (let k=1;k<curve.length;k++) {
    const a=curve[k-1],b=curve[k],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if (len<0.5) continue;
    const ang=Math.atan2(dy,dx);
    while (next<=total+len) {
      const u=(next-total)/len, x=a.x+dx*u, y=a.y+dy*u;
      const rib=scene.add.rectangle(x,y,3,width*0.72,0xffd4e4,0.55)
        .setRotation(ang+Math.PI/2).setDepth(15.95);
      scene.uiCam?.ignore?.(rib); placed.push(rib); next+=42;
    }
    total+=len;
  }

  // Collision is intentionally a little narrower than the visible grandstand so a
  // visual graze does not feel sticky, while driving through it is impossible.
  addCircleCollision(scene,group,physicsBodies,curve,Math.max(18,width*0.38),14);
}

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) { try { o?.destroy?.(); } catch (_) {} }
  for (const o of scene._kcDividerPhysics || []) { try { o?.destroy?.(); } catch (_) {} }
  try { scene._kcDividerGroup?.clear?.(true,true); } catch (_) {}
  scene._kcDividers=[]; scene._kcDividerPhysics=[];

  // Traced from the 823x1536 technical-map annotation using the map's exact
  // 3000x5600 world-coordinate scale. These five paths correspond one-for-one with
  // the five grey strokes supplied by the user.
  const guardrails=[
    [
      {x:1097,y:1827},{x:1097,y:1619},{x:1163,y:1309},{x:1316,y:1207},
      {x:1407,y:1199},{x:1513,y:1225},{x:1586,y:1305},{x:1673,y:1462},
      {x:1691,y:1896},{x:1742,y:2093},{x:1775,y:2450}
    ],
    [
      {x:1429,y:1546},{x:1505,y:2228},{x:1309,y:2731},{x:1265,y:3062},{x:1290,y:3084}
    ],
    [
      {x:1881,y:2516},{x:2070,y:2454},{x:2118,y:2465},{x:2143,y:2512},
      {x:2162,y:2647},{x:2125,y:2906},{x:2070,y:3103}
    ],
    [
      {x:1721,y:2712},{x:1710,y:3369},{x:1823,y:4014},{x:1801,y:4411},{x:1750,y:4583}
    ],
    [
      {x:1148,y:3489},{x:1294,y:3566},{x:1451,y:3733},{x:1498,y:4047},
      {x:1473,y:4288},{x:1495,y:4382},{x:1527,y:4415}
    ]
  ];

  // Two magenta grandstand strokes from the same annotated map.
  const grandstands=[
    { width:62, path:[
      {x:1245,y:4770},{x:1320,y:4720},{x:1470,y:4755},{x:1585,y:4760},{x:1705,y:4730}
    ]},
    { width:76, path:[
      {x:1080,y:5060},{x:1240,y:5160},{x:1400,y:5200},{x:1545,y:5190},{x:1715,y:5120}
    ]}
  ];

  const staticBodies=scene.physics.add.staticGroup();
  const placed=[], physicsBodies=[];

  guardrails.forEach(path=>addGuardrail(scene,staticBodies,placed,physicsBodies,path));
  grandstands.forEach(g=>addGrandstand(scene,staticBodies,placed,physicsBodies,g.path,g.width));

  const onHit=(car,barrier)=>{
    try {
      const v=car?.body?.velocity; if (!v) return;
      const a=Number(barrier?._kcBarrierAngle||0),tx=Math.cos(a),ty=Math.sin(a),nx=-ty,ny=tx;
      const tangent=v.x*tx+v.y*ty, normal=v.x*nx+v.y*ny;
      const out=-normal*0.10;
      car.setVelocity(tx*tangent*0.88+nx*out,ty*tangent*0.88+ny*out);
    } catch (_) {}
  };

  scene._kcDividerCollider=scene.physics.add.collider(scene.carBody,staticBodies,onHit,undefined,scene);
  for (const ai of scene.gridCars||[]) {
    if (ai?.body?.scene) { try { scene.physics.add.collider(ai.body,staticBodies); } catch (_) {} }
  }

  scene._kcDividers=placed;
  scene._kcDividerPhysics=physicsBodies;
  scene._kcDividerGroup=staticBodies;
  return placed;
}
