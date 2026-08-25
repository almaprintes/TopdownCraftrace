import { MenuScene as CurrentMenuScene } from './MenuDuelModeScene.js';
import { getCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
import { getLanguage } from '../i18n/index.js';
import { INDUCTION_SEASON, seasonText } from '../seasons/seasonCatalog.js';

const FONT='system-ui,-apple-system,Segoe UI,Arial';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function frame(scene,container,w,h,accent){
  const g=scene.add.graphics(),x=-w/2,y=-h/2,c=10;
  g.fillStyle(0x07131b,.96);g.lineStyle(2,accent,.82);
  g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();
  g.lineStyle(1,0xffffff,.05);g.strokeRect(x+5,y+5,w-10,h-10);g.fillStyle(accent,.82);g.fillRect(x+c,y+2,Math.max(58,w*.25),3);container.add(g);
}

export class MenuScene extends CurrentMenuScene {
  _renderGlobalEventCard(){
    const {width,height}=this.scale;if(width<760)return;
    const data=getCurrentRaceEvent();
    const lang=getLanguage()==='en'?'en':'es';
    const L=seasonText(lang);
    const w=clamp(Math.floor(width*.145),236,264),h=clamp(Math.floor(height*.31),210,232),x=Math.floor(width*.11),y=Math.floor(height*.39);
    const finished=!!data.finished,complete=!finished&&!!data.progress?.complete;
    const accent=finished?0x39ff9a:(complete?0x39ff9a:0x35cfff);
    const c=this.add.container(x,y).setDepth(40);this._ui?.add(c);frame(this,c,w,h,accent);
    const top=-h/2,bottom=h/2;
    const currentIndex=Math.min(INDUCTION_SEASON.stages.length-1,Math.max(0,Number(data.index)||0));
    const stage=INDUCTION_SEASON.stages[currentIndex];

    const hit=this.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});c.add(hit);
    hit.on('pointerdown',()=>this.scene.start('season'));

    c.add(this.add.text(-w/2+18,top+15,`${L.season} 0`,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1}).setOrigin(0,0));
    c.add(this.add.text(w/2-18,top+15,finished?'14/14':`${Math.min(currentIndex+1,14)}/14`,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:finished?'#62ffb2':'#6deaff'}).setOrigin(1,0));
    c.add(this.add.text(-w/2+18,top+38,L.induction,{fontFamily:FONT,fontSize:'18px',fontStyle:'bold',color:'#fff'}));
    c.add(this.add.text(-w/2+18,top+64,L.subtitle,{fontFamily:FONT,fontSize:'8px',color:'#8fa3b3',wordWrap:{width:w-36}}));

    if(finished){
      c.add(this.add.text(-w/2+18,top+102,L.complete,{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#62ffb2'}));
      c.add(this.add.text(-w/2+18,top+132,lang==='en'?'Ready for monthly seasons':'Listo para las temporadas mensuales',{fontFamily:FONT,fontSize:'8px',color:'#b9c8d3',wordWrap:{width:w-36}}));
    }else{
      const event=data.event,progress=data.progress;
      c.add(this.add.text(-w/2+18,top+98,stage?.[lang]||event?.title||'',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#fff',wordWrap:{width:w-36}}));
      c.add(this.add.text(-w/2+18,top+127,String(event?.description||''),{fontFamily:FONT,fontSize:'8px',color:'#b8c7d3',wordWrap:{width:w-36},lineSpacing:2}));
      c.add(this.add.text(-w/2+18,top+164,`${lang==='en'?'REWARD':'PREMIO'} · ${raceEventRewardLabel(event?.reward)}`,{fontFamily:FONT,fontSize:'7px',fontStyle:'bold',color:'#f0c65a',wordWrap:{width:w-36}}));
      const barW=w-36,barY=bottom-47;
      c.add(this.add.rectangle(-barW/2,barY,barW,9,0x10202b,.95).setOrigin(0));
      const ratio=Math.max(0,Math.min(1,(Number(progress?.value)||0)/Math.max(1,Number(progress?.target)||1)));
      if(ratio>0)c.add(this.add.rectangle(-barW/2+2,barY+2,(barW-4)*ratio,5,complete?0x39ff9a:0x35cfff,.97).setOrigin(0));
    }

    const btnY=bottom-25;
    c.add(this.add.rectangle(0,btnY,w-36,28,complete?0x174b37:0x12304a,.98).setStrokeStyle(1,complete?0x62ffb2:0x35cfff,.72));
    c.add(this.add.text(0,btnY,complete?(lang==='en'?'REWARD READY · OPEN':'PREMIO LISTO · ABRIR'):(lang==='en'?'VIEW SEASON':'VER TEMPORADA'),{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#fff',letterSpacing:.6}).setOrigin(.5));
  }
}
