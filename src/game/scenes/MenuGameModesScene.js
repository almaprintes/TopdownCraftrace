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
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return 'timeattack';}})();

    let play=null;
    walk(this._ui,o=>{if(o?.texture?.key==='btn_play')play=o;});
    if(!play)return;

    // Replace the legacy direct-start action: PLAY now launches the selected mode.
    try{play.removeAllListeners();}catch{}

    const modes=this.add.container(0,0).setDepth(75);
    this._ui.add(modes);
    const y=Math.max(96,play.y-64);
    const gap=10;
    const w=Math.min(190,Math.max(145,Math.floor(width*.19)));
    const h=48;
    const x0=Math.floor(width/2-w-gap/2);
    const x1=Math.floor(width/2+gap/2);

    const makeMode=(x,key,title,sub,icon)=>{
      const active=selected===key;
      const bg=this.add.rectangle(x,y,w,h,active?0x123b34:0x08121c,active?.96:.76)
        .setOrigin(0).setStrokeStyle(2,active?0x2bff88:0x6d88a4,active?.92:.35).setInteractive({useHandCursor:true});
      const t=this.add.text(x+12,y+8,`${icon}  ${title}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:active?'#7dffc1':'#ffffff'});
      const s=this.add.text(x+12,y+27,sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#aeb9d8'});
      bg.on('pointerup',()=>{try{localStorage.setItem(MODE_KEY,key);}catch{}this.renderUI();});
      modes.add([bg,t,s]);
    };

    makeMode(x0,'timeattack','CONTRARRELOJ','Persigue tu mejor vuelta','🏁');
    makeMode(x1,'ghost','FANTASMA','Compite contra tu récord','👻');

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
      }catch{}
      this.scene.start('race',{carId:this.selectedCarId,trackKey,gameMode:selected});
    });
  }
}
