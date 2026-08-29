import { RaceScene as CurrentRaceScene } from './RaceHudPerformanceScene.js';

function safeDestroy(obj){if(!obj)return;try{obj.destroy?.(true);}catch{}}
function isIOSDevice(){try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||((navigator.platform==='MacIntel')&&navigator.maxTouchPoints>1);}catch{return false;}}
function fmtLap(ms){
  if(!Number.isFinite(Number(ms)))return '--:--.--';
  const t=Math.max(0,Number(ms));
  const m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

const HUD_STYLE_ID='tdr-race-instrument-hud-style';
function ensureHudStyle(){
  if(document.getElementById(HUD_STYLE_ID))return;
  const style=document.createElement('style');style.id=HUD_STYLE_ID;style.textContent=`
  .tdr-race-hud{position:absolute;inset:0;z-index:23000;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;overflow:hidden;--cyan:#5de8ff;--amber:#ffc857;--red:#ff5b62;--panel:rgba(3,10,17,.66)}
  .tdr-race-hud *{box-sizing:border-box}.tdr-race-hud-top{position:absolute;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(56vw,620px);min-width:390px;display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:13px;padding:8px 14px 7px;background:linear-gradient(90deg,transparent,var(--panel) 12%,var(--panel) 88%,transparent);clip-path:polygon(3% 0,97% 0,100% 100%,0 100%)}
  .tdr-race-hud-top:before,.tdr-race-hud-top:after{content:'';position:absolute;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent)}.tdr-race-hud-top:before{left:0;width:48%}.tdr-race-hud-top:after{right:0;width:48%}
  .tdr-race-lap{font-size:20px;font-weight:950;letter-spacing:.06em;line-height:.9}.tdr-race-lap small{display:block;font-size:8px;color:#9cb8c5;letter-spacing:.22em;margin-bottom:4px}.tdr-race-sector{text-align:center}.tdr-race-sector-label{font-size:8px;letter-spacing:.2em;color:#8fa9b6}.tdr-race-sector-bars{display:flex;gap:4px;margin-top:5px}.tdr-race-sector-bars i{display:block;width:27px;height:3px;background:rgba(255,255,255,.18);transform:skewX(-28deg)}.tdr-race-sector-bars i.on{background:var(--cyan);box-shadow:0 0 9px rgba(93,232,255,.65)}
  .tdr-race-times{display:grid;grid-template-columns:auto auto auto;gap:11px;align-items:end}.tdr-race-time{font-size:11px;font-weight:850;white-space:nowrap}.tdr-race-time span{display:block;font-size:7px;letter-spacing:.17em;color:#8196a2;margin-bottom:1px}.tdr-race-delta.good{color:#65f7b0}.tdr-race-delta.bad{color:var(--red)}
  .tdr-race-hud-bottom{position:absolute;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(43vw,500px);min-width:315px;height:82px;display:grid;grid-template-columns:1fr auto;align-items:end;padding:10px 15px 11px 20px;background:linear-gradient(90deg,transparent 0,var(--panel) 14%,var(--panel) 86%,transparent 100%);clip-path:polygon(8% 0,92% 0,100% 100%,0 100%)}
  .tdr-race-speed-wrap{display:flex;align-items:flex-end;gap:7px}.tdr-race-speed{font-family:Orbitron,system-ui,sans-serif;font-size:36px;line-height:.86;font-weight:950;letter-spacing:.02em;text-shadow:0 0 16px rgba(93,232,255,.17)}.tdr-race-unit{font-size:9px;color:#9bb0bc;letter-spacing:.12em;margin-bottom:3px}.tdr-race-clock{text-align:right;font-family:Orbitron,system-ui,sans-serif;font-size:17px;font-weight:850}.tdr-race-clock small{display:block;font-family:system-ui,sans-serif;font-size:7px;letter-spacing:.16em;color:#8196a2;margin-bottom:2px}
  .tdr-race-speedbar{position:absolute;left:18%;right:18%;top:7px;height:13px;display:flex;gap:3px;transform:skewX(-22deg)}.tdr-race-speedbar i{flex:1;background:rgba(255,255,255,.10);border-top:1px solid rgba(255,255,255,.09)}.tdr-race-speedbar i.on{background:var(--cyan);box-shadow:0 0 8px rgba(93,232,255,.42)}.tdr-race-speedbar i.hot.on{background:var(--amber);box-shadow:0 0 8px rgba(255,200,87,.45)}.tdr-race-speedbar i.red.on{background:var(--red);box-shadow:0 0 8px rgba(255,91,98,.45)}
  .tdr-race-pos{position:absolute;left:10px;bottom:7px;font-size:7px;color:#8196a2;letter-spacing:.16em}.tdr-race-pos b{color:#fff;font-size:10px}
  @media(max-width:760px){.tdr-race-hud-top{width:58vw;min-width:360px;padding-left:10px;padding-right:10px;gap:8px}.tdr-race-lap{font-size:17px}.tdr-race-times{gap:7px}.tdr-race-time{font-size:9px}.tdr-race-hud-bottom{width:41vw;min-width:290px;height:72px}.tdr-race-speed{font-size:31px}.tdr-race-clock{font-size:15px}}
  `;document.head.appendChild(style);
}
function removeHud(scene){try{scene?._raceHudDom?.remove();}catch{}if(scene)scene._raceHudDom=null;}
function createHud(scene){
  ensureHudStyle();removeHud(scene);
  const canvas=scene.game?.canvas,host=canvas?.parentElement||document.getElementById('app')||document.body;if(!host)return null;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  const root=document.createElement('div');root.className='tdr-race-hud';root.innerHTML=`
    <div class="tdr-race-hud-top">
      <div class="tdr-race-lap"><small>VUELTA</small><b data-lap>1</b></div>
      <div class="tdr-race-sector"><div class="tdr-race-sector-label">SECTOR <b data-sector>1/3</b></div><div class="tdr-race-sector-bars"><i></i><i></i><i></i></div></div>
      <div class="tdr-race-times"><div class="tdr-race-time"><span>LAST</span><b data-last>--:--.--</b></div><div class="tdr-race-time"><span>BEST</span><b data-best>--:--.--</b></div><div class="tdr-race-time tdr-race-delta"><span>DELTA</span><b data-delta>--</b></div></div>
    </div>
    <div class="tdr-race-hud-bottom">
      <div class="tdr-race-speedbar">${Array.from({length:18},(_,i)=>`<i class="${i>=15?'red':i>=12?'hot':''}"></i>`).join('')}</div>
      <div class="tdr-race-speed-wrap"><b class="tdr-race-speed" data-speed>000</b><span class="tdr-race-unit">KM/H</span></div>
      <div class="tdr-race-clock"><small>TIEMPO</small><b data-clock>0:00.00</b></div><div class="tdr-race-pos" data-pos></div>
    </div>`;
  host.appendChild(root);scene._raceHudDom=root;scene.events?.once?.('shutdown',()=>removeHud(scene));return root;
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    if(isIOSDevice()&&this.carBody){try{const cam=this.cameras?.main;cam?.stopFollow?.();cam?.centerOn?.(this.carBody.x,this.carBody.y);cam?.startFollow?.(this.carBody,true,1,1);if(cam){cam.roundPixels=false;cam.setZoom?.(1);}this._zoomCurrent=1;this._iosFixedZoom=1;}catch{}}

    // Legacy graphics diagnostics create three Phaser Text objects and keep
    // updating them from an inherited update() loop. Destroying the glyphs
    // alone is unsafe because Phaser Text.setText() later touches disposed
    // canvas data. Disable the updater first, then remove the objects once.
    this._updateGrowthDiag=()=>{};
    this._growthDiagAccum=0;
    this._growthDiagLast='';
    for(const key of ['raceInfoHud','competitionHud','minimapSportFrame','_perfDiagText','_renderPerfText','_isoText','_diagText','_touchDbg','_dbgText','_lapBreakdownText','_growthDiagText','_bufferDiagText','_rendererDiagText','devBox','devTitle','devInfo','devBtnMap','devTuneBtn','_simpleRaceTop','_simpleRaceBottom']){safeDestroy(this[key]);this[key]=null;}
    this._updateRaceInfoHud=()=>{};this._pinRaceInfoHud=()=>{};this._buildRaceInfoHud=()=>{};this._syncCompetitionHud=()=>{};this._pinCompetitionHud=()=>{};this._pinMinimapSportFrame=()=>{};this._layoutMinimapSportFrame=()=>{};this._centerMinimapInsideSportFrame=()=>{};this._hideRaceDebugOnly=()=>{};this._dbgSet=()=>{};this._perfDiagEnabled=false;this._renderPerfEnabled=false;this._isoModes=null;this._lapBreakdown=null;try{this._perfStats?.clear?.();}catch{}

    const hud=createHud(this);this._simpleRaceHudAccum=100;
    this._readRacePosition=()=>{const systems=[this.standingsSystem,this.standings,this._standings].filter(Boolean),ids=[this.playerStandingsId,'player','you','user',this.carId].filter(Boolean).map(String);for(const sys of systems){if(typeof sys?.getPosition!=='function')continue;for(const id of ids){try{const pos=Number(sys.getPosition(id));if(Number.isFinite(pos)&&pos>0){const total=typeof sys.getCarCount==='function'?Number(sys.getCarCount()||0):0;return{pos,total};}}catch{}}}return null;};
    this._updateSimpleRaceHud=(delta=0)=>{this._simpleRaceHudAccum+=Math.max(0,Number(delta)||0);if(this._simpleRaceHudAccum<80||!hud?.isConnected)return;this._simpleRaceHudAccum=0;const now=performance.now(),body=this.carBody?.body,vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0),kmh=Math.max(0,Math.hypot(vx,vy)*0.185),started=!!this.timing?.started&&this.timing?.lapStart!=null,elapsed=started?Math.max(0,now-Number(this.timing.lapStart)):0,lap=Math.max(1,Number(this.lapCount||0)+1),cp=Math.max(0,Math.min(2,Number(this._cpState||0))),sector=cp+1,pos=this._readRacePosition?.(),hist=Array.isArray(this.ttHistory)?this.ttHistory:[],histLast=hist.length?Number(hist[hist.length-1]?.lapMs):NaN,lastMs=Number.isFinite(Number(this.timing?.lastLap))?Number(this.timing.lastLap):histLast,bestMs=Number(this.ttBest?.lapMs);let deltaMs=NaN;if(cp>=2&&Number.isFinite(Number(this.timing?.s2))&&Number.isFinite(Number(this.ttBest?.s2)))deltaMs=Number(this.timing.s2)-Number(this.ttBest.s2);else if(cp>=1&&Number.isFinite(Number(this.timing?.s1))&&Number.isFinite(Number(this.ttBest?.s1)))deltaMs=Number(this.timing.s1)-Number(this.ttBest.s1);const deltaTxt=Number.isFinite(deltaMs)?`${deltaMs>=0?'+':'−'}${(Math.abs(deltaMs)/1000).toFixed(2)}`:'--';hud.querySelector('[data-lap]').textContent=String(lap);hud.querySelector('[data-sector]').textContent=`${sector}/3`;hud.querySelector('[data-last]').textContent=fmtLap(lastMs);hud.querySelector('[data-best]').textContent=fmtLap(bestMs);const d=hud.querySelector('[data-delta]');d.textContent=deltaTxt;d.parentElement.classList.toggle('good',Number.isFinite(deltaMs)&&deltaMs<0);d.parentElement.classList.toggle('bad',Number.isFinite(deltaMs)&&deltaMs>0);hud.querySelector('[data-speed]').textContent=String(Math.round(kmh)).padStart(3,'0');hud.querySelector('[data-clock]').textContent=fmtLap(elapsed);hud.querySelector('[data-pos]').innerHTML=pos&&pos.total>1?`POS <b>${pos.pos}/${pos.total}</b>`:'';hud.querySelectorAll('.tdr-race-sector-bars i').forEach((n,i)=>n.classList.toggle('on',i<sector));const maxKmh=200,fill=Math.max(0,Math.min(18,Math.round(kmh/maxKmh*18)));hud.querySelectorAll('.tdr-race-speedbar i').forEach((n,i)=>n.classList.toggle('on',i<fill));};
    this._updateSimpleRaceHud(100);return result;
  }

  update(time,delta){const result=super.update(time,delta);if(this._iosFixedZoom){try{this._zoomCurrent=this._iosFixedZoom;this.cameras?.main?.setZoom?.(this._iosFixedZoom);}catch{}}this._updateSimpleRaceHud?.(delta);return result;}
}
