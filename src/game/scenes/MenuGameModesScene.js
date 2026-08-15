import { MenuScene as CurrentMenuScene } from './MenuUiStabilityScene.js';

const MODE_KEY='tdr2:gameMode';

function walk(node,fn){
  if(!node)return;
  fn(node);
  const list=node?.list;
  if(Array.isArray(list))for(const child of list)walk(child,fn);
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    const {width}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return 'timeattack';}})();

    let play=null;
    walk(this._ui,o=>{if(o?.texture?.key==='btn_play')play=o;});
    if(!play)return;

    try{play.removeAllListeners();}catch{}

    const modes=this.add.container(0,0).setDepth(75);
    this._ui.add(modes);

    // Three compact cards in one clean row, clearly above ARRANCAR MOTOR.
    const gap=8;
    const w=Math.min(150,Math.max(128,Math.floor(width*.145)));
    const h=42;
    const y=Math.max(88,play.y-96);
    const total=w*3+gap*2;
    const start=Math.floor(width/2-total/2);

    const makeMode=(x,key,title,sub,icon)=>{
      const active=selected===key;
      const bg=this.add.rectangle(x,y,w,h,active?0x123b34:0x08121c,active?.96:.80)
        .setOrigin(0).setStrokeStyle(2,active?0x2bff88:0x6d88a4,active?.92:.34).setInteractive({useHandCursor:true});
      const t=this.add.text(x+10,y+6,`${icon} ${title}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:active?'#7dffc1':'#ffffff'});
      const s=this.add.text(x+10,y+23,sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',color:'#aeb9d8'});
      bg.on('pointerup',()=>{try{localStorage.setItem(MODE_KEY,key);}catch{}this.renderUI();});
      modes.add([bg,t,s]);
    };

    makeMode(start,'timeattack','CONTRARRELOJ','Tu mejor vuelta','🏁');
    makeMode(start+w+gap,'ghost','FANTASMA','Contra tu récord','👻');
    makeMode(start+(w+gap)*2,'survival','SUPERVIVENCIA','Último fuera','⚡');

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
      let trackKey=this.selectedTrackKey||'track01';
      try{
        const live=localStorage.getItem('tdr2:trackKey');
        if(live?.trim())trackKey=live.trim();
        localStorage.setItem('tdr2:carId',this.selectedCarId);
        localStorage.setItem('tdr2:trackKey',trackKey);
        localStorage.setItem(MODE_KEY,selected);
      }catch{}
      this.scene.start('race',{carId:this.selectedCarId,trackKey,gameMode:selected});
    });
  }
}
