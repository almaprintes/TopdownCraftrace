import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import track01Environment from '../tracks/library/track01/track01.environment.json';
import santaCruzEnvironment from '../tracks/library/santa-cruz/santa-cruz.environment.json';
import kartingTenerifeEnvironment from '../tracks/library/karting-tenerife/karting-tenerife.environment.json';
import kartingCanariasEnvironment from '../tracks/library/karting-canarias/karting-canarias.environment.json';

const BASE=import.meta.env.BASE_URL||'/';
const ENVIRONMENTS={track01:track01Environment,'santa-cruz':santaCruzEnvironment,'karting-tenerife':kartingTenerifeEnvironment,'karting-canarias':kartingCanariasEnvironment};
const fmt=ms=>{ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};
const imgCache=new Map();
function loadImage(src){if(!src)return Promise.resolve(null);if(imgCache.has(src))return imgCache.get(src);const p=new Promise(resolve=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;});imgCache.set(src,p);return p;}
function pointAt(samples,t){let i=1;while(i<samples.length&&Number(samples[i].t)<t)i++;const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a;const span=Math.max(1,Number(b.t)-Number(a.t)),q=Math.max(0,Math.min(1,(t-Number(a.t))/span));return{x:Number(a.x)+(Number(b.x)-Number(a.x))*q,y:Number(a.y)+(Number(b.y)-Number(a.y))*q,r:Number(a.r)+(Number(b.r)-Number(a.r))*q};}
function drawPolyline(ctx,points,scale,cx,cy,w,h,width,color){if(!points?.length)return;ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i],x=(Number(p.x)-cx)*scale+w/2,y=(Number(p.y)-cy)*scale+h/2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,width*scale);ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}

export class StatsScene extends ReplayStatsScene{
  _installBroadcastStyles(){super._installBroadcastStyles();if(this._root?.querySelector('[data-real-replay-style]'))return;const s=document.createElement('style');s.dataset.realReplayStyle='1';s.textContent=`
.br-real-screen{position:relative;height:330px;overflow:hidden;background:#183621}.br-real-screen canvas{display:block;width:100%;height:100%;background:#183621}.br-real-screen:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 45px rgba(0,0,0,.48)}.br-camera-tag{position:absolute;left:10px;bottom:9px;background:rgba(2,10,16,.8);border:1px solid rgba(85,239,255,.25);padding:4px 7px;color:#8cefff;font-size:6px;font-weight:1000;letter-spacing:.12em}.br-monitor-real{min-height:406px}.br-monitor-real .br-monitor-head{height:48px}.br-monitor-real .br-controls{height:42px}@media(max-height:520px){.br-real-screen{height:270px}.br-monitor-real{min-height:346px}}
`;this._root.appendChild(s);}
  async _showRaceControlReplay(record,ghost){
    this._stopRaceControlReplay();const main=this._root?.querySelector('.br-main');if(!main||!ghost?.samples?.length)return;
    const trackId=String(ghost.trackKey||record?.trackId||'track01');const track=TRACK_REGISTRY?.[trackId];if(!track)return super._showRaceControlReplay(record,ghost);
    const env=ENVIRONMENTS[trackId]||null;const spec=CAR_SPECS?.[ghost.carId]||{};const carSrc=spec?.skin?`${BASE}assets/skins/${spec.skin}`:null;
    const envItems=(env?.environment||[]).filter(item=>item?.path);const unique=[...new Set(envItems.map(item=>`${BASE}assets/${item.path}`))];
    const [carImg,...envImgs]=await Promise.all([loadImage(carSrc),...unique.map(loadImage)]);const envMap=new Map(unique.map((src,i)=>[src,envImgs[i]]));
    if(!this._root?.isConnected)return;
    this._brAnalysisMarkup=main.innerHTML;main.innerHTML=`<section class="br-panel br-monitor br-monitor-real"><div class="br-monitor-head"><div><div class="br-label">RACE CONTROL // REAL REPLAY</div><strong>${String(track.name||trackId).toUpperCase()}</strong><small>${String(spec.name||ghost.carId||'COCHE').toUpperCase()} · ${fmt(ghost.lapMs)}</small></div><span class="br-monitor-live">● REPLAY</span></div><div class="br-real-screen"><canvas data-br-real-canvas width="900" height="420"></canvas><div class="br-replay-hud"><div><small>TIEMPO</small><strong data-br-replay-time>0:00.000</strong></div><div><small>VUELTA</small><strong>${fmt(ghost.lapMs)}</strong></div></div><div class="br-camera-tag">CAM 01 · TRACKSIDE FOLLOW</div></div><div class="br-controls"><button data-br-toggle>Ⅱ</button><div class="br-seek"><i></i></div><button class="br-analysis-back" data-br-analysis>ANÁLISIS</button></div></section>`;
    const canvas=main.querySelector('[data-br-real-canvas]'),ctx=canvas?.getContext('2d');if(!ctx)return;const timeEl=main.querySelector('[data-br-replay-time]'),bar=main.querySelector('.br-seek i'),toggle=main.querySelector('[data-br-toggle]');
    let playing=true,start=performance.now(),elapsed=0;const duration=Number(ghost.lapMs)||Number(ghost.samples.at(-1)?.t)||1;const centerline=track.centerline||[];const roadWidth=Number(track.trackWidth)||80;const scale=.42;
    const render=t=>{const car=pointAt(ghost.samples,t),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#173d24';ctx.fillRect(0,0,w,h);
      drawPolyline(ctx,centerline,scale,car.x,car.y,w,h,roadWidth+24,'#c7c7c3');drawPolyline(ctx,centerline,scale,car.x,car.y,w,h,roadWidth+12,'#f3f1e7');drawPolyline(ctx,centerline,scale,car.x,car.y,w,h,roadWidth,'#565b5d');
      for(const item of envItems){const im=envMap.get(`${BASE}assets/${item.path}`);if(!im)continue;const x=(Number(item.x)-car.x)*scale+w/2,y=(Number(item.y)-car.y)*scale+h/2,targetW=(Number(item.displayWidth)||im.naturalWidth||40)*scale;if(x<-150||x>w+150||y<-150||y>h+150)continue;const ratio=(im.naturalHeight||1)/(im.naturalWidth||1),targetH=targetW*ratio;ctx.save();ctx.translate(x,y);ctx.rotate(Number(item.rotation)||0);ctx.scale(item.flipX?-1:1,item.flipY?-1:1);ctx.drawImage(im,-targetW/2,-targetH/2,targetW,targetH);ctx.restore();}
      if(carImg){const base=Math.max(32,Number(spec.length)||80)*.44;const ratio=(carImg.naturalHeight||1)/(carImg.naturalWidth||1);const cw=base,ch=base*ratio;ctx.save();ctx.translate(w/2,h/2);ctx.rotate(car.r+Math.PI/2);ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=10;ctx.drawImage(carImg,-cw/2,-ch/2,cw,ch);ctx.restore();}else{ctx.save();ctx.translate(w/2,h/2);ctx.rotate(car.r);ctx.fillStyle='#61eafa';ctx.fillRect(-16,-8,32,16);ctx.restore();}}
    const frame=now=>{if(!this._brReplayState)return;if(playing)elapsed=Math.min(duration,elapsed+(now-start));start=now;render(elapsed);if(timeEl)timeEl.textContent=fmt(elapsed);if(bar)bar.style.width=`${Math.min(100,elapsed/duration*100)}%`;if(elapsed>=duration){playing=false;if(toggle)toggle.textContent='↻';}this._brReplayState.raf=requestAnimationFrame(frame);};render(0);this._brReplayState={raf:requestAnimationFrame(frame)};
    toggle?.addEventListener('click',()=>{if(elapsed>=duration){elapsed=0;playing=true;toggle.textContent='Ⅱ';start=performance.now();return;}playing=!playing;toggle.textContent=playing?'Ⅱ':'▶';start=performance.now();});main.querySelector('[data-br-analysis]')?.addEventListener('click',()=>this._restoreRaceControlAnalysis(main));
  }
}
