import Phaser from 'phaser';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
import { getLanguage } from '../i18n/index.js';
import { INDUCTION_SEASON, seasonText } from '../seasons/seasonCatalog.js';

const FONT='system-ui,-apple-system,Segoe UI,Arial';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class SeasonScene extends Phaser.Scene {
  constructor(){super('season');}

  create(){
    this.cameras.main.setBackgroundColor('#061019');
    this._render();
    this.scale.on('resize',()=>this.scene.restart());
  }

  _render(){
    const {width:w,height:h}=this.scale;
    const lang=getLanguage()==='en'?'en':'es';
    const L=seasonText(lang);
    const data=getCurrentRaceEvent();
    const stages=INDUCTION_SEASON.stages;
    const index=data.finished?stages.length:Math.max(0,Number(data.index)||0);
    const current=Math.min(stages.length-1,index);
    const stage=stages[current];
    const event=data.event;
    const progress=data.progress;

    const bg=this.add.graphics();
    bg.fillStyle(0x061019,1);bg.fillRect(0,0,w,h);
    bg.fillStyle(0x0a1b28,.9);bg.fillRect(0,0,w,72);
    bg.fillStyle(0xd8a73a,.9);bg.fillRect(0,0,w,3);
    bg.fillStyle(0x35cfff,.5);bg.fillRect(0,71,w,1);

    const back=this.add.rectangle(28,18,92,38,0x0e1d2a,.98).setOrigin(0).setStrokeStyle(1,0x597083,.72).setInteractive({useHandCursor:true});
    this.add.text(74,37,lang==='en'?'← BACK':'← VOLVER',{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    back.on('pointerdown',()=>this.scene.start('menu'));

    this.add.text(140,18,`${L.season} 0 · ${L.induction}`,{fontFamily:FONT,fontSize:'24px',fontStyle:'bold',color:'#fff'});
    this.add.text(142,49,L.subtitle,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#8fa4b5',letterSpacing:.4});

    const pct=data.finished?1:clamp((index+(Number(progress?.value)||0)/Math.max(1,Number(progress?.target)||1))/stages.length,0,1);
    const progX=w-330,progY=24,progW=270;
    this.add.text(progX,14,`${Math.min(index+1,stages.length)}/${stages.length}`,{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#f0c65a'});
    this.add.rectangle(progX,38,progW,10,0x142532,1).setOrigin(0).setStrokeStyle(1,0xffffff,.1);
    this.add.rectangle(progX+2,40,(progW-4)*pct,6,data.finished?0x39ff9a:0x35cfff,1).setOrigin(0);

    const leftX=28,leftW=clamp(Math.floor(w*.29),310,390),top=92,bottom=h-24;
    const panelH=bottom-top;
    this.add.rectangle(leftX,top,leftW,panelH,0x0a1722,.98).setOrigin(0).setStrokeStyle(2,data.finished?0x39ff9a:0x35cfff,.72);

    this.add.text(leftX+20,top+18,data.finished?L.complete:`${L.stage} ${current+1}`,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:data.finished?'#62ffb2':'#6deaff',letterSpacing:1});
    this.add.text(leftX+20,top+48,data.finished?(lang==='en'?'INDUCTION COMPLETE':'INDUCCIÓN COMPLETADA'):(stage?.[lang]||event?.title||''),{fontFamily:FONT,fontSize:'22px',fontStyle:'bold',color:'#fff',wordWrap:{width:leftW-40}});
    this.add.text(leftX+20,top+91,data.finished?(lang==='en'?'You are ready for the monthly seasons.':'Ya estás listo para las temporadas mensuales.'):(event?.description||''),{fontFamily:FONT,fontSize:'10px',color:'#b9c7d2',wordWrap:{width:leftW-40},lineSpacing:4});

    if(!data.finished){
      const pY=top+145;
      this.add.text(leftX+20,pY,lang==='en'?'MISSION PROGRESS':'PROGRESO DE MISIÓN',{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#7f94a6',letterSpacing:.7});
      this.add.rectangle(leftX+20,pY+24,leftW-40,12,0x13232f,1).setOrigin(0);
      const ratio=clamp((Number(progress?.value)||0)/Math.max(1,Number(progress?.target)||1),0,1);
      this.add.rectangle(leftX+22,pY+26,(leftW-44)*ratio,8,progress?.complete?0x39ff9a:0x35cfff,1).setOrigin(0);
      this.add.text(leftX+20,pY+44,`${progress?.value||0}/${progress?.target||0} ${progress?.label||''}`,{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:progress?.complete?'#62ffb2':'#6deaff'});

      const rY=top+232;
      this.add.text(leftX+20,rY,lang==='en'?'FREE REWARD':'RECOMPENSA GRATIS',{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#62ffb2',letterSpacing:.8});
      this.add.rectangle(leftX+20,rY+22,leftW-40,46,0x10231d,.98).setOrigin(0).setStrokeStyle(1,0x39ff9a,.42);
      this.add.text(leftX+32,rY+37,raceEventRewardLabel(event?.reward),{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#e8fff4',wordWrap:{width:leftW-64}}).setOrigin(0,.5);

      const premY=rY+82;
      this.add.text(leftX+20,premY,`${L.premium} · ${L.comingSoon}`,{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#f0c65a',letterSpacing:.7});
      this.add.rectangle(leftX+20,premY+22,leftW-40,46,0x211b10,.98).setOrigin(0).setStrokeStyle(1,0xd8a73a,.44);
      this.add.text(leftX+32,premY+45,'🔒  '+(lang==='en'?'EXCLUSIVE REWARD':'RECOMPENSA EXCLUSIVA'),{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#b3914c'}).setOrigin(0,.5);

      if(progress?.complete){
        const by=bottom-50;
        const btn=this.add.rectangle(leftX+20,by,leftW-40,36,0x174b37,.98).setOrigin(0).setStrokeStyle(1,0x62ffb2,.8).setInteractive({useHandCursor:true});
        this.add.text(leftX+leftW/2,by+18,lang==='en'?'CLAIM REWARD':'RECLAMAR PREMIO',{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
        btn.on('pointerdown',()=>{const r=claimCurrentRaceEvent();if(r?.ok)this.scene.restart();});
      }
    }

    const gridX=leftX+leftW+28,gridW=w-gridX-28,gridTop=100;
    this.add.text(gridX,gridTop-4,lang==='en'?'INDUCTION PATH':'RUTA DE INDUCCIÓN',{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#a8bac8',letterSpacing:1});
    this.add.text(gridX+gridW,gridTop-4,lang==='en'?'14 STAGES · ONE TIME':'14 ETAPAS · UNA SOLA VEZ',{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#667b8c'}).setOrigin(1,0);

    const cols=7,gap=10,cardW=(gridW-gap*(cols-1))/cols,cardH=Math.min(118,(h-146-gap)/2);
    const startY=gridTop+28;
    stages.forEach((s,i)=>{
      const row=Math.floor(i/cols),col=i%cols,x=gridX+col*(cardW+gap),y=startY+row*(cardH+gap);
      const done=data.finished||i<index,active=!data.finished&&i===index,locked=!done&&!active;
      const accent=done?0x39ff9a:(active?0x35cfff:0x314653);
      const fill=done?0x0d241b:(active?0x0c2632:0x0b1721);
      this.add.rectangle(x,y,cardW,cardH,fill,.98).setOrigin(0).setStrokeStyle(active?2:1,accent,active?.95:.62);
      this.add.text(x+10,y+9,String(i+1).padStart(2,'0'),{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:done?'#62ffb2':active?'#6deaff':'#617584'});
      this.add.text(x+cardW-10,y+8,done?'✓':active?'◆':'•',{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:done?'#62ffb2':active?'#6deaff':'#526574'}).setOrigin(1,0);
      this.add.text(x+10,y+34,s[lang]||s.es,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:locked?'#7a8995':'#fff',wordWrap:{width:cardW-20},lineSpacing:2});
      this.add.rectangle(x+10,y+cardH-27,cardW-20,18,0x071119,.9).setOrigin(0);
      this.add.text(x+cardW/2,y+cardH-18,done?(lang==='en'?'DONE':'HECHA'):(active?L.current:L.locked),{fontFamily:FONT,fontSize:'6px',fontStyle:'bold',color:done?'#62ffb2':active?'#6deaff':'#657583',letterSpacing:.5}).setOrigin(.5);
    });
  }
}
