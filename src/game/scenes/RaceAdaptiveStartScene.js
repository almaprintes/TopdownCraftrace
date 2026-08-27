import { RaceScene as CurrentRaceScene } from './RaceWorldAlignedMaterialsScene.js';

const START_ASSETS = [
  ['start_base','assets/startlights/start_base.png'],
  ['start_l1','assets/startlights/start_l1.png'],
  ['start_l2','assets/startlights/start_l2.png'],
  ['start_l3','assets/startlights/start_l3.png'],
  ['start_l4','assets/startlights/start_l4.png'],
  ['start_l5','assets/startlights/start_l5.png'],
  ['start_l6','assets/startlights/start_l6.png']
];

const ATLANTICO_GRASS_SCALE = 0.55;
const ATLANTICO_DIRT_SCALE = 0.48;
// Relative to the old Image renderer: 0.50 means half the previous apparent grain size.
const ATLANTICO_ASPHALT_PHYSICAL_SCALE = 0.50;

function isAtlantico(scene){
  let stored='';
  try{stored=localStorage.getItem('tdr2:trackKey')||'';}catch{}
  return String(scene?.trackKey||scene?.track?.meta?.id||stored||'').trim().toLowerCase()==='track01';
}

function replaceAtlanticoAsphaltChunk(scene,cell){
  const old=cell?.tile;
  if(!old?.scene || String(old?.texture?.key||'')!=='asphalt')return;

  // The legacy road renderer uses Image + setDisplaySize, so tileScale never affected it.
  // Convert only Atlantico road chunks to TileSprite while preserving geometry/mask/depth.
  if(old.type==='TileSprite'){
    const source=scene.textures.get('asphalt')?.getSourceImage?.();
    const sourceW=Math.max(1,Number(source?.naturalWidth||source?.width||1));
    const baseScale=Math.max(0.001,Number(old.width||old.displayWidth||1)/sourceW);
    const target=baseScale*ATLANTICO_ASPHALT_PHYSICAL_SCALE;
    old.tileScaleX=target;old.tileScaleY=target;
    old.tilePositionX=Number(old.x||0);old.tilePositionY=Number(old.y||0);
    return;
  }

  const w=Math.max(1,Number(old.displayWidth||old.width||1));
  const h=Math.max(1,Number(old.displayHeight||old.height||1));
  const source=scene.textures.get('asphalt')?.getSourceImage?.();
  const sourceW=Math.max(1,Number(source?.naturalWidth||source?.width||1));
  const baseScale=w/sourceW;
  const targetScale=baseScale*ATLANTICO_ASPHALT_PHYSICAL_SCALE;
  const mask=cell.mask||old.mask||null;
  const x=Number(old.x||0),y=Number(old.y||0);

  const tiled=scene.add.tileSprite(x,y,w,h,'asphalt')
    .setOrigin(Number(old.originX??0),Number(old.originY??0))
    .setScrollFactor(Number(old.scrollFactorX??1),Number(old.scrollFactorY??1))
    .setDepth(Number(old.depth||10))
    .setAlpha(Number(old.alpha??1))
    .setVisible(old.visible!==false);
  tiled.tileScaleX=targetScale;
  tiled.tileScaleY=targetScale;
  // World-aligned UVs: adjacent chunks sample the same continuous material field.
  tiled.tilePositionX=x;
  tiled.tilePositionY=y;
  if(mask)tiled.setMask(mask);
  try{scene.uiCam?.ignore?.(tiled);}catch{}
  try{old.clearMask?.(false);}catch{}
  try{old.destroy?.();}catch{}
  cell.tile=tiled;
}

function applyAtlanticoMaterials(scene){
  if(!isAtlantico(scene))return;
  const scale=(obj,value)=>{try{if(obj?.type==='TileSprite'){obj.tileScaleX=value;obj.tileScaleY=value;}}catch{}};
  if(String(scene.bgGrass?.texture?.key||'')==='grass')scale(scene.bgGrass,ATLANTICO_GRASS_SCALE);
  if(String(scene.bgOff?.texture?.key||'')==='off')scale(scene.bgOff,ATLANTICO_DIRT_SCALE);
  const cells=scene.track?.gfxByCell;
  if(cells?.values){for(const cell of cells.values())replaceAtlanticoAsphaltChunk(scene,cell);}
}

export class RaceScene extends CurrentRaceScene {
  // Performance A/B remains active: no Light2D asphalt pilot on Atlantico for now.
  _activateAtlanticoPbrPilot(trackId){
    if(String(trackId||'').trim().toLowerCase()==='track01'){
      this._atlanticoPbrActive=false;
      return;
    }
    return super._activateAtlanticoPbrPilot?.(trackId);
  }

  preload(){
    super.preload?.();
    if(window.__tdrIosSafeMode!==true){
      for(const [key,url] of START_ASSETS){
        if(!this.textures.exists(key))this.load.image(key,url);
      }
    }
  }

  create(){
    super.create();
    applyAtlanticoMaterials(this);

    if(window.__tdrIosSafeMode!==true)return;
    try{this._startAsset?.setVisible(false);}catch{}
    try{this._startTitle?.setVisible(false);}catch{}
    try{this._startHint?.setVisible(false);}catch{}
    try{this._startStatus?.setVisible(false);}catch{}

    const w=this.scale.width,h=this.scale.height;
    const countdown=this.add.text(w/2,h*.28,'3',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:`${Math.max(74,Math.min(132,Math.floor(h*.25)))}px`,
      fontStyle:'bold',color:'#ffffff',stroke:'#000000',strokeThickness:5,align:'center'
    }).setOrigin(.5).setScrollFactor(0).setDepth(2200);
    countdown.setShadow(0,5,'#000000',10,true,true);
    this._safeStartCountdown=countdown;
    this.time.delayedCall(1350,()=>{if(countdown?.scene)countdown.setText('2');});
    this.time.delayedCall(2550,()=>{if(countdown?.scene)countdown.setText('1');});
    const syncGo=()=>{
      if(!countdown?.scene)return;
      if(this._startState==='GO'){
        countdown.setText('¡YA!').setColor('#2bff88').setScale(1.12);
        this.time.delayedCall(330,()=>countdown?.destroy?.());return;
      }
      if(this._startState==='RACING'){countdown.destroy();return;}
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

  update(time,delta){
    super.update?.(time,delta);
    applyAtlanticoMaterials(this);
  }
}
