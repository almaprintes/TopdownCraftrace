import { RaceScene as CurrentRaceScene } from './RaceWorldAlignedMaterialsScene.js';
import { getTrackBeautyLayerConfig } from '../tracks/trackBeautyLayers.js';

const START_ASSETS = [
  ['start_base','assets/startlights/start_base.png'],
  ['start_l1','assets/startlights/start_l1.png'],
  ['start_l2','assets/startlights/start_l2.png'],
  ['start_l3','assets/startlights/start_l3.png'],
  ['start_l4','assets/startlights/start_l4.png'],
  ['start_l5','assets/startlights/start_l5.png'],
  ['start_l6','assets/startlights/start_l6.png']
];

function selectedTrackKey(scene){
  let stored='';
  try{stored=localStorage.getItem('tdr2:trackKey')||'';}catch{}
  return String(scene?.trackKey||scene?.track?.meta?.id||stored||'').trim().toLowerCase();
}

export class RaceScene extends CurrentRaceScene {
  _activateAtlanticoPbrPilot(trackId){
    if(String(trackId||'').trim().toLowerCase()==='track01'){
      this._atlanticoPbrActive=false;
      return;
    }
    return super._activateAtlanticoPbrPilot?.(trackId);
  }

  _activateTrackBeautyLayer(cfg,trackId){
    // Rescue mode must actually lower GPU-memory pressure. Re-use the proven
    // legacy tiled terrain instead of uploading every full-world Beauty tile.
    if(window.__tdrIosSafeMode===true){
      this._beautyLayerActive=false;
      this._beautyLayerFailed=false;
      return;
    }
    return super._activateTrackBeautyLayer?.(cfg,trackId);
  }

  preload(){
    const trackKey=selectedTrackKey(this);
    const beauty=getTrackBeautyLayerConfig(trackKey);
    const safeMode=window.__tdrIosSafeMode===true;
    const beautyConfigured=!!(beauty?.useBeautyLayer&&beauty?.assetsAvailable&&beauty?.tiles?.length);
    const beautyReady=beautyConfigured&&!safeMode;
    const beautyKeys=new Set((beauty?.tiles||[]).map(tile=>String(tile?.key||'')).filter(Boolean));

    // Normal mode: Beauty tiles replace the live terrain sources.
    // Safe mode: do the inverse — allow the small repeatable terrain textures
    // and suppress the large full-world Beauty images entirely.
    const loader=this.load;
    const originalImage=loader?.image;
    const needsFilter=(beautyReady||(safeMode&&beautyConfigured))&&typeof originalImage==='function';
    if(needsFilter){
      loader.image=function(key,...args){
        const k=String(key||'');
        if(beautyReady&&(k==='grass'||k==='off'||k==='asphalt'||k==='tdr_atlantico_asphalt_lit')) return this;
        if(safeMode&&beautyKeys.has(k)) return this;
        return originalImage.call(this,key,...args);
      };
    }

    try{
      super.preload?.();
    }finally{
      if(needsFilter&&loader&&originalImage) loader.image=originalImage;
    }

    if(!safeMode){
      for(const [key,url] of START_ASSETS){
        if(!this.textures.exists(key)) this.load.image(key,url);
      }
    }
  }

  create(){
    super.create();
    if(window.__tdrIosSafeMode!==true) return;

    try{this._startAsset?.setVisible(false);}catch{}
    try{this._startTitle?.setVisible(false);}catch{}
    try{this._startHint?.setVisible(false);}catch{}
    try{this._startStatus?.setVisible(false);}catch{}

    const w=this.scale.width;
    const h=this.scale.height;
    const countdown=this.add.text(w/2,h*.28,'3',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:`${Math.max(74,Math.min(132,Math.floor(h*.25)))}px`,
      fontStyle:'bold',
      color:'#ffffff',
      stroke:'#000000',
      strokeThickness:5,
      align:'center'
    }).setOrigin(.5).setScrollFactor(0).setDepth(2200);
    countdown.setShadow(0,5,'#000000',10,true,true);
    this._safeStartCountdown=countdown;

    this.time.delayedCall(1350,()=>{if(countdown?.scene)countdown.setText('2');});
    this.time.delayedCall(2550,()=>{if(countdown?.scene)countdown.setText('1');});

    const syncGo=()=>{
      if(!countdown?.scene)return;
      if(this._startState==='GO'){
        countdown.setText('¡YA!').setColor('#2bff88').setScale(1.12);
        this.time.delayedCall(330,()=>countdown?.destroy?.());
        return;
      }
      if(this._startState==='RACING'){
        countdown.destroy();
        return;
      }
      this.time.delayedCall(40,syncGo);
    };
    this.time.delayedCall(150,syncGo);

    const onResize=gameSize=>{
      if(!countdown?.scene)return;
      countdown.setPosition(gameSize.width/2,gameSize.height*.28);
      countdown.setFontSize(Math.max(74,Math.min(132,Math.floor(gameSize.height*.25))));
    };
    this.scale.on('resize',onResize);
    this.events.once('shutdown',()=>{
      this.scale.off('resize',onResize);
      try{countdown?.destroy?.();}catch{}
      this._safeStartCountdown=null;
    });

    try{this.cameras.main.ignore(countdown);}catch{}
  }
}
