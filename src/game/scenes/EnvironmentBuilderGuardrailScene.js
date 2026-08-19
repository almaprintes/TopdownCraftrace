import Phaser from 'phaser';
import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderAssetLibraryScene.js';
import { pathPoint, pathTangent, normalizedPoints } from '../environment/EditableSpline.js';

const DEF={type:'guardrail',asset:'guardrail_straight_01',path:'environment/barriers/guardrail_straight_01.webp',spacing:105};
const D=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
function syncEnds(s,pts){s.points=pts.map(p=>({...p}));s.x1=pts[0].x;s.y1=pts[0].y;s.x2=pts[pts.length-1].x;s.y2=pts[pts.length-1].y;delete s.cpx;delete s.cpy;}

export class EnvironmentBuilderScene extends Current{
  create(){this._rails=[];this._selRail=null;this._railStart=null;this._railDrag=null;super.create();this._railRoot=this.add.container(0,0).setDepth(11.8);this.cameras.main.ignore(this._railRoot);this._drawRails();}
  _allAssets(){return (super._allAssets?.()||[]).filter(a=>!['guardrail_straight_01','guardrail_curve_01'].includes(a.id));}
  _setupUi(){super._setupUi();const {width}=this.scale,rx=width-this._right,y=this._top+118;
    const b=this.add.rectangle(rx+14,y,this._right-28,32,0x242c35,1).setOrigin(0).setStrokeStyle(1,0xb8c2cc,.95).setInteractive({useHandCursor:true}).setDepth(60506);
    const t=this.add.text(rx+this._right/2,y+16,'〰 GUARDARRAÍL',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(60507);this._editCam?.ignore([b,t]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._mode='guardrail';this._selRail=this._selected=this._selectedSurface=null;this._selectionG.clear();this._flash?.('ARRASTRA PARA CREAR GUARDARRAÍL');});}
  _setupInput(){super._setupInput();const W=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',(p,over=[])=>{if(!this._inside?.(p))return;const w=W(p);if(this._mode==='guardrail'){this._railStart=w;this._freePan=null;return;}if(this._mode!=='select'||(over||[]).some(o=>o?._env))return;const h=this._railHandle(w);if(h){this._railDrag={id:p.id,h};this._freePan=null;return;}const r=this._railAt(w);if(r){this._selectRail(r);this._freePan=null;}});
    this.input.on('pointermove',p=>{if(!this._railDrag||!p.isDown||p.id!==this._railDrag.id||!this._selRail)return;const w=W(p),s=this._selRail,pts=normalizedPoints(s),h=this._railDrag.h;if(h==='a')pts[0]=w;else if(h==='b')pts[pts.length-1]=w;else if(String(h).startsWith('node:')){const i=Number(String(h).split(':')[1]);if(i>0&&i<pts.length-1)pts[i]=w;}syncEnds(s,pts);this._drawRails();this._drawSelection();this._freePan=null;});
    const up=p=>{if(this._mode==='guardrail'&&this._railStart&&this._inside?.(p)){const e=W(p),dx=e.x-this._railStart.x,dy=e.y-this._railStart.y;if(dx*dx+dy*dy>1600){const s={...DEF,x1:this._railStart.x,y1:this._railStart.y,x2:e.x,y2:e.y};this._rails.push(s);this._drawRails();this._selectRail(s)}}this._railStart=null;if(!p||!this._railDrag||p.id===this._railDrag.id)this._railDrag=null;};
    this.input.on('pointerup',up);this.input.on('pointerupoutside',up);}
  _select(o){this._selRail=null;super._select(o)}
  _selectSurface(s){this._selRail=null;super._selectSurface(s)}
  _selectRail(s){this._selRail=s;this._selected=this._selectedSurface=null;this._mode='select';this._drawSelection();this._flash?.('GUARDARRAÍL SELECCIONADO')}
  _railHandle(w){const s=this._selRail;if(!s)return null;const pts=normalizedPoints(s),r=28/Math.max(.1,this._editCam.zoom||1),rr=r*r;if(D(w,pts[0])<rr)return'a';if(D(w,pts[pts.length-1])<rr)return'b';for(let i=1;i<pts.length-1;i++)if(D(w,pts[i])<rr)return`node:${i}`;return null}
  _railAt(w){const hit=22/Math.max(.1,this._editCam.zoom||1);for(let k=this._rails.length-1;k>=0;k--){const s=this._rails[k];let a=pathPoint(s,0);for(let i=1;i<=90;i++){const b=pathPoint(s,i/90),vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((w.x-a.x)*vx+(w.y-a.y)*vy)/l)),q={x:a.x+t*vx,y:a.y+t*vy};if(D(w,q)<hit*hit)return s;a=b}}return null}
  _drawRails(){if(!this._railRoot)return;this._railRoot.removeAll(true);for(const s of this._rails){const len=(()=>{let p=pathPoint(s,0),L=0;for(let i=1;i<=120;i++){const q=pathPoint(s,i/120);L+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return L;})();const n=Math.max(1,Math.ceil(len/(+s.spacing||105)));for(let i=0;i<n;i++){const t=(i+.5)/n,p=pathPoint(s,t),v=pathTangent(s,t),im=this.add.image(p.x,p.y,`env:${s.asset}`),w=Math.max(70,len/n*1.08);if(im.width)im.setDisplaySize(w,im.height*w/im.width);im.setRotation(Math.atan2(v.y,v.x));this._railRoot.add(im)}}}
  _drawSelection(){if(!this._selRail){super._drawSelection();return}const g=this._selectionG,s=this._selRail,pts=normalizedPoints(s),z=Math.max(.1,this._editCam.zoom||1),r=11/z;g.clear();g.lineStyle(4/z,0xffd65c,.95);let a=pathPoint(s,0);for(let i=1;i<=90;i++){const b=pathPoint(s,i/90);g.lineBetween(a.x,a.y,b.x,b.y);a=b}g.lineStyle(2/z,0x45dfff,.7);for(let i=1;i<pts.length;i++)g.lineBetween(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);g.fillStyle(0xffd65c,1);g.fillCircle(pts[0].x,pts[0].y,r);g.fillCircle(pts[pts.length-1].x,pts[pts.length-1].y,r);g.fillStyle(0x45dfff,1);for(let i=1;i<pts.length-1;i++)g.fillCircle(pts[i].x,pts[i].y,r*1.2)}
  _delete(){if(this._selRail){const s=this._selRail;this._rails=this._rails.filter(x=>x!==s);this._selRail=null;this._selectionG.clear();this._drawRails();return}super._delete()}
  _project(){const p=super._project();p.version=Math.max(5,+p.version||1);p.linearBarriers=this._rails.map(s=>({...s,points:Array.isArray(s.points)?normalizedPoints(s):s.points}));return p}
  _applyProject(p){this._selRail=null;super._applyProject(p);this._rails=(p?.linearBarriers||[]).map(s=>({...DEF,...s}));for(const s of this._rails)if(Array.isArray(s.points))syncEnds(s,normalizedPoints(s));this._drawRails()}
}
