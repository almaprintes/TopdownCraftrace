import { MenuScene as CurrentMenuScene } from './MenuUiStabilityScene.js';
import { recordModeStart } from '../seasons/seasonTelemetry.js';

const MODE_KEY='tdr2:gameMode';
const PRACTICE_TRACK_KEY='practice-area';

function walk(node,fn){
  if(!node)return;
  fn(node);
  const list=node?.list;
  if(Array.isArray(list))for(const child of list)walk(child,fn);
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    let play=null;
    walk(this._ui,o=>{if(o?.texture?.key==='btn_play')play=o;});
    if(!play)return;

    try{play.removeAllListeners();}catch{}
    let armed=false;
    const baseScale=play.scaleX;
    play.setInteractive({useHandCursor:true});
    play.on('pointerdown',()=>{armed=true;play.setScale(baseScale*.97);});
    play.on('pointerout',()=>{armed=false;play.setScale(baseScale);});
    play.on('pointerupoutside',()=>{armed=false;play.setScale(baseScale);});
    play.on('pointerup',()=>{
      play.setScale(baseScale);
      if(!armed)return;
      armed=false;
      this._openGameModeModal();
    });
  }

  _startSelectedMode(mode){
    let trackKey=this.selectedTrackKey||'track01';
    try{
      const live=localStorage.getItem('tdr2:trackKey');
      if(live?.trim())trackKey=live.trim();
      localStorage.setItem('tdr2:carId',this.selectedCarId);
      localStorage.setItem(MODE_KEY,mode);
      // Área de Pruebas es un modo, no un circuito seleccionado.
      if(mode!=='practice')localStorage.setItem('tdr2:trackKey',trackKey);
    }catch{}
    recordModeStart(mode);
    const launchTrack=mode==='practice'?PRACTICE_TRACK_KEY:trackKey;
    this._closeGameModeModal();
    this.scene.start('race',{carId:this.selectedCarId,trackKey:launchTrack,gameMode:mode});
  }

  _closeGameModeModal(){
    if(this._gameModeModal){
      try{this._gameModeModal.destroy(true);}catch{}
      this._gameModeModal=null;
    }
    try{this._gameModeMarqueeTween?.stop?.();}catch{}
    this._gameModeMarqueeTween=null;
  }

  _openGameModeModal(){
    if(this._gameModeModal?.scene)return;
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}})();

    const root=this.add.container(0,0).setDepth(9000);
    this._ui?.add(root);
    this._gameModeModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.74).setOrigin(0).setInteractive();
    root.add(veil);

    const panelW=Math.min(width-32,1040,Math.max(790,Math.floor(width*.82)));
    const panelH=Math.min(height-24,390,Math.max(310,Math.floor(height*.58)));
    const cx=width/2,cy=height/2;

    const panel=this.add.graphics();
    const x=cx-panelW/2,y=cy-panelH/2,c=16;
    panel.fillStyle(0x07131b,.98);
    panel.lineStyle(2,0x45dfff,.72);
    panel.beginPath();
    panel.moveTo(x+c,y);panel.lineTo(x+panelW-c,y);panel.lineTo(x+panelW,y+c);
    panel.lineTo(x+panelW,y+panelH-c);panel.lineTo(x+panelW-c,y+panelH);
    panel.lineTo(x+c,y+panelH);panel.lineTo(x,y+panelH-c);panel.lineTo(x,y+c);
    panel.closePath();panel.fillPath();panel.strokePath();
    panel.lineStyle(1,0xffffff,.07);panel.strokeRect(x+7,y+7,panelW-14,panelH-14);
    root.add(panel);

    const marqueeY=y+18;
    const marqueeBg=this.add.rectangle(cx,marqueeY,panelW-38,32,0x0b2230,.92).setOrigin(.5,0).setStrokeStyle(1,0x45dfff,.35);
    root.add(marqueeBg);
    const marquee=this.add.text(cx,marqueeY+8,'◆  ELIGE MODO DE JUEGO   •   LISTO PARA CORRER   •   CONDUCCIÓN LIBRE  ◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#77ecff',letterSpacing:1}).setOrigin(.5,0);
    root.add(marquee);
    this._gameModeMarqueeTween=this.tweens.add({targets:marquee,x:{from:cx-38,to:cx+38},duration:2200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});

    root.add(this.add.text(cx,y+66,'¿CÓMO QUIERES CONDUCIR?',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'25px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,y+99,'Carrera, fantasma, supervivencia o conducción libre',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#a9bac9'}).setOrigin(.5,0));

    const modes=[
      {key:'timeattack',icon:'🏁',title:'CONTRARRELOJ',sub:'Persigue tu mejor vuelta',detail:'Pista libre · cronómetro puro',accent:0x55bfff},
      {key:'ghost',icon:'👻',title:'FANTASMA',sub:'Compite contra tu récord',detail:'Tu mejor vuelta como rival',accent:0x8f7dff},
      {key:'survival',icon:'⚡',title:'SUPERVIVENCIA',sub:'6 coches · último fuera',detail:'Una eliminación por vuelta',accent:0x42ff9d},
      {key:'practice',icon:'🧪',title:'ÁREA DE PRUEBAS',sub:'Conducción libre',detail:'Velocidad · drift · superficies',accent:0xffc857}
    ];
    const gap=14,cols=modes.length;
    const cardW=Math.floor((panelW-64-gap*(cols-1))/cols);
    const cardY=y+132;
    const cardH=Math.max(150,Math.min(176,panelH-154));
    const startX=cx-(cardW*cols+gap*(cols-1))/2;

    modes.forEach((m,i)=>{
      const bx=startX+i*(cardW+gap),active=selected===m.key;
      const bg=this.add.rectangle(bx,cardY,cardW,cardH,active?0x102c2b:0x0a1620,.98).setOrigin(0)
        .setStrokeStyle(2,active?m.accent:0x52677b,active?.95:.42).setInteractive({useHandCursor:true});
      root.add(bg);
      root.add(this.add.text(bx+cardW/2,cardY+15,m.icon,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'25px'}).setOrigin(.5,0));
      root.add(this.add.text(bx+cardW/2,cardY+54,m.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:m.key==='practice'?'13px':'14px',fontStyle:'bold',color:'#ffffff',align:'center',wordWrap:{width:cardW-12}}).setOrigin(.5,0));
      root.add(this.add.text(bx+cardW/2,cardY+84,m.sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9.5px',fontStyle:'bold',color:active?'#baffdf':'#c4cfda',align:'center',wordWrap:{width:cardW-16}}).setOrigin(.5,0));
      root.add(this.add.text(bx+cardW/2,cardY+113,m.detail,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8.5px',color:'#8295a8',align:'center',wordWrap:{width:cardW-16}}).setOrigin(.5,0));
      if(active)root.add(this.add.text(bx+cardW/2,cardY+cardH-22,'ÚLTIMO USADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#72ffc1',letterSpacing:1}).setOrigin(.5,0));
      bg.on('pointerover',()=>{bg.setFillStyle(0x153244,.98);bg.setStrokeStyle(2,m.accent,.95);});
      bg.on('pointerout',()=>{bg.setFillStyle(active?0x102c2b:0x0a1620,.98);bg.setStrokeStyle(2,active?m.accent:0x52677b,active?.95:.42);});
      bg.on('pointerup',()=>this._startSelectedMode(m.key));
    });

    const close=this.add.text(x+panelW-24,y+8,'×',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'27px',fontStyle:'bold',color:'#9aafc1'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    close.on('pointerup',()=>this._closeGameModeModal());
    root.add(close);
    veil.on('pointerup',()=>this._closeGameModeModal());
  }
}
