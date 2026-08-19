import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderTreeFixScene.js';

const EDITABLES={
  guardrail:{label:'GUARDARRAÍL',type:'guardrail',asset:'guardrail_straight_01',path:'environment/barriers/guardrail_straight_01.webp',spacing:105},
  plastic:{label:'BARRERA PLÁSTICA',type:'plastic',asset:'plastic_barrier_redwhite_01',path:'environment/barriers/plastic_barrier_redwhite_01.webp',spacing:92},
  concrete:{label:'HORMIGÓN',type:'concrete',asset:'concrete_barrier_straight_01',path:'environment/barriers/concrete_barrier_straight_01.webp',spacing:108},
  fence:{label:'VALLA',type:'fence',asset:'fence_chainlink_straight_01',path:'environment/props/fence_chainlink_straight_01.webp',spacing:112},
  tires:{label:'NEUMÁTICOS',type:'tires',asset:'tire_barrier_straight_short_01',path:'environment/barriers/tire_barrier_straight_short_01.webp',spacing:82}
};
const REMOVE_FROM_LIBRARY=new Set([
  'guardrail_straight_01','guardrail_curve_01','plastic_barrier_redwhite_01','concrete_barrier_straight_01',
  'fence_chainlink_straight_01','fence_chainlink_curve_l_01','tire_barrier_straight_short_01','tire_barrier_curve_l_01'
]);

export class EnvironmentBuilderScene extends Current{
  create(){this._linearDef=EDITABLES.guardrail;this._linearStart=null;super.create();}

  _allAssets(){return (super._allAssets?.()||[]).filter(a=>!REMOVE_FROM_LIBRARY.has(a.id));}

  _setupUi(){
    super._setupUi();
    const {width}=this.scale,rx=width-this._right,y=this._top+118;
    // Covers the former standalone GUARDARRAÍL control and owns its hit area.
    const b=this.add.rectangle(rx+14,y,this._right-28,34,0x182637,1).setOrigin(0)
      .setStrokeStyle(2,0x45dfff,.9).setInteractive({useHandCursor:true}).setDepth(62000);
    this._editablesLabel=this.add.text(rx+this._right/2,y+17,'✎ EDITABLES',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(62001);
    this._editCam?.ignore([b,this._editablesLabel]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._openEditablesMenu();});
  }

  _openEditablesMenu(){
    this._closeEditablesMenu();
    const {width,height}=this.scale,pw=Math.min(560,width-90),ph=350,px=(width-pw)/2,py=(height-ph)/2;
    const root=this.add.container(0,0).setDepth(93000);
    const block=this.add.rectangle(0,0,width,height,0x000000,.7).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(px,py,pw,ph,0x0b1422,1).setOrigin(0).setStrokeStyle(2,0x45dfff,.95);
    const title=this.add.text(px+22,py+18,'EDITABLES',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'});
    const hint=this.add.text(px+22,py+48,'Elige un tipo y arrastra sobre el circuito para crear un tramo',{fontFamily:'system-ui',fontSize:'10px',color:'#9fb0c5'});
    const close=this.add.text(px+pw-30,py+9,'×',{fontFamily:'system-ui',fontSize:'28px',fontStyle:'bold',color:'#fff'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    root.add([block,panel,title,hint,close]);

    const items=[
      ['ASFALTO',()=>this._chooseAsphalt(),0xe1b33b],
      [EDITABLES.guardrail.label,()=>this._chooseLinear(EDITABLES.guardrail),0xb8c2cc],
      [EDITABLES.plastic.label,()=>this._chooseLinear(EDITABLES.plastic),0xff6464],
      [EDITABLES.concrete.label,()=>this._chooseLinear(EDITABLES.concrete),0xaab0b7],
      [EDITABLES.fence.label,()=>this._chooseLinear(EDITABLES.fence),0x7fc7d8],
      [EDITABLES.tires.label,()=>this._chooseLinear(EDITABLES.tires),0x707780]
    ];
    items.forEach(([label,cb,color],i)=>{
      const col=i%2,row=Math.floor(i/2),x=px+22+col*(pw/2-12),y=py+82+row*76,w=pw/2-34;
      const bg=this.add.rectangle(x,y,w,58,0x151f31,1).setOrigin(0).setStrokeStyle(1,color,.9).setInteractive({useHandCursor:true});
      const tx=this.add.text(x+w/2,y+29,label,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();cb();});root.add([bg,tx]);
    });
    close.on('pointerup',p=>{p?.event?.stopPropagation?.();this._closeEditablesMenu();});block.on('pointerup',()=>this._closeEditablesMenu());
    this._editablesRoot=root;this._editCam?.ignore(root);
    const cam=this.cameras.add(0,0,width,height,false,'environment-builder-editables');cam.setScroll(0,0).setZoom(1);
    const keep=new Set([root,...(root.list||[])]),ignored=(this.children?.list||[]).filter(o=>!keep.has(o));if(ignored.length)cam.ignore(ignored);this._editablesCam=cam;
  }

  _closeEditablesMenu(){if(this._editablesCam){try{this.cameras.remove(this._editablesCam);}catch{}this._editablesCam=null;}if(this._editablesRoot){try{this._editablesRoot.destroy(true);}catch{}this._editablesRoot=null;}}

  _chooseAsphalt(){
    this._closeEditablesMenu();this._surfaceVisual='asphalt';this._mode='surface';
    this._surfacePaletteRoot?.setVisible?.(true);this._refreshSurfacePalette?.();this._status?.();
    this._editablesLabel?.setText('✎ ASFALTO');this._flash?.('ARRASTRA PARA CREAR ASFALTO');
  }

  _chooseLinear(def){
    this._closeEditablesMenu();this._linearDef=def;this._mode='linear-barrier';this._selRail=null;this._selected=this._selectedSurface=null;
    this._selectionG?.clear?.();this._editablesLabel?.setText(`✎ ${def.label}`);this._flash?.(`ARRASTRA PARA CREAR ${def.label}`);
  }

  _setupInput(){
    super._setupInput();const W=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',p=>{if(this._mode!=='linear-barrier'||!this._inside?.(p))return;this._linearStart=W(p);this._freePan=null;this._panStart=null;});
    const up=p=>{
      if(this._mode!=='linear-barrier'||!this._linearStart)return;
      if(this._inside?.(p)){
        const e=W(p),a=this._linearStart,dx=e.x-a.x,dy=e.y-a.y;
        if(dx*dx+dy*dy>1600){const s={...this._linearDef,x1:a.x,y1:a.y,x2:e.x,y2:e.y};this._rails.push(s);this._drawRails?.();this._selectRail?.(s);}
      }
      this._linearStart=null;
    };
    this.input.on('pointerup',up);this.input.on('pointerupoutside',()=>{this._linearStart=null;});
  }

  _selectRail(s){super._selectRail?.(s);const def=Object.values(EDITABLES).find(d=>d.type===s?.type||d.asset===s?.asset);if(def)this._editablesLabel?.setText(`✎ ${def.label}`);}

  _applyProject(p){super._applyProject(p);for(const s of this._rails||[]){if(!s.type){const d=Object.values(EDITABLES).find(x=>x.asset===s.asset);if(d)s.type=d.type;}}this._drawRails?.();}
}
