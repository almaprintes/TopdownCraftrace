let installed=false;
let rafId=0;
let box=null;

export function installRafCadenceDiagnostic(){
  if(installed)return;
  installed=true;

  try{
    box=document.createElement('div');
    box.setAttribute('aria-hidden','true');
    box.style.cssText='position:fixed;left:10px;top:114px;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.62);color:#b7ffcf;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;white-space:nowrap;';
    box.textContent='RAF --';
    document.documentElement.appendChild(box);
  }catch{}

  let last=0;
  let windowStart=0;
  let sum=0;
  let count=0;
  let max=0;
  let over20=0;
  let over33=0;
  let over50=0;

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
      }catch{}
      windowStart=ts;
      sum=0;count=0;max=0;over20=0;over33=0;over50=0;
    }

    rafId=requestAnimationFrame(frame);
  };

  rafId=requestAnimationFrame(frame);
}

export function removeRafCadenceDiagnostic(){
  if(rafId)cancelAnimationFrame(rafId);
  rafId=0;
  try{box?.remove?.();}catch{}
  box=null;
  installed=false;
}
