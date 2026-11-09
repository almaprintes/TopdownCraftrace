// CraftRace · cálculo puro del instante de cruce. Experimental y sin efectos en
// los récords: se integrará en RaceScene cuando esté validado en dispositivos.
// No usa Date.now() ni timers; trabaja en la misma época de performance.now().
const finite = v => typeof v === 'number' && Number.isFinite(v);
const point = p => p && finite(p.x) && finite(p.y);
const cross = (x,y,u,v) => x*v-y*u;

/**
 * Returns 0..1 where the car segment crosses the finite gate in the required
 * direction; null for no crossing, wrong direction or invalid geometry.
 * Equivalent to crossing a segment within the current simulation step.
 */
export function directedGateCrossingFraction(previous,current,gate,velocity=null){
 if(!point(previous)||!point(current)||!point(gate?.a)||!point(gate?.b)||
    !point(gate?.normal))return null;
 const dx=current.x-previous.x,dy=current.y-previous.y;
 const gx=gate.b.x-gate.a.x,gy=gate.b.y-gate.a.y;
 const determinant=cross(dx,dy,gx,gy);
 if(Math.abs(determinant)<1e-9)return null;
 const qx=gate.a.x-previous.x,qy=gate.a.y-previous.y;
 const fraction=cross(qx,qy,gx,gy)/determinant;
 const alongGate=cross(qx,qy,dx,dy)/determinant;
 if(fraction<0||fraction>1||alongGate<0||alongGate>1)return null;
 const vx=point(velocity)&&velocity.x!==0?velocity.x:dx;
 const vy=point(velocity)&&velocity.y!==0?velocity.y:dy;
 if(vx*gate.normal.x+vy*gate.normal.y<=0)return null;
 return Math.min(1,Math.max(0,fraction));
}

/**
 * Map a geometric crossing to a monotonic timestamp.
 * The Phaser scene currently clamps physics delta to 50 ms. Mapping a 2 s
 * stall to 2 s of car movement would invent time that never got simulated.
 * Return reviewRequired rather than authoritatively homologating that lap.
 */
export function estimateSubframeGateTime({frameEndNowMs,rawFrameMs,
 simulatedFrameMs,fraction,clockOriginMs=null}){
 if(![frameEndNowMs,rawFrameMs,simulatedFrameMs,fraction].every(finite)||
   frameEndNowMs<0||rawFrameMs<0||simulatedFrameMs<0||
   fraction<0||fraction>1||
   (clockOriginMs!==null&&!finite(clockOriginMs)))
  throw Error('Datos subfotograma no válidos');
 const modeledMs=Math.min(rawFrameMs,simulatedFrameMs);
 const crossedAtMs=frameEndNowMs-(1-fraction)*modeledMs;
 return {
  crossedAtMs,
  elapsedMs:clockOriginMs===null?null:Math.max(0,crossedAtMs-clockOriginMs),
  lostPhysicsMs:Math.max(0,rawFrameMs-modeledMs),
  reviewRequired:rawFrameMs>modeledMs+0.5
 };
}

export function estimateDirectedGateCrossing({previous,current,gate,velocity,
 frameEndNowMs,rawFrameMs,simulatedFrameMs,clockOriginMs=null}){
 const fraction=directedGateCrossingFraction(previous,current,gate,velocity);
 if(fraction===null)return null;
 return {fraction,...estimateSubframeGateTime({frameEndNowMs,rawFrameMs,
  simulatedFrameMs,fraction,clockOriginMs})};
}
