import assert from 'node:assert/strict';
import {directedGateCrossingFraction,estimateSubframeGateTime,
 estimateDirectedGateCrossing} from '../src/game/timing/subframeGateClock.js';

const gate={a:{x:0,y:-10},b:{x:0,y:10},normal:{x:1,y:0}};
const approximate=(a,b,label,tolerance=1e-7)=>
 assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
approximate(directedGateCrossingFraction({x:-10,y:0},{x:10,y:0},gate,
 {x:30,y:0}),0.5,'Paso por meta a mitad del frame');
assert.equal(directedGateCrossingFraction({x:10,y:0},{x:-10,y:0},gate,{x:-30,y:0}),null,
 'Contradirección no se cronometra');
assert.equal(directedGateCrossingFraction({x:-10,y:20},{x:10,y:20},gate,{x:30,y:0}),null,
 'Cruce fuera del segmento de meta no se cronometra');
assert.equal(directedGateCrossingFraction({x:-10,y:0},{x:-5,y:0},gate,{x:30,y:0}),null,
 'Acercarse sin cruzar no cuenta');
assert.equal(directedGateCrossingFraction({x:0,y:-10},{x:0,y:10},gate),null,
 'Movimiento paralelo no cuenta');
assert.equal(directedGateCrossingFraction({x:NaN,y:0},{x:2,y:0},gate),null,
 'Coordenadas inválidas no se admiten');

for(const fps of [60,30,15]){
 const frameMs=1000/fps;
 for(let i=0;i<1000;i++){
  const fraction=((i*7919)%997+.5)/997;
  const before={x:-fraction,y:0},after={x:1-fraction,y:0};
  const now=8432+(1-fraction)*frameMs;
  const crossed=estimateDirectedGateCrossing({previous:before,current:after,
    gate,velocity:{x:1,y:0},frameEndNowMs:now,rawFrameMs:frameMs,
    simulatedFrameMs:frameMs,clockOriginMs:0});
  approximate(crossed.fraction,fraction,`geometría ${fps} FPS ${i}`);
  approximate(crossed.crossedAtMs,8432,`subfotograma ${fps} FPS ${i}`);
  assert.equal(crossed.reviewRequired,false);
 }
}
// Un salto de 1 o 3 segundos solo mueve la física hasta 50 ms por update.
// No se permite retroceder 1 o 3 s desde el cruce para regalar tiempo.
for(const stall of [1000,3000]){
 const sample=estimateSubframeGateTime({frameEndNowMs:12000,
   rawFrameMs:stall,simulatedFrameMs:50,fraction:0.25,clockOriginMs:1000});
 approximate(sample.crossedAtMs,11962.5,'Cruce sin adelanto por bloqueo');
 assert.equal(sample.reviewRequired,true);
 assert.equal(sample.lostPhysicsMs,stall-50);
}
const beforePause=estimateSubframeGateTime({frameEndNowMs:5000,
 rawFrameMs:50,simulatedFrameMs:50,fraction:1,clockOriginMs:1000});
const afterPause=estimateSubframeGateTime({frameEndNowMs:30000,
 rawFrameMs:50,simulatedFrameMs:50,fraction:1,clockOriginMs:21000});
assert.equal(beforePause.elapsedMs,4000);
assert.equal(afterPause.elapsedMs,9000,
 'El origen desplazado durante 20 s de pausa preserva el tiempo de carrera');
assert.throws(()=>estimateSubframeGateTime({frameEndNowMs:1000,
 rawFrameMs:20,simulatedFrameMs:20,fraction:1.1}));
console.log('CraftRace subframe: 3.000 cruces 60/30/15 FPS, 1/3 s FPS stall, dirección, geometría y pausas OK');
console.log('SOLO DIAGNÓSTICO: no reemplaza aún el timestamp de RaceScene ni homologa marcas online.');
