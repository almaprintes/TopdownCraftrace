// Physical curved guardrails for Karting Canarias.
// Strategy: keep the original sparse-centerline detector that was proven to render
// barriers, then smooth ONLY the final offset rail path. This avoids breaking lane
// detection while still giving curves many intermediate nodes.

function xy(p, fallbackW = 150) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function angleDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));
}

function circularIndexDistance(a,b,n) {
  const d=Math.abs(a-b);
  return Math.min(d,n-d);
}

function isKartingCanarias(scene) {
  const key=String(scene?.trackKey||'').toLowerCase();
  const name=String(scene?.track?.meta?.name||scene?.track?.name||'').toLowerCase();
  return key.includes('karting-canarias')||key.includes('karting_canarias')||name.includes('karting canarias');
}

function tangentAt(pts,i) {
  const n=pts.length;
  const a=pts[(i-1+n)%n], b=pts[(i+1)%n];
  const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
  return {tx:dx/len,ty:dy/len,angle:Math.atan2(dy,dx)};
}

function catmull(a,b,c,d,t) {
  const t2=t*t, t3=t2*t;
  return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
}

function densifyOpenCurve(src, targetStep=10) {
  if (!Array.isArray(src) || src.length < 3) return src || [];
  const out=[];
  const n=src.length;
  const at=i=>src[Math.max(0,Math.min(n-1,i))];
  for (let i=0;i<n-1;i++) {
    const p0=at(i-1), p1=at(i), p2=at(i+1), p3=at(i+2);
    const chord=Math.max(1,Math.hypot(p2.x-p1.x,p2.y-p1.y));
    const steps=Math.max(3,Math.min(24,Math.ceil(chord/targetStep)));
    for (let s=0;s<steps;s++) {
      const t=s/steps;
      out.push({
        x:catmull(p0.x,p1.x,p2.x,p3.x,t),
        y:catmull(p0.y,p1.y,p2.y,p3.y,t)
      });
    }
  }
  out.push({...src[n-1]});
  return out;
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
  for (const o of scene._kcDividers||[]) { try { o?.destroy?.(); } catch (_) {} }
  for (const o of scene._kcDividerPhysics||[]) { try { o?.destroy?.(); } catch (_) {} }
  try { scene._kcDividerGroup?.clear?.(true,true); } catch (_) {}
  scene._kcDividers=[];
  scene._kcDividerPhysics=[];

  // IMPORTANT: use the authored centerline for detection. This is the version that
  // previously produced visible guardrails reliably.
  const raw=Array.isArray(scene.track?.meta?.centerline)?scene.track.meta.centerline:[];
  const fallbackW=Number(scene.track?.meta?.trackWidth||150);
  const pts=raw.map(p=>xy(p,fallbackW)).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  const n=pts.length;
  if (n<12) return [];

  const candidate=new Array(n).fill(null);
  for (let i=0;i<n;i++) {
    const p=pts[i], ti=tangentAt(pts,i);
    let best=null;
    for (let j=0;j<n;j++) {
      if (circularIndexDistance(i,j,n)<6) continue;
      if (i>=j) continue;
      const q=pts[j], tj=tangentAt(pts,j);
      const parallel=Math.min(angleDiff(ti.angle,tj.angle),Math.abs(Math.PI-angleDiff(ti.angle,tj.angle)));
      if (parallel>0.62) continue;
      const dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy);
      const halfA=Number(p.width||fallbackW)*0.5;
      const halfB=Number(q.width||fallbackW)*0.5;
      const edgeGap=d-halfA-halfB;
      if (edgeGap<16 || edgeGap>190) continue;
      if (!best || edgeGap<best.edgeGap) {
        const cross=ti.tx*dy-ti.ty*dx;
        best={j,edgeGap,side:cross>=0?1:-1,d};
      }
    }
    candidate[i]=best;
  }

  const runs=[];
  let i=0;
  while (i<n) {
    const c=candidate[i];
    if (!c) { i++; continue; }
    const start=i, side=c.side;
    let last=i, good=1, misses=0;
    i++;
    while (i<n) {
      const next=candidate[i];
      if (next && next.side===side) {
        good++; last=i; misses=0; i++; continue;
      }
      if (!next && misses<1) { misses++; i++; continue; }
      break;
    }
    if (good>=3 && last-start>=3) runs.push({start,end:last,side});
  }

  runs.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
  const chosen=[];
  for (const run of runs) {
    const mid=Math.floor((run.start+run.end)*0.5);
    const p=pts[mid], t=tangentAt(pts,mid);
    const half=Number(p.width||fallbackW)*0.5;
    const probe={x:p.x+(-t.ty)*run.side*(half+18),y:p.y+t.tx*run.side*(half+18)};
    if (chosen.some(c=>Math.hypot(probe.x-c.probe.x,probe.y-c.probe.y)<45)) continue;
    chosen.push({...run,probe});
    if (chosen.length>=12) break;
  }

  const staticBodies=scene.physics.add.staticGroup();
  const placed=[];
  const physicsBodies=[];

  for (const run of chosen) {
    const sparseCurve=[];
    for (let k=run.start;k<=run.end;k++) {
      const p=pts[k], t=tangentAt(pts,k), near=candidate[k];
      const half=Number(p.width||fallbackW)*0.5;
      const extra=Math.max(14,Math.min(24,Number(near?.edgeGap||30)*0.32));
      const offset=half+extra;
      sparseCurve.push({
        x:p.x+(-t.ty)*run.side*offset,
        y:p.y+t.tx*run.side*offset
      });
    }
    if (sparseCurve.length<3) continue;

    // Smooth AFTER detection. This is the key difference: detection remains stable,
    // while the visible/physical rail gets many nodes and follows bends naturally.
    const curve=densifyOpenCurve(sparseCurve,9);

    const rail=scene.add.graphics().setDepth(16.2);
    rail.lineStyle(11,0x000000,0.24); drawSmoothPolyline(rail,curve);
    rail.lineStyle(7,0x626b72,1); drawSmoothPolyline(rail,curve);
    rail.lineStyle(3,0xd4dade,0.96); drawSmoothPolyline(rail,curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    const postSpacing=52;
    let distanceTotal=0, nextPost=postSpacing;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1], b=curve[k], dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx);
      while (nextPost<=distanceTotal+len) {
        const u=(nextPost-distanceTotal)/len;
        const x=a.x+dx*u, y=a.y+dy*u;
        const post=scene.add.rectangle(x,y,4,12,0x40464b,1)
          .setStrokeStyle(1,0xaab1b6,0.72)
          .setRotation(ang+Math.PI/2)
          .setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        nextPost+=postSpacing;
      }
      distanceTotal+=len;
    }

    const physRadius=9, physStep=10;
    for (let k=1;k<curve.length;k++) {
      const a=curve[k-1],b=curve[k],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if (len<0.5) continue;
      const ang=Math.atan2(dy,dx), count=Math.max(1,Math.ceil(len/physStep));
      for (let s=0;s<=count;s++) {
        const u=s/count, x=a.x+dx*u, y=a.y+dy*u;
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
      const a=Number(barrier?._kcBarrierAngle||0), tx=Math.cos(a), ty=Math.sin(a), nx=-ty, ny=tx;
      const tangentSpeed=v.x*tx+v.y*ty, normalSpeed=v.x*nx+v.y*ny;
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
