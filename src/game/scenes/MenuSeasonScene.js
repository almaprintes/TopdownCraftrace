import { MenuScene as CurrentMenuScene } from './MenuDuelModeScene.js';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
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
    const accent=finished?0xd8a73a:(complete?0x39ff9a:0x35cfff);
    const c=this.add.container(x,y).setDepth(40);this._ui?.add(c);frame(this,c,w,h,accent);
    const top=-h/2,bottom=h/2;
    const currentIndex=Math.min(INDUCTION_SEASON.stages.length-1,Math.max(0,Number(data.index)||0));
    const stage=INDUCTION_SEASON.stages[currentIndex];

    c.add(this.add.text(0,top+13,`${L.season} 0 · ${L.induction}`,{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1.1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+38,L.subtitle.toUpperCase(),{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#899baa',letterSpacing:.4,align:'center'}).setOrigin(.5,0));

    if(finished){
      c.add(this.add.text(0,top+67,L.complete,{fontFamily:FONT,fontSize:'23px',fontStyle:'bold',color:'#ffffff',align:'center'}).setOrigin(.5,0));
      c.add(this.add.text(0,top+108,`${INDUCTION_SEASON.stages.length}/${INDUCTION_SEASON.stages.length} ${lang==='en'?'STAGES':'ETAPAS'}`,{fontFamily:FONT,fontSize:'12px',fontStyle:'bold',color:'#62ffb2'}).setOrigin(.5,0));
    }else{
      const event=data.event,progress=data.progress;
      c.add(this.add.text(0,top+63,stage?.[lang]||event?.title||'',{fontFamily:FONT,fontSize:'19px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));
      c.add(this.add.text(0,top+94,String(event?.description||'').toUpperCase(),{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#b8c7d3',align:'center',lineSpacing:2,wordWrap:{width:w-30}}).setOrigin(.5,0));
      c.add(this.add.text(0,top+129,`${lang==='en'?'REWARD':'PREMIO'} · ${raceEventRewardLabel(event?.reward)}`,{fontFamily:FONT,fontSize:'7px',fontStyle:'bold',color:'#f0c65a',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));
      const barW=w-34,barY=bottom-55;
      c.add(this.add.rectangle(-barW/2,barY,barW,10,0x10202b,.95).setOrigin(0).setStrokeStyle(1,0xffffff,.14));
      const ratio=Math.max(0,Math.min(1,(Number(progress?.value)||0)/Math.max(1,Number(progress?.target)||1)));
      if(ratio>0)c.add(this.add.rectangle(-barW/2+2,barY+2,(barW-4)*ratio,6,complete?0x39ff9a:0x35cfff,.97).setOrigin(0));
    }

    if(complete){
      const claim=this.add.rectangle(-55,bottom-27,104,31,0x174b37,.98).setStrokeStyle(1,0x62ffb2,.8).setInteractive({useHandCursor:true});
      const claimText=this.add.text(-55,bottom-27,lang==='en'?'CLAIM':'RECLAMAR',{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      const open=this.add.rectangle(57,bottom-27,104,31,0x12304a,.98).setStrokeStyle(1,0x35cfff,.8).setInteractive({useHandCursor:true});
      const openText=this.add.text(57,bottom-27,L.season,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      c.add([claim,claimText,open,openText]);
      claim.on('pointerdown',()=>{const result=claimCurrentRaceEvent();if(result?.ok)this._showEventRewardModal(result.event);});
      open.on('pointerdown',()=>this._openSeasonModal());
    }else{
      const open=this.add.rectangle(0,bottom-27,w-34,31,0x12304a,.98).setStrokeStyle(1,0x35cfff,.78).setInteractive({useHandCursor:true});
      const label=this.add.text(0,bottom-27,L.open,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#fff',letterSpacing:.7}).setOrigin(.5);
      c.add([open,label]);open.on('pointerdown',()=>this._openSeasonModal());
    }
  }

  _openSeasonModal(){
    if(this._seasonModal?.scene)return;
    const {width,height}=this.scale;
    const lang=getLanguage()==='en'?'en':'es',L=seasonText(lang),data=getCurrentRaceEvent();
    const panelW=Math.min(width-22,1040),panelH=Math.min(height-18,440),cx=width/2,cy=height/2;
    const x=cx-panelW/2,y=cy-panelH/2;
    const root=this.add.container(0,0).setDepth(26000);this._ui?.add(root);this._seasonModal=root;
    const veil=this.add.rectangle(0,0,width,height,0x02070d,.88).setOrigin(0).setInteractive();root.add(veil);
    const panel=this.add.graphics();panel.fillStyle(0x07131b,.995);panel.fillRoundedRect(x,y,panelW,panelH,18);panel.lineStyle(2,0xd8a73a,.82);panel.strokeRoundedRect(x,y,panelW,panelH,18);root.add(panel);

    root.add(this.add.text(x+24,y+18,`${L.season} 0 · ${L.induction}`,{fontFamily:FONT,fontSize:'22px',fontStyle:'bold',color:'#ffffff'}));
    root.add(this.add.text(x+24,y+48,L.subtitle,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#9db0bf',letterSpacing:.4}));
    const close=this.add.text(x+panelW-26,y+12,'×',{fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#a8b7c4'}).setOrigin(.5,0).setInteractive({useHandCursor:true});root.add(close);
    const dismiss=()=>{try{root.destroy(true);}catch{}if(this._seasonModal===root)this._seasonModal=null;};close.on('pointerdown',dismiss);

    const stages=INDUCTION_SEASON.stages,total=stages.length;
    const left=x+54,right=x+panelW-34,roadW=right-left,step=roadW/(total-1);
    const freeY=y+144,premiumY=y+268;
    const functionalCount=Math.max(0,Number(data.total)||7);
    const completedCount=data.finished?functionalCount:Math.max(0,Number(data.index)||0);
    const current=Math.min(functionalCount-1,Math.max(0,Number(data.index)||0));

    root.add(this.add.text(x+24,freeY-67,L.freeTrack,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#62ffb2',letterSpacing:1}));
    root.add(this.add.text(x+24,premiumY-67,L.premiumTrack,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1}));
    root.add(this.add.text(x+panelW-24,premiumY-67,L.comingSoon,{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#f0c65a',backgroundColor:'#3a2c12',padding:{x:8,y:4}}).setOrigin(1,0));

    const road=this.add.graphics();road.lineStyle(4,0x254054,.85);road.lineBetween(left,freeY,right,freeY);road.lineStyle(3,0x5b4520,.62);road.lineBetween(left,premiumY,right,premiumY);root.add(road);

    stages.forEach((stage,i)=>{
      const sx=left+i*step;
      const wired=i<functionalCount;
      const done=wired&&(data.finished||i<completedCount);
      const active=wired&&!data.finished&&i===current;
      const future=!wired;
      const freeColor=done?0x39ff9a:(active?0x35cfff:(future?0x394551:0x6a7f90));
      root.add(this.add.circle(sx,freeY,active?13:11,freeColor,1).setStrokeStyle(active?3:1,active?0xffffff:0x0b1520,.9));
      root.add(this.add.text(sx,freeY,String(i+1),{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:done||active?'#061018':'#ffffff'}).setOrigin(.5));
      const name=stage[lang]||stage.es;
      root.add(this.add.text(sx,freeY+19,name,{fontFamily:FONT,fontSize:'6px',fontStyle:'bold',color:future?'#647381':'#c7d2dc',align:'center',wordWrap:{width:Math.max(46,step-4)}}).setOrigin(.5,0));
      root.add(this.add.text(sx,freeY-28,done?'✓':(active?'◆':(future?'🔒':'•')),{fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:done?'#62ffb2':active?'#6deaff':'#71808b'}).setOrigin(.5));

      root.add(this.add.circle(sx,premiumY,11,0x332b1d,.98).setStrokeStyle(1,0xd8a73a,.52));
      root.add(this.add.text(sx,premiumY,'🔒',{fontFamily:FONT,fontSize:'8px',color:'#f0c65a'}).setOrigin(.5));
      root.add(this.add.text(sx,premiumY+19,i===total-1?'★':'◆',{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#8a6c33'}).setOrigin(.5,0));
    });

    const infoY=y+panelH-58;
    root.add(this.add.text(x+24,infoY,L.premiumNote,{fontFamily:FONT,fontSize:'8px',color:'#8294a4',wordWrap:{width:panelW-190}}));
    const badge=this.add.rectangle(x+panelW-88,infoY+10,132,30,0x2e2515,.98).setStrokeStyle(1,0xd8a73a,.65);root.add(badge);
    root.add(this.add.text(x+panelW-88,infoY+10,`${L.premium} · ${L.comingSoon}`,{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5));
  }
}
