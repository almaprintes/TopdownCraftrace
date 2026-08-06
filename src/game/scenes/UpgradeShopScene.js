import Phaser from 'phaser';
import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage, qty, craft, evolve, equip, duplicateLastReward } from '../garage/garageStore.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSP.',transmission:'CAJA'};

export class UpgradeShopScene extends Phaser.Scene {
  constructor(){ super('upgrade-shop'); this.state=null; this.selA=null; this.selB=null; this.ui=null; }

  create(){
    this.cameras.main.setBackgroundColor('#071018');
    this.state=loadGarage();
    this.scale.on('resize',()=>this.render());
    this.render();
  }

  render(){
    const {width,height}=this.scale;
    if(this.ui) this.ui.destroy(true);
    this.ui=this.add.container(0,0);
    const bg=this.add.graphics();
    bg.fillGradientStyle(0x071018,0x071018,0x14222e,0x0a1118,1);
    bg.fillRect(0,0,width,height);
    this.ui.add(bg);

    const topH=78;
    const pad=clamp(width*.04,14,22);
    const title=this.add.text(pad,18,'GARAGE FUSION',{fontFamily:'Orbitron,system-ui',fontSize:'22px',fontStyle:'900',color:'#ffffff'});
    const sub=this.add.text(pad,47,'FABRICA · EVOLUCIONA · EQUIPA',{fontFamily:'system-ui',fontSize:'10px',color:'#67e8f9',letterSpacing:1.5});
    const back=this.add.text(width-pad,18,'←',{fontFamily:'system-ui',fontSize:'28px',color:'#fff'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    back.on('pointerdown',()=>this.scene.start('menu'));
    this.ui.add([title,sub,back]);

    // Coche / slots equipados
    const equipY=topH+8;
    const cardW=(width-pad*2-16)/5;
    ['engine','brakes','tires','suspension','transmission'].forEach((f,i)=>{
      const x=pad+i*(cardW+4);
      const r=this.add.rectangle(x,equipY,cardW,58,0x111c26,.96).setOrigin(0).setStrokeStyle(1,0x31576c,.7);
      const id=this.state.equipped?.[f];
      const item=id?GARAGE_ITEMS[id]:null;
      const lab=this.add.text(x+cardW/2,equipY+8,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:'8px',fontStyle:'700',color:'#7897aa'}).setOrigin(.5,0);
      const val=this.add.text(x+cardW/2,equipY+25,item?`${item.icon} T${item.tier}`:'—',{fontFamily:'system-ui',fontSize:'17px',fontStyle:'800',color:item?'#fff':'#465b69'}).setOrigin(.5,0);
      this.ui.add([r,lab,val]);
    });

    // Banco de fusión
    const benchY=equipY+70;
    const benchH=144;
    const bench=this.add.rectangle(pad,benchY,width-pad*2,benchH,0x0e1720,.97).setOrigin(0).setStrokeStyle(2,0x1e90a8,.7);
    this.ui.add(bench);
    const benchTitle=this.add.text(pad+12,benchY+10,'BANCO DE TRABAJO',{fontFamily:'Orbitron,system-ui',fontSize:'11px',fontStyle:'900',color:'#e9faff'});
    this.ui.add(benchTitle);

    const slotW=Math.min(108,(width-pad*2-80)/2);
    const slotY=benchY+38;
    const slotA=this._slot(pad+14,slotY,slotW,72,this.selA,'A');
    const slotB=this._slot(width-pad-14-slotW,slotY,slotW,72,this.selB,'B');
    this.ui.add([...slotA,...slotB]);
    const plus=this.add.text(width/2,slotY+24,'+',{fontFamily:'Orbitron,system-ui',fontSize:'24px',color:'#5dd7ee'}).setOrigin(.5,0);
    this.ui.add(plus);

    const canCraft=this.selA&&this.selB;
    const btn=this.add.rectangle(width/2,benchY+120,Math.min(220,width*.58),34,canCraft?0x1aa67a:0x20313a,1).setInteractive({useHandCursor:true});
    const bt=this.add.text(width/2,benchY+120,'FUSIONAR',{fontFamily:'Orbitron,system-ui',fontSize:'12px',fontStyle:'900',color:'#fff'}).setOrigin(.5);
    btn.on('pointerdown',()=>this._doCraft());
    this.ui.add([btn,bt]);

    // Rewarded ad last reward
    const rewardY=benchY+benchH+10;
    if(this.state.lastReward && !this.state.lastReward.doubled){
      const rr=this.add.rectangle(pad,rewardY,width-pad*2,42,0x162632,.96).setOrigin(0).setStrokeStyle(1,0x4ee1a0,.65).setInteractive({useHandCursor:true});
      const rt=this.add.text(pad+12,rewardY+8,'▶  DUPLICAR ÚLTIMA RECOMPENSA',{fontFamily:'system-ui',fontSize:'11px',fontStyle:'800',color:'#b9ffe6'});
      const rs=this.add.text(width-pad-10,rewardY+9,'VIDEO',{fontFamily:'Orbitron,system-ui',fontSize:'10px',color:'#67e8f9'}).setOrigin(1,0);
      rr.on('pointerdown',()=>this._doubleReward());
      this.ui.add([rr,rt,rs]);
    }

    // Inventario scroll simple en cuadrícula
    const invTop=rewardY+(this.state.lastReward&&!this.state.lastReward.doubled?54:6);
    const invTitle=this.add.text(pad,invTop,'INVENTARIO',{fontFamily:'Orbitron,system-ui',fontSize:'12px',fontStyle:'900',color:'#fff'});
    this.ui.add(invTitle);

    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0);
    const cols=4;
    const gap=6;
    const iw=(width-pad*2-gap*(cols-1))/cols;
    const ih=78;
    const y0=invTop+24;
    ids.forEach((id,idx)=>{
      const item=GARAGE_ITEMS[id]; const q=qty(this.state,id);
      const col=idx%cols,row=Math.floor(idx/cols);
      const x=pad+col*(iw+gap),y=y0+row*(ih+gap);
      if(y+ih>height-8) return;
      const selected=id===this.selA||id===this.selB;
      const r=this.add.rectangle(x,y,iw,ih,selected?0x193747:0x101a23,.98).setOrigin(0).setStrokeStyle(selected?2:1,selected?0x67e8f9:0x263b49,.95).setInteractive({useHandCursor:true});
      const icon=this.add.text(x+iw/2,y+7,item.icon,{fontFamily:'system-ui',fontSize:'22px',color:'#fff'}).setOrigin(.5,0);
      const name=this.add.text(x+iw/2,y+35,item.name,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'700',color:'#e7f2f8',align:'center',wordWrap:{width:iw-8}}).setOrigin(.5,0);
      const count=this.add.text(x+iw-6,y+5,`×${q}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#67e8f9'}).setOrigin(1,0);
      r.on('pointerdown',()=>this._pick(id));
      this.ui.add([r,icon,name,count]);
      if(item.kind==='part'){
        const eq=this.state.equipped?.[item.family]===id;
        const act=this.add.text(x+iw/2,y+62,eq?'EQUIPADO':(EVOLUTION_CHAIN[id]&&q>=EVOLUTION_COST?'EVOLUCIONAR':'EQUIPAR'),{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:eq?'#4ee1a0':(EVOLUTION_CHAIN[id]&&q>=EVOLUTION_COST?'#ffc64d':'#9ccfe4')}).setOrigin(.5,0).setInteractive({useHandCursor:true});
        act.on('pointerdown',(p)=>{ p.event?.stopPropagation?.(); if(EVOLUTION_CHAIN[id]&&q>=EVOLUTION_COST&&!eq) this._doEvolve(id); else this._doEquip(id); });
        this.ui.add(act);
      }
    });
  }

  _slot(x,y,w,h,id,label){
    const r=this.add.rectangle(x,y,w,h,0x0a1118,1).setOrigin(0).setStrokeStyle(2,id?0x67e8f9:0x29414f,.9);
    const item=id?GARAGE_ITEMS[id]:null;
    const t=this.add.text(x+w/2,y+8,item?item.icon:label,{fontFamily:'system-ui',fontSize:item?'25px':'20px',fontStyle:'900',color:item?'#fff':'#46606f'}).setOrigin(.5,0);
    const n=this.add.text(x+w/2,y+43,item?item.name:'Selecciona',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'700',color:item?'#cfe6f1':'#587080',align:'center',wordWrap:{width:w-8}}).setOrigin(.5,0);
    return [r,t,n];
  }

  _pick(id){
    if(!this.selA || (this.selA&&this.selB)){ this.selA=id; this.selB=null; }
    else this.selB=id;
    this.render();
  }
  _doCraft(){
    if(!this.selA||!this.selB) return this._toast('Selecciona dos elementos');
    const res=craft(this.state,this.selA,this.selB);
    if(!res.ok) return this._toast(res.reason);
    this.selA=this.selB=null; this._toast(`NUEVO: ${res.item.name}`); this.render();
  }
  _doEvolve(id){ const r=evolve(this.state,id); if(r.ok) this._toast(`EVOLUCIÓN: ${r.item.name}`); else this._toast(r.reason); this.render(); }
  _doEquip(id){ if(equip(this.state,id)) this._toast(`${GARAGE_ITEMS[id].name} equipado`); this.render(); }
  async _doubleReward(){
    const ok=await showRewardedAd(this,{title:'DUPLICAR RECOMPENSA'});
    if(ok){ const r=duplicateLastReward(); this.state=loadGarage(); this._toast(r?'Recompensa duplicada':'Ya estaba reclamada'); this.render(); }
  }
  _toast(msg){
    const {width,height}=this.scale; const t=this.add.text(width/2,height-34,msg,{fontFamily:'system-ui',fontSize:'12px',fontStyle:'800',color:'#fff',backgroundColor:'#10232d',padding:{x:12,y:7}}).setOrigin(.5).setDepth(999);
    this.tweens.add({targets:t,alpha:0,y:t.y-12,delay:900,duration:350,onComplete:()=>t.destroy()});
  }
}
