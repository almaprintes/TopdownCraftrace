import Phaser from 'phaser';
import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderAssetLibraryScene.js';

const DEF={type:'guardrail',asset:'guardrail_straight_01',path:'environment/barriers/guardrail_straight_01.webp',spacing:105};
const C=s=>({x:Number.isFinite(+s.cpx)?+s.cpx:(s.x1+s.x2)/2,y:Number.isFinite(+s.cpy)?+s.cpy:(s.y1+s.y2)/2});
const P=(s,t)=>{const c=C(s),m=1-t;return{x:m*m*s.x1+2*m*t*c.x+t*t*s.x2,y:m*m*s.y1+2*m*t*c.y+t*t*s.y2}};
const T=(s,t)=>{const c=C(s);return{x:2*(1-t)*(c.x-s.x1)+2*t*(s.x2-c.x),y:2*(1-t)*(c.y-s.y1)+2*t*(s.y2-c.y)}};
const D=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};

export class EnvironmentBuilderScene extends Current{
  create(){this._rails=[];this._selRail=null;this._railStart=null;this._railDrag=null;super.create();this._railRoot=this.add.container(0,0).setDepth(11.8);this.cameras.main.ignore(this._railRoot);this._drawRails();}
  _setupUi(){super._setupUi();const {width}=this.scale,rx=width-this._right,y=this._top+118;
    const b=this.add.rectangle(rx+14,y,this._right-28,32,0x242c35,1).setOrigin(0).setStrokeStyle(1,0xb8c2cc,.95).setInteractive({useHandCursor:true}).setDepth(60506);
    const t=this.add.text(rx+this._right/2,y+16,'〰 GUARDARRAÍL',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(60507);this._editCam?.ignore([b,t]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._mode='guardrail';this._selRail=this._selected=this._selectedSurface=null;this._selectionG.clear();this._flash?.('ARRASTRA PARA CREAR GUARDARRAÍL');});}
  _setupInput(){super._setupInput();const W=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',(p,over=[])=>{if(!this._inside?.(p))return;const w=W(p);if(this._mode==='guardrail'){this._railStart=w;this._freePan=null;return;}if(this._mode!=='select'||(over||[]).some(o=>o?._env))return;const h=this._railHandle(w);if(h){this._railDrag={id:p.id,h};this._freePan=null;return;}const r=this._railAt(w);if(r){this._selectRail(r);this._freePan=null;}});
    this.input.on('pointermove',p=>{if(!this._railDrag||!p.isDown||p.id!==this._railDrag.id||!this._selRail)return;const w=W(p),s=this._selRail;if(this._railDrag.h==='a'){s.x1=w.x;s.y1=w.y}else if(this._railDrag.h==='b'){s.x2=w.x;s.y2=w.y}else{s.cpx=w.x;s.cpy=w.y}this._drawRails();this._drawSelection();this._freePan=null;});
    const up=p=>{if(this._mode==='guardrail'&&this._railStart&&this._inside?.(p)){const e=W(p),dx=e.x-this._railStart.x,dy=e.y-this._railStart.y;if(dx*dx+dy*dy>1600){const s={...DEF,x1:this._railStart.x,y1:this._railStart.y,x2:e.x,y2:e.y};this._rails.push(s);this._drawRails();this._selectRail(s)}}this._railStart=null;if(!p||!this._railDrag||p.id===this._railDrag.id)this._railDrag=null;};
    this.input.on('pointerup',up);this.input.on('pointerupoutside',up);}
  _select(o){this._selRail=null;super._select(o)}
  _selectSurface(s){this._selRail=null;super._selectSurface(s)}
  _selectRail(s){this._selRail=s;this._selected=this._selectedSurface=null;this._mode='select';this._drawSelection();this._flash?.('GUARDARRAÍL SELECCIONADO')}
  _railHandle(w){const s=this._selRail;if(!s)return null;const r=28/Math.max(.1,this._editCam.zoom||1),q=C(s);if(D(w,{x:s.x1,y:s.y1})<r*r)return'a';if(D(w,{x:s.x2,y:s.y2})<r*r)return'b';if(D(w,q)<r*r)return'c';return null}
  _railAt(w){const hit=22/Math.max(.1,this._editCam.zoom||1);for(let k=this._rails.length-1;k>=0;k--){const s=this._rails[k];let a=P(s,0);for(let i=1;i<=40;i++){const b=P(s,i/40),vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((w.x-a.x)*vx+(w.y-a.y)*vy)/l)),q={x:a.x+t*vx,y:a.y+t*vy};if(D(w,q)<hit*hit)return s;a=b}}return null}
  _drawRails(){if(!this._railRoot)return;this._railRoot.removeAll(true);for(const s of this._rails){const c=C(s),len=Math.hypot(s.x2-s.x1,s.y2-s.y1)+Math.hypot(c.x-(s.x1+s.x2)/2,c.y-(s.y1+s.y2)/2),n=Math.max(1,Math.ceil(len/(+s.spacing||105)));for(let i=0;i<n;i++){const t=(i+.5)/n,p=P(s,t),v=T(s,t),im=this.add.image(p.x,p.y,`env:${s.asset}`),w=Math.max(70,len/n*1.08);if(im.width)im.setDisplaySize(w,im.height*w/im.width);im.setRotation(Math.atan2(v.y,v.x));this._railRoot.add(im)}}}
  _drawSelection(){if(!this._selRail){super._drawSelection();return}const g=this._selectionG,s=this._selRail,z=Math.max(.1,this._editCam.zoom||1),c=C(s),r=11/z;g.clear();g.lineStyle(4/z,0xffd65c,.95);let a=P(s,0);for(let i=1;i<=40;i++){const b=P(s,i/40);g.lineBetween(a.x,a.y,b.x,b.y);a=b}g.lineStyle(2/z,0x45dfff,.8);g.lineBetween(s.x1,s.y1,c.x,c.y);g.lineBetween(c.x,c.y,s.x2,s.y2);g.fillStyle(0xffd65c,1);g.fillCircle(s.x1,s.y1,r);g.fillCircle(s.x2,s.y2,r);g.fillStyle(0x45dfff,1);g.fillCircle(c.x,c.y,r*1.2)}
  _delete(){if(this._selRail){const s=this._selRail;this._rails=this._rails.filter(x=>x!==s);this._selRail=null;this._selectionG.clear();this._drawRails();return}super._delete()}
  _project(){const p=super._project();p.version=Math.max(4,+p.version||1);p.linearBarriers=this._rails.map(s=>({...s}));return p}
  _applyProject(p){this._selRail=null;super._applyProject(p);this._rails=(p?.linearBarriers||[]).map(s=>({...DEF,...s}));this._drawRails()}
}
