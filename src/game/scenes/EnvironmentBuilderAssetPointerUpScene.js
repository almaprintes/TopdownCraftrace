import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderExportPathFixScene.js';
import { createTrackEnvironment } from '../tracks/environmentRegistry.js';
import '../environment/environmentStudioUnified.css';

const TAP_PX=9;
const PROTECTED_REPO_ASSET_PREFIXES=['santacruz_'];
const EDITABLES={guardrail:{label:'GUARDARRAÍL',type:'guardrail',asset:'guardrail_straight_01',path:'environment/barriers/guardrail_straight_01.webp',spacing:105},plastic:{label:'BARRERA PLÁSTICA',type:'plastic',asset:'plastic_barrier_redwhite_01',path:'environment/barriers/plastic_barrier_redwhite_01.webp',spacing:92},concrete:{label:'HORMIGÓN',type:'concrete',asset:'concrete_barrier_straight_01',path:'environment/barriers/concrete_barrier_straight_01.webp',spacing:108},fence:{label:'VALLA',type:'fence',asset:'fence_chainlink_straight_01',path:'environment/props/fence_chainlink_straight_01.webp',spacing:112},tires:{label:'NEUMÁTICOS',type:'tires',asset:'tire_barrier_straight_short_01',path:'environment/barriers/tire_barrier_straight_short_01.webp',spacing:82}};
const nice=id=>String(id||'').replace(/_01$/,'').replaceAll('_',' ').toUpperCase();

export class EnvironmentBuilderScene extends Current{
  create(){this._assetTapCandidate=null;this._emptyTapCandidate=null;super.create();this._rewireExistingAssets();this._mountDomShell();requestAnimationFrame(()=>this._disableLegacyPhaserUi());this.time.delayedCall(80,()=>this._disableLegacyPhaserUi());this.time.delayedCall(260,()=>this._disableLegacyPhaserUi());this.events.once('shutdown',()=>this._unmountDomShell());}

  _mergeProtectedRepoAssets(project){
    const repoProject=createTrackEnvironment(this._trackId);
    if(!repoProject||!project)return project;
    const q=JSON.parse(JSON.stringify(project));
    q.environment=Array.isArray(q.environment)?q.environment:[];
    const present=new Set(q.environment.map(d=>String(d?.asset||'')));
    const recovered=[];
    for(const d of repoProject.environment||[]){
      const id=String(d?.asset||'');
      if(!PROTECTED_REPO_ASSET_PREFIXES.some(prefix=>id.startsWith(prefix))||present.has(id))continue;
      q.environment.push(JSON.parse(JSON.stringify(d)));present.add(id);recovered.push(id);
    }
    if(recovered.length)console.warn('[TDR2] recovered protected repo assets from stale local draft',recovered);
    return q;
  }

  _load(){
    try{const raw=localStorage.getItem(this._storageKey?.()||'');if(raw){const localProject=JSON.parse(raw);const safeProject=this._mergeProtectedRepoAssets(localProject);const recovered=Math.max(0,(safeProject?.environment?.length||0)-(localProject?.environment?.length||0));this._applyProject(safeProject);this._flash?.(recovered?`CARGADO · ${recovered} ASSET(S) OFICIALES RECUPERADOS`:'CARGADO · BORRADOR LOCAL');return true;}}catch(_){this._flash?.('ERROR CARGANDO BORRADOR');return false;}
    try{const repoProject=createTrackEnvironment(this._trackId);if(repoProject){this._applyProject(repoProject);this._flash?.('CARGADO · VERSIÓN DEL REPO');return true;}}catch(_){this._flash?.('ERROR CARGANDO REPO');return false;}
    this._flash?.('SIN PROYECTO');return false;
  }

  _disableLegacyPhaserUi(){
    const cam=this._editCam;if(!cam)return;
    for(const o of this.children?.list||[]){let ui=false;try{ui=!!(Number(o.cameraFilter||0)&Number(cam.id||0));}catch{}if(!ui)continue;try{o.setVisible?.(false);}catch{}try{o.disableInteractive?.();}catch{}try{if(o.input)o.input.enabled=false;}catch{}}
  }

  _mountDomShell(){
    this._unmountDomShell();
    const root=document.createElement('div');
    root.id='tdr-environment-studio-dom';
    root.setAttribute('aria-label','Environment Studio 2.0');
    root.innerHTML=[
      '<header class="es-head">',
        '<div class="es-brand"><div class="es-logo">TD<em>R</em></div>',
        '<div class="es-titles"><small>ADMIN HUB</small><strong>ENVIRONMENT STUDIO <em>2.0</em></strong></div></div>',
        '<div class="es-head-actions">',
          '<button data-act="save">GUARDAR</button><button data-act="load">ABRIR</button>',
          '<button data-act="export">EXPORTAR</button><button data-act="photo">CARGAR FOTO</button>',
          '<label class="es-track"><span>CIRCUITO</span><select data-track aria-label="Seleccionar circuito"></select></label>',
          '<span class="es-version" data-version>DEV</span>',
          '<button class="danger" data-act="exit">VOLVER A PADDOCK</button>',
        '</div>',
      '</header>',
      '<nav class="es-left" aria-label="Controles de cámara">',
        '<button data-act="fit" title="Encuadrar el circuito completo">TODO</button>',
        '<button data-act="zoomIn" title="Acercar">＋</button>',
        '<button data-act="zoomOut" title="Alejar">−</button>',
        '<button data-act="pan">PAN</button><button class="on" data-act="select">SEL</button>',
      '</nav>',
      '<aside class="es-right" aria-label="Herramientas de Environment Studio">',
        '<section><h3>BIBLIOTECA DE ENTORNO</h3><div class="es-tabs" data-cats></div><div class="es-assets" data-assets></div></section>',
        '<details><summary>ELEMENTOS EDITABLES</summary><section><div class="es-grid editables" data-editables></div></section></details>',
        '<details><summary>CAPAS</summary><section><div class="es-grid four">',
          '<button data-act="back">FONDO</button><button data-act="down">− CAPA</button>',
          '<button data-act="up">＋ CAPA</button><button data-act="front">FRENTE</button>',
        '</div></section></details>',
        '<details><summary>TRANSFORMAR SELECCIÓN</summary><section><div class="es-grid four">',
          '<button data-act="rotL">↶ 15°</button><button data-act="rotR">↷ 15°</button>',
          '<button data-act="scaleD">ESC −</button><button data-act="scaleU">ESC ＋</button>',
          '<button data-act="flipX">↔ X</button><button data-act="flipY">↕ Y</button>',
          '<button data-act="dup">DUP</button><button class="danger" data-act="delete">BORRAR</button>',
          '<button class="danger" data-act="clearAll">BORRAR TODO</button>',
        '</div></section></details>',
      '</aside>',
      '<div class="es-status" data-status role="status" aria-live="polite"></div>'
    ].join('');
    document.body.appendChild(root);
    this._environmentDom=root;
    root.querySelector('[data-version]').textContent=
      document.querySelector('meta[name="tdr-dev-version"]')?.content||'DEV';
    // Align DOM panels with the real Phaser editor camera and iPhone safe rail.
    const position=()=>{
      const rect=this.game?.canvas?.getBoundingClientRect?.();
      if(!rect?.width||!rect?.height)return;
      const sx=rect.width/Math.max(1,this.scale.width);
      const sy=rect.height/Math.max(1,this.scale.height);
      root.style.left=rect.left+'px';root.style.top=rect.top+'px';
      root.style.width=rect.width+'px';root.style.height=rect.height+'px';
      root.style.setProperty('--es-header',(this._top*sy)+'px');
      root.style.setProperty('--es-left',(this._vx*sx)+'px');
      root.style.setProperty('--es-right',(this._right*sx)+'px');
    };
    this._environmentDomPosition=position;
    window.addEventListener('resize',position);
    window.addEventListener('orientationchange',position);
    this.scale?.on?.('resize',position);
    this._installDomStyles();this._wireDomShell();
    this._renderDomTracks();this._renderDomAssets('ESTRUCTURAS');
    this._renderDomEditables();this._syncDomStatus();position();
  }
  _installDomStyles(){
    // Styles come from environmentStudioUnified.css, shared by all inherited
    // tools. No injected legacy style tag is allowed to override it.
  }
  _wireDomShell(){const r=this._environmentDom;if(!r)return;const on=(a,f)=>r.querySelector(`[data-act="${a}"]`)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();f();this._syncDomStatus();});on('save',()=>this._save?.());on('load',()=>this._load?.());on('export',()=>this._export?.());on('exit',()=>this.scene.start('admin-hub'));on('fit',()=>this._fitRealTrack?.());on('photo',()=>this._pickGuide?.());on('zoomIn',()=>this._zoom?.(1.2));on('zoomOut',()=>this._zoom?.(1/1.2));on('pan',()=>{this._mode='pan';});on('select',()=>{this._disarmCreation?.();this._mode='select';});on('rotL',()=>this._rotate?.(-15));on('rotR',()=>this._rotate?.(15));on('scaleD',()=>this._scale?.(.9));on('scaleU',()=>this._scale?.(1.1));on('flipX',()=>this._flip?.('x'));on('flipY',()=>this._flip?.('y'));on('dup',()=>this._duplicate?.());on('delete',()=>this._delete?.());on('clearAll',()=>this._clearCurrentDecoration?.());on('back',()=>this._layerToBack?.());on('down',()=>this._layerDown?.());on('up',()=>this._layerUp?.());on('front',()=>this._layerToFront?.());r.querySelector('[data-track]')?.addEventListener('change',e=>{const key=e.target.value;if(key&&key!==this._trackId)this._chooseRealTrack?.(key);this._syncDomStatus();});}

  _renderDomTracks(){const sel=this._environmentDom?.querySelector('[data-track]');if(!sel)return;sel.innerHTML='';for(const key of this._trackKeys||[]){let name=key;try{const t=key===this._trackId?this._realTrack:null;name=t?.name||key;}catch{}const o=document.createElement('option');o.value=key;o.textContent=name;o.selected=key===this._trackId;sel.appendChild(o);}}
  _renderDomAssets(category){const r=this._environmentDom;if(!r)return;const cats=['VEGETACIÓN','BARRERAS','PROPS','ESTRUCTURAS'],tabs=r.querySelector('[data-cats]');if(tabs){tabs.innerHTML='';for(const c of cats){const b=document.createElement('button');b.textContent=c.slice(0,5);b.classList.toggle('on',c===category);b.onclick=()=>this._renderDomAssets(c);tabs.appendChild(b);}}const host=r.querySelector('[data-assets]');if(!host)return;host.innerHTML='';let all=[];try{all=this._allAssets?.()||[];}catch{}for(const a of all.filter(x=>x?.cat===category)){const b=document.createElement('button');b.className='es-asset';b.innerHTML=`<img src="${import.meta.env.BASE_URL||'/'}assets/${a.path}" alt=""><span>${a.label||nice(a.id)}</span>`;b.onclick=()=>{this._spawn?.(a);this._syncDomStatus();};host.appendChild(b);}}
  _renderDomEditables(){const h=this._environmentDom?.querySelector('[data-editables]');if(!h)return;h.innerHTML='';const defs=Object.values(EDITABLES).map(d=>[d.label,()=>this._chooseLinear?.(d)]);for(const [label,fn] of defs){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{fn();this._syncDomStatus();};h.appendChild(b);}}
  _syncDomStatus(){const r=this._environmentDom;if(!r)return;const mode=this._mode==='surface'?'ASFALTO':this._mode==='linear-barrier'?(this._linearDef?.label||'EDITABLE'):this._mode==='pan'?'PAN':'SELECCIÓN';const st=r.querySelector('[data-status]');if(st)st.textContent=`MODO · ${mode}`;const info=r.querySelector('[data-surface-info]');if(info)info.textContent=`física ${this._surfacePhysics==='asphalt'?'ASFALTO':'CÉSPED'} · ancho ${Number(this._surfaceWidth||120)}`;r.querySelectorAll('.es-left button').forEach(b=>b.classList.remove('on'));const active=this._mode==='pan'?'pan':this._mode==='surface'?'asphalt':'select';r.querySelector(`[data-act="${active}"]`)?.classList.add('on');const sel=r.querySelector('[data-track]');if(sel&&sel.value!==this._trackId)sel.value=this._trackId;}
  _unmountDomShell(){
    if(this._environmentDomPosition){
      window.removeEventListener('resize',this._environmentDomPosition);
      window.removeEventListener('orientationchange',this._environmentDomPosition);
      this.scale?.off?.('resize',this._environmentDomPosition);
    }
    this._environmentDomPosition=null;
    this._environmentDom?.remove?.();this._environmentDom=null;
    document.getElementById('tdr-environment-studio-style')?.remove?.();
  }


  _clearCurrentDecoration(){
    const count=(this._objects?.length||0)+(this._surfaces?.length||0)+(this._rails?.length||0);
    if(!count){this._flash?.('NO HAY DECORACIÓN QUE BORRAR');return;}
    const ok=window.confirm?.(`Borrar toda la decoración editable de ${this._realTrack?.name||this._trackId}?\n\nEl trazado oficial no se modifica.`);if(ok===false)return;
    for(const o of this._objects||[])try{o?.destroy?.();}catch{}
    this._objects=[];this._surfaces=[];this._rails=[];this._selected=null;this._selectedSurface=null;this._selRail=null;
    this._selectionG?.clear?.();this._redrawSurfaces?.();this._railRoot?.removeAll?.(true);this._drawRails?.();this._syncDomStatus?.();this._flash?.('DECORACIÓN BORRADA');
  }

  _wireAsset(img){if(!img)return img;try{img.setInteractive?.({useHandCursor:true,draggable:true});this.input?.setDraggable?.(img,true);}catch{}img.removeAllListeners('pointerdown');img.removeAllListeners('drag');img.on('drag',(_p,dx,dy)=>{if(this._pinching||this._mode!=='select'||this._selected!==img)return;img.x=dx;img.y=dy;this._drawSelection?.();});return img;}
  _rewireExistingAssets(){for(const img of this._objects||[])this._wireAsset(img);}
  _spawn(a,data=null){const img=super._spawn(a,data);this._syncDomStatus();return this._wireAsset(img);}
  _applyProject(p){super._applyProject?.(p);this._rewireExistingAssets();this._renderDomTracks();this._syncDomStatus();}
  _assetAtWorld(w){if(!w)return null;const objects=this._objects||[];for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(!o?.scene||!o.visible)continue;let b=null;try{b=o.getBounds?.();}catch{}if(b&&w.x>=b.x&&w.x<=b.x+b.width&&w.y>=b.y&&w.y<=b.y+b.height)return o;}return null;}
  _setupInput(){super._setupInput();const isAsset=o=>!!o?._env,worldAt=p=>this._editCam.getWorldPoint(p.x,p.y);this.input.on('pointerdown',(p,currentlyOver=[])=>{this._emptyTapCandidate=null;if(this._pinching){this._assetTapCandidate=null;return;}if(this._mode!=='select'||!this._inside?.(p))return;const w=worldAt(p),asset=(currentlyOver||[]).find(isAsset)||this._assetAtWorld(w);if(asset){if(asset===this._selected){this._assetTapCandidate=null;return;}this._assetTapCandidate={pointerId:p.id,asset,x:p.x,y:p.y};this._freePan={pointerId:p.id,x:p.x,y:p.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};this._panStart=null;return;}this._assetTapCandidate=null;const busy=!!this._surfaceHandleAt?.(w)||!!this._railHandle?.(w)||!!this._surfaceAt?.(w)||!!this._railAt?.(w);if(!busy)this._emptyTapCandidate={pointerId:p.id,x:p.x,y:p.y};});this.input.on('pointerup',p=>{this._finishAssetTap(p,true);this._finishEmptyTap(p,true);});this.input.on('pointerupoutside',p=>{this._finishAssetTap(p,false);this._finishEmptyTap(p,false);});}
  _finishAssetTap(p,allowSelect){const c=this._assetTapCandidate;if(!c||!p||p.id!==c.pointerId)return;this._assetTapCandidate=null;const dx=p.x-c.x,dy=p.y-c.y;if(allowSelect&&dx*dx+dy*dy<=TAP_PX*TAP_PX&&c.asset?.scene)this._select?.(c.asset);this._syncDomStatus();}
  _finishEmptyTap(p,allowDeselect){const c=this._emptyTapCandidate;if(!c||!p||p.id!==c.pointerId)return;this._emptyTapCandidate=null;const dx=p.x-c.x,dy=p.y-c.y;if(!allowDeselect||dx*dx+dy*dy>TAP_PX*TAP_PX)return;this._selected=null;this._selectedSurface=null;this._selRail=null;this._selectionG?.clear?.();this._mode='select';this._refreshSurfaceDepthButton?.();this._updateLayerInfo?.();this._status?.();this._syncDomStatus();}
}
