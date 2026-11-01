// Explicitly opt-in diagnostic, NEVER started during normal gameplay.
// Counts selected JS->WebGL draw invocations for up to maxFrames renderer
// frames. It cannot measure GPU time, actual power draw, hardware triangles,
// native compositor work, or every possible draw extension.
//
// We patch only *own properties* of one GL context and restore exact previous
// descriptors. If a native method is not overrideable, leave it untouched.
// This counter necessarily adds JavaScript overhead while running: do not
// compare frame timings or Power Profiler energy with this enabled.
const DRAW_METHODS=Object.freeze([
  'drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'
]);

const formatAverage=(value,total)=>total?Number((value/total).toFixed(2)):0;

export function beginIosWebglDrawCallSample({
  game, maxFrames=90, timeoutMs=8000, onComplete=()=>{},
  scheduler={
    set:(fn,delay)=>setTimeout(fn,delay),
    clear:(id)=>clearTimeout(id)
  }
}={}){
  const gl=game?.renderer?.gl;
  const emitter=game?.events;
  if(!gl||!emitter?.on||!emitter?.off)
    return {ok:false,reason:'CONTEXTO WEBGL O EVENTOS NO DISPONIBLES'};
  const keys=DRAW_METHODS.filter(k=>typeof gl[k]==='function');
  if(!keys.length)return{ok:false,reason:'WEBGL SIN DRAW METHODS'};
  const total={};
  const max={};
  for(const key of keys){total[key]=0;max[key]=0;}
  const originalProperties=[];
  const frameCounts={};
  const frameDraws=[];
  let frames=0,stopped=false,timeoutId=null,renderStarted=false;

  const restore=()=>{
    // Restore in reverse order. A JS wrapper must never survive the sample.
    for(let i=originalProperties.length-1;i>=0;i--){
      const {key,own}=originalProperties[i];
      try{
        if(own)Object.defineProperty(gl,key,own);
        else delete gl[key];
      }catch{/* never throw during cleanup */}
    }
    originalProperties.length=0;
  };
  const complete=(reason='FRAMES')=>{
    if(stopped)return null;
    stopped=true;
    if(timeoutId!=null)scheduler.clear(timeoutId);
    emitter.off('prerender',pre);
    emitter.off('postrender',post);
    restore();
    const calls=Object.values(total).reduce((a,b)=>a+b,0);
    const result={
      frames,
      maxFrames,
      reason,
      drawCalls:calls,
      drawPerFrame:formatAverage(calls,frames),
      maxDrawPerFrame:frameDraws.length?Math.max(...frameDraws):0,
      methods:{...total},
      methodMaxPerFrame:{...max},
      warning:'Suma de llamadas JS draw* interceptadas, NO tiempo GPU ni energía; añade overhead al medir.'
    };
    try{onComplete(result);}catch{}
    return result;
  };
  const pre=()=>{
    renderStarted=true;
    for(const key of keys)frameCounts[key]=0;
  };
  const post=()=>{
    if(!renderStarted)return;
    renderStarted=false;
    let sum=0;
    for(const key of keys){
      const n=frameCounts[key]||0;
      total[key]+=n;
      max[key]=Math.max(max[key],n);
      sum+=n;
    }
    frameDraws.push(sum);
    frames++;
    if(frames>=maxFrames)complete('FRAMES');
  };

  try{
    for(const key of keys){
      const own=Object.getOwnPropertyDescriptor(gl,key);
      const method=gl[key];
      // The native instance may reject a shadowing property.
      Object.defineProperty(gl,key,{
        configurable:true,writable:true,enumerable:false,
        value:function(...args){
          if(renderStarted&&!stopped)frameCounts[key]=(frameCounts[key]||0)+1;
          return Reflect.apply(method,this,args);
        }
      });
      originalProperties.push({key,own});
    }
    emitter.on('prerender',pre);
    emitter.on('postrender',post);
    timeoutId=scheduler.set(()=>complete('TIMEOUT'),Math.max(1000,Number(timeoutMs)||8000));
    return {ok:true,cancel:()=>complete('CANCELLED')};
  }catch(error){
    if(timeoutId!=null)scheduler.clear(timeoutId);
    emitter.off('prerender',pre);
    emitter.off('postrender',post);
    restore();
    return{ok:false,reason:'NO SE PUEDEN INTERCEPTAR DRAW METHODS: '+String(error?.message||error)};
  }
}

export function formatIosWebglDrawCallSample(sample){
  if(!sample)return'CONTADOR WEBGL SIN DATOS';
  return [
    'MUESTRA WEBGL OPT-IN ('+String(sample.reason||'')+')',
    'FRAMES RENDERER '+(sample.frames??0)+'/'+(sample.maxFrames??0),
    'CALLS JS DRAW* '+(sample.drawCalls??0)+' · MEDIA '+(sample.drawPerFrame??0)+'/frame · PICO '+(sample.maxDrawPerFrame??0)+'/frame',
    'DESGLOSE '+Object.entries(sample.methods||{}).map(([k,v])=>k+':'+v).join(' · '),
    'INTERCEPTAR DRAW* AÑADE OVERHEAD: NO comparar FPS ni consumo con esta muestra',
    'NO MIDE TIEMPO GPU, VRAM, potencia ni compositor WKWebView'
  ].join('\n');
}
