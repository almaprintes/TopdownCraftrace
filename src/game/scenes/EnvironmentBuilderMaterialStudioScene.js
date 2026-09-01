import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderAssetPointerUpScene.js';

const DB='tdr2_environment_materials';
const STORE='textures';
const TYPES=['asphalt','grass','offroad'];
const LABELS={asphalt:'ASFALTO',grass:'HIERBA',offroad:'OFFROAD'};

function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbPut(key,blob){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function dbGet(key){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}

export class EnvironmentBuilderScene extends Current{
  create(){
    this._materialConfig={};
    this._materialUrls={};
    super.create();
    this.time.delayedCall(0,()=>{this._mountMaterialPanel();this._restoreMaterialBlobs();});
    this.events.once('shutdown',()=>this._cleanupMaterialUrls());
  }

  _materialKey(type){return `${this._trackId||'unknown'}:${type}`;}

  _project(){
    const p=super._project?.()||{};
    p.materials={};
    for(const type of TYPES){
      const m=this._materialConfig?.[type];
      if(!m)continue;
      p.materials[type]={fileName:m.fileName||'',repeat:Number(m.repeat)||512,brightness:Number(m.brightness)||1};
    }
    return p;
  }

  _applyProject(p){
    super._applyProject?.(p);
    this._materialConfig={};
    for(const type of TYPES){
      const m=p?.materials?.[type];
      if(m)this._materialConfig[type]={fileName:String(m.fileName||''),repeat:Number(m.repeat)||512,brightness:Number(m.brightness)||1};
    }
    this.time?.delayedCall?.(0,()=>{this._renderMaterialPanel();this._restoreMaterialBlobs();});
  }

  _openRealTrack(trackId,resetProject=true){
    this._cleanupMaterialUrls();
    super._openRealTrack?.(trackId,resetProject);
    this.time.delayedCall(0,()=>{this._renderMaterialPanel();this._restoreMaterialBlobs();});
  }

  _mountMaterialPanel(){
    const root=this._environmentDom;if(!root||root.querySelector('[data-materials]'))return;
    const aside=root.querySelector('.es-right');if(!aside)return;
    const section=document.createElement('section');section.className='es-materials';section.innerHTML='<h3>MATERIALES</h3><p class="es-material-help">Arrastra una textura a cada superficie o tócala para elegir archivo.</p><div data-materials></div>';
    aside.prepend(section);
    this._installMaterialStyles();
    this._renderMaterialPanel();
  }

  _installMaterialStyles(){
    if(document.getElementById('tdr-environment-material-style'))return;
    const s=document.createElement('style');s.id='tdr-environment-material-style';s.textContent=`.es-material-help{font-size:8px;line-height:1.25;color:#8fa5bd;margin:0 0 8px}.es-material-card{border:1px solid #304765;background:#101a28;margin:0 0 8px;padding:7px}.es-material-drop{height:62px;border:1px dashed #4f7598;background:#0a121c;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;cursor:pointer}.es-material-drop.drag{border-color:#45e89a;background:#10251d}.es-material-drop img{width:100%;height:100%;object-fit:cover}.es-material-drop span{font-size:9px;color:#a8bdd0;text-align:center;padding:6px}.es-material-row{display:grid;grid-template-columns:64px 1fr 1fr;gap:6px;align-items:center;margin-top:6px}.es-material-row b{font-size:9px;color:#dce8f5}.es-material-row label{font-size:7px;color:#8097ad}.es-material-row input[type=range]{display:block;width:100%;margin:2px 0 0}.es-material-file{display:none}`;document.head.appendChild(s);
  }

  _renderMaterialPanel(){
    const host=this._environmentDom?.querySelector('[data-materials]');if(!host)return;host.innerHTML='';
    for(const type of TYPES){
      const cfg=this._materialConfig[type]||{repeat:512,brightness:1};
      const card=document.createElement('div');card.className='es-material-card';
      card.innerHTML=`<div class="es-material-drop" data-drop="${type}"><span>${LABELS[type]} · ARRASTRA AQUÍ</span><input class="es-material-file" data-file="${type}" type="file" accept="image/png,image/jpeg,image/webp"></div><div class="es-material-row"><b>${LABELS[type]}</b><label>REPETICIÓN<input data-repeat="${type}" type="range" min="128" max="1600" step="16" value="${Number(cfg.repeat)||512}"></label><label>BRILLO<input data-bright="${type}" type="range" min="0.5" max="1.5" step="0.02" value="${Number(cfg.brightness)||1}"></label></div>`;
      host.appendChild(card);
      const drop=card.querySelector(`[data-drop="${type}"]`),file=card.querySelector(`[data-file="${type}"]`);
      drop.onclick=e=>{if(e.target===file)return;file.click();};
      file.onchange=()=>{const f=file.files?.[0];if(f)this._acceptMaterialFile(type,f);};
      drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};
      drop.ondragleave=()=>drop.classList.remove('drag');
      drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');const f=e.dataTransfer?.files?.[0];if(f)this._acceptMaterialFile(type,f);};
      card.querySelector(`[data-repeat="${type}"]`).oninput=e=>{this._ensureMaterialCfg(type).repeat=Number(e.target.value);this._applyMaterialPreview(type);};
      card.querySelector(`[data-bright="${type}"]`).oninput=e=>{this._ensureMaterialCfg(type).brightness=Number(e.target.value);this._applyMaterialPreview(type);};
      this._refreshMaterialCard(type);
    }
  }

  _ensureMaterialCfg(type){return this._materialConfig[type]||(this._materialConfig[type]={fileName:'',repeat:512,brightness:1});}

  async _acceptMaterialFile(type,file){
    if(!file?.type?.startsWith('image/')){this._builderToast?.('FORMATO DE TEXTURA NO VÁLIDO');return;}
    const cfg=this._ensureMaterialCfg(type);cfg.fileName=file.name;
    try{await dbPut(this._materialKey(type),file);this._setMaterialBlobUrl(type,file);this._refreshMaterialCard(type);this._applyMaterialPreview(type);this._builderToast?.(`${LABELS[type]} CARGADO`);}catch(err){console.warn('[TDR2] material store failed',err);this._builderToast?.('NO SE PUDO GUARDAR LA TEXTURA');}
  }

  async _restoreMaterialBlobs(){
    for(const type of TYPES){
      try{const blob=await dbGet(this._materialKey(type));if(blob){this._setMaterialBlobUrl(type,blob);this._refreshMaterialCard(type);this._applyMaterialPreview(type);}}catch{}
    }
  }

  _setMaterialBlobUrl(type,blob){
    if(this._materialUrls[type])URL.revokeObjectURL(this._materialUrls[type]);
    this._materialUrls[type]=URL.createObjectURL(blob);
  }

  _refreshMaterialCard(type){
    const drop=this._environmentDom?.querySelector(`[data-drop="${type}"]`);if(!drop)return;
    const url=this._materialUrls[type],cfg=this._materialConfig[type];
    const old=drop.querySelector('img');if(old)old.remove();const sp=drop.querySelector('span');
    if(url){const img=document.createElement('img');img.src=url;drop.prepend(img);if(sp)sp.textContent=cfg?.fileName||LABELS[type];}
    else if(sp)sp.textContent=`${LABELS[type]} · ARRASTRA AQUÍ`;
  }

  _applyMaterialPreview(type){
    const url=this._materialUrls[type],cfg=this._materialConfig[type];
    if(!url||!cfg)return;
    // The Studio's world renderer does not expose independent grass/offroad/asphalt
    // texture slots yet. Keep the loaded material live and persisted, and expose a
    // truthful preview in the material card. Runtime wiring is deliberately isolated
    // from the editor so this tool cannot corrupt the approved Beauty Layer renderer.
    this._environmentDom?.querySelector(`[data-drop="${type}"]`)?.style.setProperty('filter',`brightness(${Math.max(.5,Math.min(1.5,Number(cfg.brightness)||1))})`);
  }

  _cleanupMaterialUrls(){for(const u of Object.values(this._materialUrls||{}))try{URL.revokeObjectURL(u);}catch{}this._materialUrls={};}
}
