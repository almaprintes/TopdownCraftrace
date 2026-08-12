import { RaceScene as CurrentRaceScene } from './RaceProgressiveBrakeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function fmtTime(ms){
  if(!Number.isFinite(ms)) return '—';
  const m=Math.floor(ms/60000);
  const s=Math.floor((ms%60000)/1000);
  const x=Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
}
function fmtDuration(sec){
  sec=Math.max(0,Math.round(sec||0));
  const m=Math.floor(sec/60), s=sec%60;
  return m>0?`${m} min ${s} s`:`${s} s`;
}
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function mean(a){ return a.length?a.reduce((s,v)=>s+v,0)/a.length:0; }
function stddev(a){ if(a.length<2)return 0; const m=mean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length); }

export class RaceScene extends CurrentRaceScene {
  constructor(){
    super();
    this._sessionReportOpen=false;
    this._sessionReportButton=null;
    this._sessionReportModal=null;
    this._sessionStats=null;
    this._sessionLapBaseline=0;
    this._sessionLastBrake=false;
    this._sessionLastOff=false;
  }

  create(data){
    super.create(data);
    this._sessionLapBaseline=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._sessionStats={
      startedAt:Date.now(), elapsed:0, movingTime:0,
      maxKmh:0, speedIntegral:0, distanceKm:0,
      throttleTime:0, brakeTime:0, coastTime:0,
      steeringIntegral:0, steeringTime:0, maxSteer:0,
      offTrackTime:0, offTrackEvents:0,
      brakeEvents:0, brakeHold:0, longestBrake:0
    };
    this._installSessionReportButton();
    this.events.once('shutdown',()=>this._destroySessionReportUi());
    this.events.once('destroy',()=>this._destroySessionReportUi());
  }

  _installSessionReportButton(){
    if(typeof document==='undefined') return;
    const b=document.createElement('button');
    b.textContent='FIN SESIÓN';
    Object.assign(b.style,{
      position:'fixed', right:'12px', top:'calc(env(safe-area-inset-top, 0px) + 58px)',
      zIndex:'7000', border:'1px solid rgba(255,255,255,.22)', borderRadius:'999px',
      padding:'9px 13px', background:'rgba(7,12,22,.82)', color:'#fff',
      font:'700 11px system-ui,-apple-system,sans-serif', letterSpacing:'.08em',
      boxShadow:'0 5px 18px rgba(0,0,0,.28)', backdropFilter:'blur(10px)',
      WebkitBackdropFilter:'blur(10px)'
    });
    b.addEventListener('click',()=>this._openSessionReport());
    document.body.appendChild(b);
    this._sessionReportButton=b;
  }

  _destroySessionReportUi(){
    try{ this._sessionReportButton?.remove(); }catch(_){}
    try{ this._sessionReportModal?.remove(); }catch(_){}
    this._sessionReportButton=null;
    this._sessionReportModal=null;
  }

  update(time,delta){
    if(this._sessionReportOpen) return;
    super.update(time,delta);
    this._sampleSession(delta);
  }

  _sampleSession(delta){
    const s=this._sessionStats, body=this.carBody;
    if(!s||!body?.body?.velocity) return;
    const dt=clamp(Number(delta||16.67)/1000,0.001,0.10);
    const vx=Number(body.body.velocity.x||0), vy=Number(body.body.velocity.y||0);
    const pxs=Math.hypot(vx,vy);
    const kmh=pxs*0.10;
    s.elapsed+=dt;
    s.maxKmh=Math.max(s.maxKmh,kmh);
    s.speedIntegral+=kmh*dt;
    s.distanceKm+=kmh*dt/3600;
    if(kmh>2) s.movingTime+=dt;

    const t=this.touch||{}, k=this.keys||{};
    const throttle=Number(t.throttle||0)>0.5||!!k.up?.isDown||!!k.up2?.isDown;
    const brake=Number(t.brake||0)>0.5||!!k.down?.isDown||!!k.down2?.isDown;
    if(throttle) s.throttleTime+=dt;
    else if(brake) s.brakeTime+=dt;
    else s.coastTime+=dt;

    if(brake){
      s.brakeHold+=dt;
      s.longestBrake=Math.max(s.longestBrake,s.brakeHold);
      if(!this._sessionLastBrake) s.brakeEvents++;
    } else s.brakeHold=0;
    this._sessionLastBrake=brake;

    const steer=clamp(Number(t.steer||t.stickX||0),-1,1);
    if(Math.abs(steer)>0.01){ s.steeringIntegral+=Math.abs(steer)*dt; s.steeringTime+=dt; }
    s.maxSteer=Math.max(s.maxSteer,Math.abs(steer));

    const off=this._onTrack===false||this._surface==='GRASS'||this._surface==='OFF';
    if(off){ s.offTrackTime+=dt; if(!this._sessionLastOff)s.offTrackEvents++; }
    this._sessionLastOff=off;
  }

  _sessionLaps(){
    const h=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const slice=h.slice(this._sessionLapBaseline);
    return slice.map((e,i)=>({
      n:i+1,
      lapMs:Number(e?.lapMs??e?.ms??e?.time),
      carId:e?.carId||this.carId
    })).filter(x=>Number.isFinite(x.lapMs)&&x.lapMs>0);
  }

  _buildReport(){
    const s=this._sessionStats||{};
    const laps=this._sessionLaps();
    const times=laps.map(x=>x.lapMs);
    const best=times.length?Math.min(...times):null;
    const worst=times.length?Math.max(...times):null;
    const avg=times.length?mean(times):null;
    const consistency=times.length>1?stddev(times):0;
    const active=Math.max(.001,(s.throttleTime||0)+(s.brakeTime||0)+(s.coastTime||0));
    const car=CAR_SPECS[this.carId]||CAR_SPECS.stock||{};
    const trackName=this.track?.meta?.name||this.track?.name||this.trackId||'Circuito';
    const avgKmh=(s.elapsed||0)>0?(s.speedIntegral||0)/s.elapsed:0;
    const pct=v=>100*(v||0)/active;
    let verdict='Sesión de referencia.';
    if((s.offTrackEvents||0)===0 && times.length>=2 && consistency<1500) verdict='Tanda limpia y consistente. Buena base para buscar décimas.';
    else if((s.offTrackEvents||0)>2) verdict='Hay velocidad, pero las salidas de pista están costando tiempo. Conviene priorizar entradas más limpias.';
    else if(pct(s.brakeTime)>22) verdict='Uso de freno elevado. Puede haber margen frenando algo antes y liberando el pedal progresivamente.';
    else if(pct(s.coastTime)>32) verdict='Mucho tiempo en coasting: buena gestión de inercia; revisa si puedes volver al gas antes en algunas curvas.';
    else if(times.length>=2 && consistency>3000) verdict='El ritmo existe, pero hay bastante dispersión entre vueltas. La siguiente mejora está en la repetibilidad.';

    return {
      createdAt:new Date().toISOString(), trackName, carName:car.name||car.label||this.carId||'Coche', carId:this.carId,
      durationSec:s.elapsed||0, laps, bestMs:best, averageLapMs:avg, worstMs:worst,
      consistencyMs:consistency, maxKmh:s.maxKmh||0, averageKmh:avgKmh, distanceKm:s.distanceKm||0,
      throttlePct:pct(s.throttleTime), brakePct:pct(s.brakeTime), coastPct:pct(s.coastTime),
      offTrackSec:s.offTrackTime||0, offTrackEvents:s.offTrackEvents||0,
      brakeEvents:s.brakeEvents||0, longestBrakeSec:s.longestBrake||0,
      averageSteerPct:(s.steeringTime||0)>0?100*(s.steeringIntegral/s.steeringTime):0,
      verdict
    };
  }

  _reportInnerHtml(r){
    const delta=(r.bestMs!=null&&r.worstMs!=null)?r.worstMs-r.bestMs:null;
    const lapRows=r.laps.length?r.laps.map(l=>`<div class="lap"><b>V${l.n}</b><span>${fmtTime(l.lapMs)}</span><i>${r.bestMs===l.lapMs?'MEJOR':''}</i></div>`).join(''):'<div class="empty">Aún no hay vueltas completas en esta sesión.</div>';
    return `
      <div class="hero"><div><small>INFORME DE SESIÓN</small><h2>${esc(r.trackName)}</h2><p>${esc(r.carName)} · ${fmtDuration(r.durationSec)}</p></div><div class="badge">${r.laps.length} VUELTAS</div></div>
      <div class="headline"><div><small>MEJOR VUELTA</small><strong>${fmtTime(r.bestMs)}</strong></div><div><small>PUNTA</small><strong>${r.maxKmh.toFixed(0)}<em> km/h</em></strong></div></div>
      <div class="grid">
        <div><small>Vuelta media</small><b>${fmtTime(r.averageLapMs)}</b></div>
        <div><small>Consistencia σ</small><b>${r.laps.length>1?(r.consistencyMs/1000).toFixed(2)+' s':'—'}</b></div>
        <div><small>Velocidad media</small><b>${r.averageKmh.toFixed(0)} km/h</b></div>
        <div><small>Distancia</small><b>${r.distanceKm.toFixed(2)} km</b></div>
        <div><small>Delta vueltas</small><b>${delta!=null?(delta/1000).toFixed(2)+' s':'—'}</b></div>
        <div><small>Salidas pista</small><b>${r.offTrackEvents} · ${r.offTrackSec.toFixed(1)} s</b></div>
      </div>
      <h3>Uso de controles</h3>
      <div class="bars">
        <label><span>Gas <b>${r.throttlePct.toFixed(0)}%</b></span><i><u style="width:${clamp(r.throttlePct,0,100)}%"></u></i></label>
        <label><span>Coasting <b>${r.coastPct.toFixed(0)}%</b></span><i><u style="width:${clamp(r.coastPct,0,100)}%"></u></i></label>
        <label><span>Freno <b>${r.brakePct.toFixed(0)}%</b></span><i><u style="width:${clamp(r.brakePct,0,100)}%"></u></i></label>
      </div>
      <div class="grid compact"><div><small>Frenadas</small><b>${r.brakeEvents}</b></div><div><small>Frenada más larga</small><b>${r.longestBrakeSec.toFixed(2)} s</b></div></div>
      <h3>Vueltas</h3><div class="laps">${lapRows}</div>
      <div class="insight"><small>LECTURA DE LA TANDA</small><p>${esc(r.verdict)}</p></div>`;
  }

  _reportCss(){ return `
    *{box-sizing:border-box}body{margin:0;background:#080d16;color:#f5f7fb;font-family:system-ui,-apple-system,sans-serif}.report{max-width:680px;margin:auto;padding:20px}.hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.hero small,.headline small,.grid small,.insight small{color:#8e9bb0;font-weight:800;letter-spacing:.09em;font-size:10px}.hero h2{margin:4px 0 2px;font-size:23px}.hero p{margin:0;color:#aab5c6;font-size:12px}.badge{font-size:10px;font-weight:900;letter-spacing:.08em;background:#15243a;border:1px solid #294464;border-radius:999px;padding:8px 10px}.headline{display:grid;grid-template-columns:1.45fr 1fr;gap:8px;margin:16px 0 8px}.headline>div,.grid>div,.insight{background:#0f1725;border:1px solid #1e2b3d;border-radius:14px;padding:12px}.headline strong{display:block;font-size:24px;margin-top:4px}.headline em{font-size:11px;font-style:normal;color:#8795a9}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.grid b{display:block;margin-top:4px;font-size:14px}.compact{margin-top:8px}h3{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:#9eabc0;margin:18px 0 8px}.bars label{display:block;margin:8px 0}.bars span{display:flex;justify-content:space-between;font-size:12px}.bars i{display:block;height:7px;border-radius:9px;background:#172131;overflow:hidden;margin-top:5px}.bars u{display:block;height:100%;background:linear-gradient(90deg,#4e8cff,#66d7bc);border-radius:9px}.lap{display:grid;grid-template-columns:42px 1fr 50px;align-items:center;padding:9px 3px;border-bottom:1px solid #1a2636;font-size:13px}.lap span{text-align:right;font-variant-numeric:tabular-nums}.lap i{text-align:right;color:#6fe0bd;font-size:9px;font-style:normal;font-weight:900}.empty{color:#7f8da2;font-size:12px;padding:12px 0}.insight{margin-top:16px;background:linear-gradient(135deg,#102039,#101923)}.insight p{margin:6px 0 0;line-height:1.45;font-size:13px}@media(max-width:420px){.report{padding:15px}.headline strong{font-size:20px}}
  `; }

  _openSessionReport(){
    if(this._sessionReportOpen||typeof document==='undefined') return;
    this._sessionReportOpen=true;
    try{this.physics?.world?.pause?.();}catch(_){}
    if(this._sessionReportButton) this._sessionReportButton.style.display='none';
    const r=this._buildReport();
    const root=document.createElement('div');
    root.innerHTML=`<style>${this._reportCss()} .veil{position:fixed;inset:0;z-index:10000;background:rgba(2,5,10,.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 10px calc(env(safe-area-inset-bottom,0px) + 10px)}.modal{width:min(94vw,520px);max-height:90vh;background:#080d16;border:1px solid #25354a;border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.55);display:flex;flex-direction:column}.scroll{overflow:auto;-webkit-overflow-scrolling:touch}.actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px;border-top:1px solid #1c2939;background:#0a101b}.actions button{border:1px solid #26364b;border-radius:12px;padding:11px 6px;background:#121c2a;color:white;font:800 10px system-ui;letter-spacing:.04em}.actions .primary{background:#e9f2ff;color:#07111e;border-color:#e9f2ff}</style><div class="veil"><div class="modal"><div class="scroll"><div class="report">${this._reportInnerHtml(r)}</div></div><div class="actions"><button data-a="continue">CONTINUAR</button><button data-a="export">EXPORTAR</button><button class="primary" data-a="exit">SALIR</button></div></div></div>`;
    document.body.appendChild(root);
    this._sessionReportModal=root;
    root.querySelector('[data-a="continue"]')?.addEventListener('click',()=>this._closeSessionReport(true));
    root.querySelector('[data-a="export"]')?.addEventListener('click',()=>this._exportSessionReport(r));
    root.querySelector('[data-a="exit"]')?.addEventListener('click',()=>{
      this._destroySessionReportUi(); this._sessionReportOpen=false;
      if(this._testMode&&this._returnSceneKey)this.scene.start(this._returnSceneKey,this._returnSceneData||{}); else this.scene.start('menu');
    });
  }

  _closeSessionReport(resume){
    try{this._sessionReportModal?.remove();}catch(_){}
    this._sessionReportModal=null;
    this._sessionReportOpen=false;
    if(this._sessionReportButton)this._sessionReportButton.style.display='block';
    if(resume){ try{this.physics?.world?.resume?.();}catch(_){} }
  }

  async _exportSessionReport(r){
    const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe de sesión · ${esc(r.trackName)}</title><style>${this._reportCss()}</style></head><body><main class="report">${this._reportInnerHtml(r)}</main></body></html>`;
    const safe=String(r.trackName||'circuito').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    const name=`topdown-race-sesion-${safe||'circuito'}-${new Date().toISOString().slice(0,10)}.html`;
    try{
      const file=new File([html],name,{type:'text/html'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Informe de sesión',text:`${r.trackName} · ${r.carName}`,files:[file]});
        return;
      }
    }catch(e){ if(e?.name==='AbortError')return; }
    try{
      const blob=new Blob([html],{type:'text/html'}), url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(_){}
  }
}
