// Deterministic physical guardrails for Karting Canarias.
// Previous automatic detection became fragile as the centerline was densified.
// This version uses explicit pairs of already-authored lane points that are known
// to run close together, builds the true grass median between their road edges,
// then smooths that median into long curved guardrails with matching collision.

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || scene?.track?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function xy(p, fallbackW = 150) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function catmull(a,b,c,d,t) {
  const t2=t*t, t3=t2*t;
  return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
}

function denseOpenSpline(ctrl) {
  if (!Array.isArray(ctrl) || ctrl.length < 2) return ctrl || [];
  if (ctrl.length === 2) {
    const out=[];
    const a=ctrl[0], b=ctrl[1];
    const len=Math.hypot(b.x-a.x,b.y-a.y);
    const steps=Math.max(6,Math.ceil(len/12));
    for (let i=0;i<=steps;i++) {
      const t=i/steps;
      out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }
    return out;
  }
  const out=[];
  const n=ctrl.length;
  const at=i=>ctrl[Math.max(0,Math.min(n-1,i))];
  for (let i=0;i<n-1;i++) {
    const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
    const chord=Math.hypot(p2.x-p1.x,p2.y-p1.y);
    const steps=Math.max(6,Math.min(24,Math.ceil(chord/10)));
    for (let s=0;s<steps;s++) {
      const t=s/steps;
      out.push({x:catmull(p0.x,p1.x,p2.x,p3.x,t),y:catmull(p0.y,p1.y,p2.y,p3.y,t)});
    }
  }
  out.push({...ctrl[n-1]});
  return out;
}

function medianPoint(a,b) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const d=Math.hypot(dx,dy) || 1;
  const ux=dx/d, uy=dy/d;
  const halfA=Number(a.width||150)*0.5;
  const halfB=Number(b.width||150)*0.5;
  const gap=Math.max(8,d-halfA-halfB);
  // Exact midpoint between the two asphalt edges, not between the centrelines.
  const offset=halfA+gap*0.5;
  return {x:a.x+ux*offset,y:a.y+uy*offset};
}

function drawSmooth(g,pts) {
  if (!pts?.length) return;
  g.beginPath();
  g.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length-1;i++) {
    const p=pts[i],q=pts[i+1];
    g.quadraticBezierTo(p.x,p.y,(p.x+q.x)*0.5,(p.y+q.y)*0.5);
  }
  const last=pts[pts.length-1];
  g.lineTo(last.x,last.y);
  g.strokePath();
}

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) { try { o?.destroy?.(); } catch (_) {} }
  for (const o of scene._kcDividerPhysics || []) { try { o?.destroy?.(); } catch (_) {} }
  try { scene._kcDividerGroup?.clear?.(true,true); } catch (_) {}
  scene._kcDividers=[];
  scene._kcDividerPhysics=[];

  const raw = Array.isArray(scene.track?.meta?.centerline)
    ? scene.track.meta.centerline
    : Array.isArray(scene.track?.centerline)
      ? scene.track.centerline
      : [];
  const fallbackW=Number(scene.track?.meta?.trackWidth || scene.track?.trackWidth || 150);
  const pts=raw.map(p=>xy(p,fallbackW));
  if (pts.length < 48) return [];

  // Curated medians taken from the current untangled Karting Canarias centerline.
  // Each list pairs points from two different nearby lanes, in travelling order,
  // so the resulting guardrail follows the actual corridor instead of guessing.
  const corridors=[
    [[9,46],[10,45],[11,44],[12,43]],
    [[14,42],[15,41],[16,40]],
    [[17,31],[18,30],[19,29]]
  ];

  const staticBodies=scene.physics.add.staticGroup();
  const placed=[];
  const physicsBodies=[];

  for (const corridor of corridors) {
    const controls=[];
    for (const [ia,ib] of corridor) {
      const a=pts[ia], b=pts[ib];
      if (!a || !b) continue;
      controls.push(medianPoint(a,b));
    }
    if (controls.length < 2) continue;

    const curve=denseOpenSpline(controls);
    if (curve.length < 5) continue;

    // Three-pass Armco look: shadow, steel rail, highlight.
    const rail=scene.add.graphics().setDepth(16.2);
    rail.lineStyle(12,0x000000,0.24); drawSmooth(rail,curve);
    rail.lineStyle(8,0x626b72,1); drawSmooth(rail,curve);
    rail.lineStyle(3,0xd8dee2,0.98); drawSmooth(rail,curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    // Regular roadside posts along actual arc length.
    const postSpacing=48;
    let total=0,nextPost=postSpacing;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1],b=curve[k];
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx);
      while (nextPost<=total+len) {
        const u=(nextPost-total)/len;
        const x=a.x+dx*u,y=a.y+dy*u;
        const post=scene.add.rectangle(x,y,4,12,0x41474c,1)
          .setStrokeStyle(1,0xb5bcc1,0.8)
          .setRotation(ang+Math.PI/2)
          .setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        nextPost+=postSpacing;
      }
      total+=len;
    }

    // Dense circular collision follows the identical smoothed median curve.
    const radius=9, step=10;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1],b=curve[k];
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx);
      const count=Math.max(1,Math.ceil(len/step));
      for (let s=0;s<=count;s++) {
        const u=s/count;
        const x=a.x+dx*u,y=a.y+dy*u;
        const c=scene.add.circle(x,y,radius,0x000000,0);
        scene.physics.add.existing(c,true);
        try { c.body.setCircle(radius); c.body.updateFromGameObject(); } catch (_) {}
        c.setVisible(false);
        c._kcBarrierAngle=ang;
        staticBodies.add(c);
        physicsBodies.push(c);
      }
    }
  }

  const onHit=(car,barrier)=>{
    try {
      const v=car?.body?.velocity;
      if (!v) return;
      const a=Number(barrier?._kcBarrierAngle||0);
      const tx=Math.cos(a),ty=Math.sin(a),nx=-ty,ny=tx;
      const tangent=v.x*tx+v.y*ty;
      const normal=v.x*nx+v.y*ny;
      const out=-normal*0.11;
      car.setVelocity(tx*tangent*0.90+nx*out,ty*tangent*0.90+ny*out);
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
