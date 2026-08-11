// Physical curved guardrails for Karting Canarias.
// The source centerline is densified with a closed Catmull-Rom spline before
// offsetting it. Guardrails then follow the road curvature with many samples.

function xy(p, fallbackW = 150) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function angleDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function circularIndexDistance(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function catmull(a, b, c, d, t) {
  const t2 = t*t, t3 = t2*t;
  return 0.5 * ((2*b) + (-a+c)*t + (2*a-5*b+4*c-d)*t2 + (-a+3*b-3*c+d)*t3);
}

function buildDenseClosedSpline(src, fallbackW) {
  if (!Array.isArray(src) || src.length < 4) return src || [];
  const base = src.slice();
  if (base.length > 2) {
    const a = base[0], b = base[base.length - 1];
    if (Math.hypot(a.x-b.x, a.y-b.y) < 1) base.pop();
  }
  const n = base.length;
  const dense = [];
  const at = i => base[(i+n)%n];
  for (let i=0;i<n;i++) {
    const p0=at(i-1), p1=at(i), p2=at(i+1), p3=at(i+2);
    const chord = Math.max(1, Math.hypot(p2.x-p1.x,p2.y-p1.y));
    const steps = Math.max(5, Math.min(20, Math.ceil(chord/10)));
    for (let s=0;s<steps;s++) {
      const t=s/steps;
      dense.push({
        x:catmull(p0.x,p1.x,p2.x,p3.x,t),
        y:catmull(p0.y,p1.y,p2.y,p3.y,t),
        width:Math.max(50,catmull(Number(p0.width||fallbackW),Number(p1.width||fallbackW),Number(p2.width||fallbackW),Number(p3.width||fallbackW),t))
      });
    }
  }
  return dense;
}

function tangentAt(pts,i) {
  const n=pts.length;
  const a=pts[(i-2+n)%n], b=pts[(i+2)%n];
  const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
  return {tx:dx/len,ty:dy/len,angle:Math.atan2(dy,dx)};
}

function drawSmoothPolyline(g,pts) {
  if (!pts?.length) return;
  g.beginPath();
  g.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length-1;i++) {
    const p=pts[i], q=pts[i+1];
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

  const raw=Array.isArray(scene.track?.meta?.centerline)?scene.track.meta.centerline:[];
  const fallbackW=Number(scene.track?.meta?.trackWidth||150);
  const sparse=raw.map(p=>xy(p,fallbackW)).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  const pts=buildDenseClosedSpline(sparse,fallbackW);
  const n=pts.length;
  if (n<24) return [];

  // IMPORTANT: after densification we must search BOTH directions around the closed
  // spline. Restricting j to i+1 caused most candidate runs to vanish on the latter
  // half of the lap. Each sample now finds its nearest genuinely separate lane.
  const candidate=new Array(n).fill(null);
  for (let i=0;i<n;i++) {
    const p=pts[i], ti=tangentAt(pts,i);
    let best=null;
    for (let j=0;j<n;j++) {
      if (i===j || circularIndexDistance(i,j,n)<24) continue;
      const q=pts[j], tj=tangentAt(pts,j);
      const parallel=Math.min(angleDiff(ti.angle,tj.angle),Math.abs(Math.PI-angleDiff(ti.angle,tj.angle)));
      if (parallel>0.70) continue;
      const dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy);
      const halfA=Number(p.width||fallbackW)*0.5;
      const halfB=Number(q.width||fallbackW)*0.5;
      const edgeGap=d-halfA-halfB;
      if (edgeGap<10 || edgeGap>205) continue;
      if (!best || edgeGap<best.edgeGap) {
        const cross=ti.tx*dy-ti.ty*dx;
        best={j,edgeGap,side:cross>=0?1:-1,d};
      }
    }
    candidate[i]=best;
  }

  // Turn detections into long stable runs. Bridge a few holes and tolerate momentary
  // side noise, but require the majority side to stay consistent.
  const runs=[];
  let i=0;
  while (i<n) {
    if (!candidate[i]) { i++; continue; }
    const start=i;
    const samples=[];
    let lastGood=i, holes=0;
    while (i<n) {
      const c=candidate[i];
      if (c) {
        samples.push({idx:i,side:c.side});
        lastGood=i;
        holes=0;
        i++;
        continue;
      }
      if (holes<4) { holes++; i++; continue; }
      break;
    }
    if (samples.length<8 || lastGood-start<7) continue;
    const sideScore=samples.reduce((s,v)=>s+v.side,0);
    const side=sideScore>=0?1:-1;
    const matching=samples.filter(v=>v.side===side).length;
    if (matching/samples.length<0.62) continue;
    runs.push({start,end:lastGood,side});
  }

  // Dedupe using the actual MEDIAN position. Both neighboring lanes calculate nearly
  // the same midpoint, so mirrored duplicate runs collapse cleanly.
  runs.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
  const chosen=[];
  for (const run of runs) {
    const mid=Math.floor((run.start+run.end)*0.5);
    const p=pts[mid], t=tangentAt(pts,mid), near=candidate[mid];
    if (!near) continue;
    const half=Number(p.width||fallbackW)*0.5;
    const offset=half+near.edgeGap*0.5;
    const probe={x:p.x+(-t.ty)*run.side*offset,y:p.y+t.tx*run.side*offset};
    if (chosen.some(c=>Math.hypot(probe.x-c.probe.x,probe.y-c.probe.y)<55)) continue;
    chosen.push({...run,probe});
    if (chosen.length>=14) break;
  }

  const staticBodies=scene.physics.add.staticGroup();
  const placed=[];
  const physicsBodies=[];

  for (const run of chosen) {
    const curve=[];
    for (let k=run.start;k<=run.end;k++) {
      const p=pts[k], t=tangentAt(pts,k), near=candidate[k];
      if (!near) continue;
      const half=Number(p.width||fallbackW)*0.5;
      // Put the guardrail in the middle of the grass median between both road edges.
      // This keeps it safely outside the asphalt while still close to both lanes.
      const offset=half+Math.max(8,near.edgeGap*0.5);
      curve.push({x:p.x+(-t.ty)*run.side*offset,y:p.y+t.tx*run.side*offset,angle:t.angle});
    }
    if (curve.length<6) continue;

    const rail=scene.add.graphics().setDepth(16.2);
    rail.lineStyle(11,0x000000,0.22); drawSmoothPolyline(rail,curve);
    rail.lineStyle(7,0x626b72,1); drawSmoothPolyline(rail,curve);
    rail.lineStyle(3,0xd4dade,0.96); drawSmoothPolyline(rail,curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    let accumulated=0;
    const postSpacing=52;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1],b=curve[k],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx);
      const prev=accumulated;
      accumulated+=len;
      let next=Math.ceil(prev/postSpacing)*postSpacing;
      if (next<=prev+0.01) next+=postSpacing;
      while (next<=accumulated) {
        const u=(next-prev)/len;
        const x=a.x+dx*u,y=a.y+dy*u;
        const post=scene.add.rectangle(x,y,4,12,0x40464b,1).setStrokeStyle(1,0xaab1b6,0.72).setRotation(ang+Math.PI/2).setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        next+=postSpacing;
      }
    }

    const physRadius=9, physStep=10;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1],b=curve[k],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx), count=Math.max(1,Math.ceil(len/physStep));
      for (let s=0;s<=count;s++) {
        const u=s/count,x=a.x+dx*u,y=a.y+dy*u;
        const c=scene.add.circle(x,y,physRadius,0x000000,0);
        scene.physics.add.existing(c,true);
        try { c.body.setCircle(physRadius); c.body.updateFromGameObject(); } catch (_) {}
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
      const a=Number(barrier?._kcBarrierAngle||0),tx=Math.cos(a),ty=Math.sin(a),nx=-ty,ny=tx;
      const tangentSpeed=v.x*tx+v.y*ty,normalSpeed=v.x*nx+v.y*ny;
      const outNormal=-normalSpeed*0.11;
      car.setVelocity(tx*tangentSpeed*0.90+nx*outNormal,ty*tangentSpeed*0.90+ny*outNormal);
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
