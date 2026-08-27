import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

const ATLANTICO_TRACK_KEY = 'track01';
const POLYHAVEN_BASE = 'https://dl.polyhaven.org/file/ph-assets/Textures';

function currentTrackKey(scene) {
  let stored = '';
  try { stored = localStorage.getItem('tdr2:trackKey') || ''; } catch {}
  return String(scene?.trackKey || stored || '').trim().toLowerCase();
}

function currentVideoPrefs() {
  try {
    const settings = JSON.parse(localStorage.getItem('tdr2:settings') || '{}');
    const video=settings?.video||{};
    const quality=String(video.quality||'high').toLowerCase();
    const preset=['performance','medium','high','ultra'].includes(String(video.preset))
      ? String(video.preset)
      : quality==='low'?'performance':quality==='medium'?'medium':'high';
    const surfaceResolution=['1k','2k','4k'].includes(String(video.surfaceResolution))
      ? String(video.surfaceResolution)
      : preset==='ultra'?'4k':preset==='high'?'2k':'1k';
    return {quality:['low','medium','high'].includes(quality)?quality:'high',preset,surfaceResolution,lighting:video.lighting!==false};
  } catch {
    return {quality:'high',preset:'high',surfaceResolution:'2k',lighting:true};
  }
}

function isMobileDevice() {
  try {
    const ua=String(navigator?.userAgent||'');
    const touch=Number(navigator?.maxTouchPoints||0)>1;
    return /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (touch && Math.min(screen?.width||9999,screen?.height||9999)<1100);
  } catch { return false; }
}

function polyhaven(asset, map, ext, resolution) {
  return `${POLYHAVEN_BASE}/${ext}/${resolution}/${asset}/${asset}_${map}_${resolution}.${ext}`;
}

function surfacePlan(prefs) {
  const mobile=isMobileDevice();
  if(prefs.preset==='medium') return {diff:'1k',normal:'1k',asphalt:'1k',mobile};
  if(prefs.preset==='high') return {diff:'2k',normal:mobile?'1k':'2k',asphalt:'2k',mobile};
  if(prefs.preset==='ultra') {
    // En móvil un normal 4K cuesta ~64 MB de VRAM una vez descomprimido. Dos normales
    // 4K + diffuse 4K de varias superficies pueden hacer que Safari/WebKit mate el proceso
    // sin lanzar excepción JS. Ultra móvil prioriza calidad visible: diffuse 2K + normal 1K.
    if(mobile) return {diff:'2k',normal:'1k',asphalt:'2k',mobile};
    return {diff:'4k',normal:'4k',asphalt:'4k',mobile};
  }
  return {diff:'1k',normal:'1k',asphalt:'1k',mobile};
}

function canUseAtlanticoLitSurfaces(scene) {
  const prefs=currentVideoPrefs();
  return currentTrackKey(scene) === ATLANTICO_TRACK_KEY
    && prefs.preset !== 'performance'
    && prefs.lighting
    && window.__tdrIosSafeMode !== true
    && !!scene?.game?.renderer?.gl;
}

function trackLabel(key) {
  if(key===ATLANTICO_TRACK_KEY)return 'CIRCUITO ATLÁNTICO';
  return String(key||'CIRCUITO').replace(/^import:/,'').replace(/[-_]+/g,' ').toUpperCase();
}

function normalizePoint(p){
  if(Array.isArray(p))return{x:Number(p[0]),y:Number(p[1])};
  return{x:Number(p?.x),y:Number(p?.y)};
}

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  _buildRaceLoadingUi(trackKey){
    try{
      const w=Math.max(1,this.scale.width);
      const h=Math.max(1,this.scale.height);
      const depth=100000;
      const root=[];

      const bg=this.add.rectangle(w/2,h/2,w,h,0x07101d,1).setScrollFactor(0).setDepth(depth);
      root.push(bg);

      const halo=this.add.graphics().setScrollFactor(0).setDepth(depth+1);
      halo.fillStyle(0x1b72a8,0.12);
      halo.fillEllipse(w*.5,h*.44,Math.min(w*.76,760),Math.min(h*.76,480));
      root.push(halo);

      const title=this.add.text(w/2,Math.max(28,h*.10),trackLabel(trackKey),{
        fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize:`${Math.max(20,Math.min(34,Math.floor(h*.065)))}px`,
        fontStyle:'bold',color:'#ffffff',align:'center'
      }).setOrigin(.5,0).setScrollFactor(0).setDepth(depth+3);
      root.push(title);

      // Silueta del circuito a partir del JSON que Boot ya mantiene en caché para track01.
      const data=this.cache?.json?.get?.(`trackjson:${trackKey}`) || this.cache?.json?.get?.('trackjson:track01');
      const raw=Array.isArray(data?.centerline)?data.centerline:[];
      const pts=raw.map(normalizePoint).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      const g=this.add.graphics().setScrollFactor(0).setDepth(depth+2);
      root.push(g);
      if(pts.length>1){
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
        const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY);
        const boxW=Math.min(w*.62,620),boxH=Math.min(h*.48,330);
        const s=Math.min(boxW/bw,boxH/bh);
        const ox=w/2-bw*s/2;
        const oy=h*.46-bh*s/2;
        const draw=pts.map(p=>({x:ox+(p.x-minX)*s,y:oy+(p.y-minY)*s}));
        g.lineStyle(Math.max(12,Math.min(24,h*.035)),0xd6e2ee,.30);
        g.beginPath();g.moveTo(draw[0].x,draw[0].y);for(let i=1;i<draw.length;i++)g.lineTo(draw[i].x,draw[i].y);g.strokePath();
        g.lineStyle(Math.max(7,Math.min(15,h*.022)),0x121b27,1);
        g.beginPath();g.moveTo(draw[0].x,draw[0].y);for(let i=1;i<draw.length;i++)g.lineTo(draw[i].x,draw[i].y);g.strokePath();
        g.lineStyle(2,0x65d8ff,.42);
        g.beginPath();g.moveTo(draw[0].x,draw[0].y);for(let i=1;i<draw.length;i++)g.lineTo(draw[i].x,draw[i].y);g.strokePath();
      }

      const barW=Math.min(620,w*.72);
      const barH=Math.max(10,Math.min(16,h*.025));
      const barY=Math.min(h-58,h*.82);
      const frame=this.add.rectangle(w/2,barY,barW,barH,0x000000,.30).setStrokeStyle(1,0x78dfff,.65).setScrollFactor(0).setDepth(depth+3);
      const fill=this.add.rectangle(w/2-barW/2+2,barY,2,Math.max(4,barH-4),0x77ddff,.95).setOrigin(0,.5).setScrollFactor(0).setDepth(depth+4);
      const status=this.add.text(w/2,barY+Math.max(22,h*.035),'CARGANDO CIRCUITO · 0%',{
        fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize:`${Math.max(12,Math.min(17,Math.floor(h*.027)))}px`,color:'#dbefff',fontStyle:'bold'
      }).setOrigin(.5,0).setScrollFactor(0).setDepth(depth+4);
      root.push(frame,fill,status);

      const onProgress=(p)=>{
        const v=Math.max(0,Math.min(1,Number(p)||0));
        fill.width=Math.max(2,(barW-4)*v);
        status.setText(`CARGANDO CIRCUITO · ${Math.round(v*100)}%`);
      };
      const onError=()=>status.setText('CARGANDO CIRCUITO · REINTENTANDO RECURSOS…');
      const onComplete=()=>{onProgress(1);this.load.off('progress',onProgress);this.load.off('loaderror',onError);};
      this.load.on('progress',onProgress);
      this.load.on('loaderror',onError);
      this.load.once('complete',onComplete);

      this._raceLoadingUi={root,status,onProgress,onError};
    }catch(err){
      try{console.warn('[TDR2] race loading UI failed',err);}catch{}
    }
  }

  _destroyRaceLoadingUi(){
    const ui=this._raceLoadingUi;
    if(!ui)return;
    try{this.load.off('progress',ui.onProgress);}catch{}
    try{this.load.off('loaderror',ui.onError);}catch{}
    for(const obj of ui.root||[]){try{obj?.destroy?.();}catch{}}
    this._raceLoadingUi=null;
  }

  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('off')) this.textures.remove('off'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}

    const prefs = currentVideoPrefs();
    const lowSurfaceMode = prefs.preset === 'performance';
    const trackKey = currentTrackKey(this);
    this._buildRaceLoadingUi(trackKey);

    // RENDIMIENTO conserva los fallbacks procedurales ligeros. No se decodifican
    // mapas pesados ni normales; es la ruta destinada a móviles antiguos/calientes.
    if (window.__tdrIosSafeMode === true || lowSurfaceMode) {
      try {
        window.__tdrLowSurfaceMode = true;
        console.info('[TDR2][SURFACE PERFORMANCE] Heavy race surface textures skipped', { preset:prefs.preset });
      } catch {}
      return;
    }

    try { window.__tdrLowSurfaceMode = false; } catch {}

    // CIRCUITO ATLÁNTICO usa las tres superficies Poly Haven elegidas por el usuario.
    // En móvil el presupuesto evita normales 4K: la diferencia visual desde cámara cenital
    // es mínima, mientras que el coste de memoria descomprimida es enorme.
    if (trackKey === ATLANTICO_TRACK_KEY) {
      const plan=surfacePlan(prefs);
      const grassDiff=polyhaven('sparse_grass','diff','jpg',plan.diff);
      const dirtDiff=polyhaven('rocky_trail_02','diff','jpg',plan.diff);
      const grassNormal=polyhaven('sparse_grass','nor_gl','png',plan.normal);
      const dirtNormal=polyhaven('rocky_trail_02','nor_gl','png',plan.normal);
      this.load.image('grass', prefs.lighting ? [grassDiff,grassNormal] : grassDiff);
      this.load.image('off', prefs.lighting ? [dirtDiff,dirtNormal] : dirtDiff);
      this.load.image('asphalt', polyhaven('asphalt_02','diff','jpg',plan.asphalt));
      try{console.info('[TDR2][SURFACE BUDGET]',{preset:prefs.preset,...plan});}catch{}
      return;
    }

    // Resto de circuitos: superficies aprobadas anteriores. El preset sigue afectando
    // a chunks, overlay, partículas, AA y FPS aunque todavía no haya variantes 1/2/4K.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');

    const offPath = trackKey === 'offroad-raven-hollow'
      ? 'assets/materials/dirt-road/road_damaged_2_diff_2k.jpg?v=20260824-raven-dirt-v1'
      : 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1';
    this.load.image('off', offPath);

    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
  }

  create(data) {
    const result = super.create?.(data);

    if (canUseAtlanticoLitSurfaces(this)) {
      try { this.bgGrass?.setPipeline?.('Light2D'); } catch {}
      try { this.bgOff?.setPipeline?.('Light2D'); } catch {}
      try {
        const prefs=currentVideoPrefs();
        const plan=surfacePlan(prefs);
        console.info('[TDR2][ATLANTICO PBR] grass + dirt Light2D armed', {
          grass: 'sparse_grass',
          dirt: 'rocky_trail_02',
          preset:prefs.preset,
          diffuse:plan.diff,
          normal:plan.normal,
          mobile:plan.mobile
        });
      } catch {}
    }

    this._destroyRaceLoadingUi();
    return result;
  }

  ensureBgTexture() {
    if (this.textures.exists('grass')) return;
    super.ensureBgTexture?.();
  }

  ensureOffTexture() {
    if (this.textures.exists('off')) return;
    super.ensureOffTexture?.();
  }

  ensureAsphaltTexture() {
    if (this.textures.exists('asphalt')) return;
    super.ensureAsphaltTexture?.();
  }
}
