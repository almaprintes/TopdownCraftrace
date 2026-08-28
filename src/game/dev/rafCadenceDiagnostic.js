let installed=false;
let rafId=0;
let timerId=0;
let box=null;
let mainBox=null;
let taskBox=null;
let longTaskObserver=null;

export function installRafCadenceDiagnostic(){
  if(installed)return;
  installed=true;

  try{
    box=document.createElement('div');
    box.setAttribute('aria-hidden','true');
    box.style.cssText='position:fixed;left:10px;top:114px;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.62);color:#b7ffcf;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;white-space:nowrap;';
    box.textContent='RAF --';
    document.documentElement.appendChild(box);

    mainBox=document.createElement('div');
    mainBox.setAttribute('aria-hidden','true');
    mainBox.style.cssText='position:fixed;left:10px;top:138px;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.62);color:#ffd8a8;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;white-space:nowrap;';
    mainBox.textContent='MAIN --';
    document.documentElement.appendChild(mainBox);

    taskBox=document.createElement('div');
    taskBox.setAttribute('aria-hidden','true');
    taskBox.style.cssText='position:fixed;left:10px;top:162px;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.62);color:#ffb7e8;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;white-space:nowrap;';
    taskBox.textContent='TASK probing…';
    document.documentElement.appendChild(taskBox);
  }catch{}

  let last=0;
  let windowStart=0;
  let sum=0;
  let count=0;
  let max=0;
  let over20=0;
  let over33=0;
  let over50=0;

  let timerLast=Date.now();
  let timerMax=0;
  let timerOver70=0;
  let timerOver100=0;
  let timerOver150=0;

  let longTaskSupported=false;
  let taskCount=0;
  let taskMax=0;
  let taskTotal=0;
  try{
    const supported=globalThis.PerformanceObserver?.supportedEntryTypes;
    longTaskSupported=Array.isArray(supported)&&supported.includes('longtask');
    if(longTaskSupported){
      longTaskObserver=new PerformanceObserver((list)=>{
        for(const entry of list.getEntries()){
          const d=Math.max(0,Number(entry.duration)||0);
          taskCount++;
          taskTotal+=d;
          if(d>taskMax)taskMax=d;
        }
      });
      longTaskObserver.observe({entryTypes:['longtask']});
    }
  }catch{
    longTaskSupported=false;
    longTaskObserver=null;
  }

  timerId=setInterval(()=>{
    const now=Date.now();
    const dt=Math.max(0,now-timerLast);
    timerLast=now;
    if(dt<1000){
      if(dt>timerMax)timerMax=dt;
      if(dt>70)timerOver70++;
      if(dt>100)timerOver100++;
      if(dt>150)timerOver150++;
    }
  },50);

  const frame=(ts)=>{
    if(last>0){
      const dt=Math.max(0,ts-last);
      if(dt<250){
        sum+=dt;
        count++;
        if(dt>max)max=dt;
        if(dt>20)over20++;
        if(dt>33)over33++;
        if(dt>50)over50++;
      }
    }
    last=ts;
    if(!windowStart)windowStart=ts;

    if(ts-windowStart>=1000){
      const avg=count?sum/count:0;
      try{
        if(box)box.textContent=`RAF ${avg.toFixed(1)}ms · MAX ${max.toFixed(1)} · >20 ${over20} · >33 ${over33} · >50 ${over50}`;
        if(mainBox)mainBox.textContent=`MAIN 50ms · MAX ${timerMax} · >70 ${timerOver70} · >100 ${timerOver100} · >150 ${timerOver150}`;
        if(taskBox){
          taskBox.textContent=longTaskSupported
            ?`TASK ${taskCount} · MAX ${taskMax.toFixed(0)}ms · SUM ${taskTotal.toFixed(0)}ms`
            :'TASK API unavailable';
        }
      }catch{}
      windowStart=ts;
      sum=0;count=0;max=0;over20=0;over33=0;over50=0;
      timerMax=0;timerOver70=0;timerOver100=0;timerOver150=0;
      taskCount=0;taskMax=0;taskTotal=0;
    }

    rafId=requestAnimationFrame(frame);
  };

  rafId=requestAnimationFrame(frame);
}

export function removeRafCadenceDiagnostic(){
  if(rafId)cancelAnimationFrame(rafId);
  rafId=0;
  if(timerId)clearInterval(timerId);
  timerId=0;
  try{longTaskObserver?.disconnect?.();}catch{}
  longTaskObserver=null;
  try{box?.remove?.();}catch{}
  try{mainBox?.remove?.();}catch{}
  try{taskBox?.remove?.();}catch{}
  box=null;
  mainBox=null;
  taskBox=null;
  installed=false;
}
