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

function isAtlantico(scene){
  let stored='';
  try{stored=localStorage.getItem('tdr2:trackKey')||'';}catch{}
  return String(scene?.trackKey||scene?.track?.meta?.id||stored||'').trim().toLowerCase()==='track01';
}

function applyAtlanticoMaterialScale(scene){
  if(!isAtlantico(scene))return;
  const apply=obj=>{
    if(!obj)return;
    const key=String(obj?.texture?.key||'');
    let scale=null;
    if(key==='grass')scale=0.55;
    else if(key==='off')scale=0.48;
    else if(key==='asphalt'||key==='tdr_atlantico_asphalt_lit')scale=0.25;
    if(scale==null)return;
    try{obj.tileScaleX=scale;obj.tileScaleY=scale;}catch{}
  };
  apply(scene.bgGrass);
  apply(scene.bgOff);
  apply(scene._atlanticoPbrSurface);
  const cells=scene.track?.gfxByCell;
  if(cells?.values){for(const cell of cells.values())apply(cell?.tile);}
}

export class RaceScene extends CurrentRaceScene {
  // A/B de rendimiento en Atlántico: anulamos solo la capa PBR/Light2D del asfalto.
  // El diffuse y las escalas de los materiales permanecen iguales para comparar FPS y tirones.
  _activateAtlanticoPbrPilot(trackId){
    if(String(trackId||'').trim().toLowerCase()==='track01'){
      this._atlanticoPbrActive=false;
      return;
    }
    return super._activateAtlanticoPbrPilot?.(trackId);
  }

  preload(){
    super.preload?.();

    // Dispositivos normales: el semáforo F1 se carga únicamente al entrar en carrera.
    // Modo seguro: evitamos decodificar las siete imágenes y usamos texto Phaser.
    if(window.__tdrIosSafeMode!==true){
      for(const [key,url] of START_ASSETS){
        if(!this.textures.exists(key)) this.load.image(key,url);
      }
    }
  }

  create(){
    super.create();
    applyAtlanticoMaterialScale(this);

    if(window.__tdrIosSafeMode!==true) return;

    // El RaceScene base conserva exactamente la misma lógica de bloqueo y lights-out.
    // Ocultamos únicamente el asset gráfico ausente y presentamos una cuenta atrás ligera.
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

    // La secuencia base enciende seis pasos de 600 ms. Agrupamos 2 pasos por número:
    // 3 (0-1.2s), 2 (1.2-2.4s), 1 (2.4s hasta lights-out aleatorio).
    this.time.delayedCall(1350,()=>{if(countdown?.scene)countdown.setText('2');});
    this.time.delayedCall(2550,()=>{if(countdown?.scene)countdown.setText('1');});

    // No calculamos nuestro propio GO: observamos el estado real del RaceScene base.
    // Así cronómetro, IA y desbloqueo del coche ocurren exactamente en el mismo instante.
    const syncGo=()=>{
      if(!countdown?.scene)return;
      if(this._startState==='GO'){
        countdown.setText('¡YA!').setColor('#2bff88');
        countdown.setScale(1.12);
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

    // La cámara del mundo no debe duplicar la cuenta atrás.
    try{this.cameras.main.ignore(countdown);}catch{}
  }

  update(time,delta){
    super.update?.(time,delta);
    applyAtlanticoMaterialScale(this);
  }
}
