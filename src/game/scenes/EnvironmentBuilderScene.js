import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const WORLD_W=8000,WORLD_H=5000;
const CATALOG=[
  {cat:'VEGETACIÓN',id:'tree_broad_01',path:'environment/tree_broad_01.webp',w:170},
  {cat:'VEGETACIÓN',id:'tree_broad_02',path:'environment/tree_broad_02.webp',w:160},
  {cat:'VEGETACIÓN',id:'palm_tall_01',path:'environment/palm_tall_01.webp',w:130},
  {cat:'VEGETACIÓN',id:'shrub_round_01',path:'environment/shrub_round_01.webp',w:78},
  {cat:'VEGETACIÓN',id:'shrub_flowers_01',path:'environment/shrub_flowers_01.webp',w:74},
  {cat:'BARRERAS',id:'concrete_barrier_straight_01',path:'environment/barriers/concrete_barrier_straight_01.webp',w:240},
  {cat:'BARRERAS',id:'guardrail_curve_01',path:'environment/barriers/guardrail_curve_01.webp',w:230},
  {cat:'BARRERAS',id:'guardrail_straight_01',path:'environment/barriers/guardrail_straight_01.webp',w:260},
  {cat:'BARRERAS',id:'plastic_barrier_redwhite_01',path:'environment/barriers/plastic_barrier_redwhite_01.webp',w:260},
  {cat:'BARRERAS',id:'tire_barrier_curve_l_01',path:'environment/barriers/tire_barrier_curve_l_01.webp',w:220},
  {cat:'BARRERAS',id:'tire_barrier_straight_short_01',path:'environment/barriers/tire_barrier_straight_short_01.webp',w:220},
  {cat:'BARRERAS',id:'tire_stack_compact_01',path:'environment/barriers/tire_stack_compact_01.webp',w:125},
  {cat:'PROPS',id:'bollard_metal_short_01',path:'environment/props/bollard_metal_short_01.webp',w:72},
  {cat:'PROPS',id:'cone_orange_01',path:'environment/props/cone_orange_01.webp',w:68},
  {cat:'PROPS',id:'direction_sign_01',path:'environment/props/direction_sign_01.webp',w:115},
  {cat:'PROPS',id:'extinguisher_post_01',path:'environment/props/extinguisher_post_01.webp',w:82},
  {cat:'PROPS',id:'fence_chainlink_curve_l_01',path:'environment/props/fence_chainlink_curve_l_01.webp',w:235},
  {cat:'PROPS',id:'fence_chainlink_straight_01',path:'environment/props/fence_chainlink_straight_01.webp',w:260},
  {cat:'PROPS',id:'light_post_short_01',path:'environment/props/light_post_short_01.webp',w:88},
  {cat:'PROPS',id:'metal_barrel_01',path:'environment/props/metal_barrel_01.webp',w:85},
  {cat:'PROPS',id:'race_start_light_01',path:'environment/props/race_start_light_01.webp',w:120},
  {cat:'PROPS',id:'toolbox_01',path:'environment/props/toolbox_01.webp',w:105},
  {cat:'PROPS',id:'wood_pallet_01',path:'environment/props/wood_pallet_01.webp',w:130},
  {cat:'ESTRUCTURAS',id:'control_tower_small_01',path:'environment/structures/control_tower_small_01.webp',w:180},
  {cat:'ESTRUCTURAS',id:'grandstand_sparse_01',path:'environment/structures/grandstand_sparse_01.webp',w:360},
  {cat:'ESTRUCTURAS',id:'grandstand_half_01',path:'environment/structures/grandstand_half_01.webp',w:380},
  {cat:'ESTRUCTURAS',id:'grandstand_full_01',path:'environment/structures/grandstand_full_01.webp',w:390},
  {cat:'ESTRUCTURAS',id:'marshal_post_01',path:'environment/structures/marshal_post_01.webp',w:125},
  {cat:'ESTRUCTURAS',id:'paddock_box_small_01',path:'environment/structures/paddock_box_small_01.webp',w:235},
  {cat:'ESTRUCTURAS',id:'pit_garage_small_01',path:'environment/structures/pit_garage_small_01.webp',w:315}
];

export class EnvironmentBuilderScene extends BaseScene{
  constructor(){super({key:'EnvironmentBuilderScene'});this._objects=[];this._surfaces=[];this._selected=null;this._mode='select';this._category='ESTRUCTURAS';this._trackId='karting-tenerife';}
  preload(){for(const a of CATALOG)this.load.image(`env:${a.id}`,`${BASE}assets/${a.path}`);}
  create(){super.create();this._setupLayout();this._setupWorld();this._setupUi();this._setupInput();this._refreshCatalog();}
  _setupLayout(){const {width,height}=this.scale;this._top=58;this._left=64;this._right=300;this._vx=this._left+8;this._vy=this._top+8;this._vw=width-this._left-this._right-18;this._vh=height-this._top-16;this.cameras.main.setBackgroundColor('#0b1020');}
  _setupWorld(){
    this._grid=this.add.graphics().setDepth(1);this._surfaceG=this.add.graphics().setDepth(3);this._selectionG=this.add.graphics().setDepth(30);
    this._drawGrid();
    this._editCam=this.cameras.add(this._vx,this._vy,this._vw,this._vh).setBounds(0,0,WORLD_W,WORLD_H).setZoom(.22).centerOn(WORLD_W/2,WORLD_H/2);
    this._editCam.setBackgroundColor('#183d24');
    this.cameras.main.ignore([this._grid,this._surfaceG,this._selectionG]);
  }
  _uiText(x,y,text,size=12,color='#fff'){const t=this.add.text(x,y,text,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:`${size}px`,fontStyle:'bold',color});this._editCam?.ignore(t);return t;}
  _btn(x,y,w,h,label,cb,accent=0x3c4e7a){const b=this.add.rectangle(x,y,w,h,0x172034,1).setOrigin(0).setStrokeStyle(1,accent,.9).setInteractive({useHandCursor:true});const t=this._uiText(x+w/2,y+h/2,label,11).setOrigin(.5);this._editCam?.ignore(b);b.on('pointerup',cb);return{b,t};}
  _setupUi(){const {width,height}=this.scale;
    this.add.rectangle(0,0,width,this._top,0x101626).setOrigin(0);this.add.rectangle(0,this._top,this._left,height-this._top,0x0d1422).setOrigin(0);this.add.rectangle(width-this._right,this._top,this._right,height-this._top,0x0f1422).setOrigin(0);
    const uiRects=this.children.list.filter(o=>o!==this._grid&&o!==this._surfaceG&&o!==this._selectionG);this._editCam.ignore(uiRects);
    this._uiText(18,17,'ENVIRONMENT BUILDER',22,'#ffffff');
    let x=270;this._btn(x,12,74,34,'GUARDAR',()=>this._save());x+=82;this._btn(x,12,72,34,'CARGAR',()=>this._load());x+=80;this._btn(x,12,82,34,'EXPORTAR',()=>this._export());x+=90;this._btn(x,12,92,34,'CARGAR MAPA',()=>this._pickGuide());
    this._trackBtn=this._btn(width-this._right-210,12,200,34,`TRACK: ${this._trackId}`,()=>this._changeTrackId(),0x2bff88);
    const lx=10;this._btn(lx,this._top+18,44,38,'↩',()=>this.scene.start('admin-hub'));this._btn(lx,this._top+66,44,38,'+',()=>this._zoom(1.2));this._btn(lx,this._top+114,44,38,'−',()=>this._zoom(1/1.2));this._btn(lx,this._top+162,44,38,'PAN',()=>{this._mode=this._mode==='pan'?'select':'pan';this._status();});this._btn(lx,this._top+210,44,38,'SEL',()=>{this._mode='select';this._status();});this._btn(lx,this._top+258,44,38,'ASF',()=>{this._mode='surface';this._status();},0xe1b33b);
    const rx=width-this._right+14;this._uiText(rx,this._top+14,'ASSETS',17,'#c7d2ff');
    const cats=['VEGETACIÓN','BARRERAS','PROPS','ESTRUCTURAS'];let cy=this._top+42;cats.forEach((c,i)=>this._btn(rx+i*68,cy,64,28,c.slice(0,5),()=>{this._category=c;this._refreshCatalog();},c===this._category?0x2bff88:0x3c4e7a));
    this._catalogRoot=this.add.container(0,0).setDepth(80);this._editCam.ignore(this._catalogRoot);
    const py=height-174;this._uiText(rx,py,'SELECCIÓN',14,'#c7d2ff');
    this._btn(rx,py+24,62,30,'⟲ -15',()=>this._rotate(-15));this._btn(rx+68,py+24,62,30,'⟳ +15',()=>this._rotate(15));this._btn(rx+136,py+24,62,30,'ESC -',()=>this._scale(.9));this._btn(rx+204,py+24,62,30,'ESC +',()=>this._scale(1.1));
    this._btn(rx,py+60,62,30,'↔ X',()=>this._flip('x'));this._btn(rx+68,py+60,62,30,'↕ Y',()=>this._flip('y'));this._btn(rx+136,py+60,62,30,'DUP',()=>this._duplicate());this._btn(rx+204,py+60,62,30,'BORRAR',()=>this._delete(),0xff5c5c);
    this._surfacePhysics='grass';this._surfaceWidth=120;this._surfaceInfo=this._uiText(rx,py+100,'ASFALTO · física CÉSPED · ancho 120',11,'#e1b33b');this._btn(rx,py+122,86,28,'FÍSICA',()=>{this._surfacePhysics=this._surfacePhysics==='grass'?'asphalt':'grass';this._updateSurfaceInfo();});this._btn(rx+92,py+122,62,28,'W -',()=>{this._surfaceWidth=Math.max(40,this._surfaceWidth-20);this._updateSurfaceInfo();});this._btn(rx+160,py+122,62,28,'W +',()=>{this._surfaceWidth=Math.min(320,this._surfaceWidth+20);this._updateSurfaceInfo();});
    this._statusText=this._uiText(this._vx+12,this._vy+10,'MODO: SELECCIÓN',12,'#90ffbd');
    this._guideInput=document.createElement('input');this._guideInput.type='file';this._guideInput.accept='image/*';this._guideInput.style.display='none';document.body.appendChild(this._guideInput);this._guideInput.addEventListener('change',e=>this._loadGuideFile(e.target.files?.[0]));this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{try{this._guideInput?.remove();}catch{}});
  }
  _drawGrid(){this._grid.clear();this._grid.lineStyle(1,0xffffff,.05);for(let x=0;x<=WORLD_W;x+=200)this._grid.lineBetween(x,0,x,WORLD_H);for(let y=0;y<=WORLD_H;y+=200)this._grid.lineBetween(0,y,WORLD_W,y);}
  _refreshCatalog(){if(!this._catalogRoot)return;this._catalogRoot.removeAll(true);const {width,height}=this.scale,rx=width-this._right+14,startY=this._top+82,items=CATALOG.filter(a=>a.cat===this._category);const cardW=84,cardH=86,gap=8,cols=3,maxRows=Math.max(1,Math.floor((height-startY-190)/(cardH+gap)));items.slice(0,cols*maxRows).forEach((a,i)=>{const col=i%cols,row=Math.floor(i/cols),x=rx+col*(cardW+gap),y=startY+row*(cardH+gap);const bg=this.add.rectangle(x,y,cardW,cardH,0x151f31,1).setOrigin(0).setStrokeStyle(1,0x344563,.9).setInteractive({useHandCursor:true});const img=this.add.image(x+cardW/2,y+34,`env:${a.id}`);const s=Math.min(58/(img.width||1),48/(img.height||1));img.setScale(s);const tx=this.add.text(x+cardW/2,y+64,a.id.replace(/_01$/,'').replaceAll('_',' '),{fontFamily:'system-ui',fontSize:'8px',color:'#fff',align:'center',wordWrap:{width:cardW-8}}).setOrigin(.5,0);bg.on('pointerup',()=>this._spawn(a));this._catalogRoot.add([bg,img,tx]);});this._editCam.ignore(this._catalogRoot.list);}
  _spawn(a,data=null){const c=this._editCam.getWorldPoint(this._editCam.x+this._editCam.width/2,this._editCam.y+this._editCam.height/2),x=data?.x??c.x,y=data?.y??c.y;const img=this.add.image(x,y,`env:${a.id}`).setDepth(12).setInteractive({useHandCursor:true,draggable:true});const width=data?.displayWidth||a.w;if(img.width>0)img.setDisplaySize(width,img.height*(width/img.width));img.rotation=data?.rotation||0;img.flipX=!!data?.flipX;img.flipY=!!data?.flipY;img._env={asset:a.id,path:a.path};this.input.setDraggable(img);img.on('pointerdown',()=>this._select(img));img.on('drag',(_p,dx,dy)=>{if(this._mode!=='select')return;img.x=dx;img.y=dy;this._drawSelection();});this.cameras.main.ignore(img);this._objects.push(img);this._select(img);return img;}
  _select(obj){this._selected=obj;this._mode='select';this._drawSelection();this._status();}
  _drawSelection(){this._selectionG.clear();if(!this._selected?.scene)return;const b=this._selected.getBounds();this._selectionG.lineStyle(5,0x2bff88,.95);this._selectionG.strokeRect(b.x,b.y,b.width,b.height);}
  _rotate(deg){if(!this._selected)return;this._selected.rotation+=Phaser.Math.DegToRad(deg);this._drawSelection();}
  _scale(m){if(!this._selected)return;this._selected.scaleX*=m;this._selected.scaleY*=m;this._drawSelection();}
  _flip(axis){if(!this._selected)return;if(axis==='x')this._selected.flipX=!this._selected.flipX;else this._selected.flipY=!this._selected.flipY;this._drawSelection();}
  _duplicate(){if(!this._selected)return;const a=CATALOG.find(x=>x.id===this._selected._env?.asset);if(!a)return;this._spawn(a,{x:this._selected.x+35,y:this._selected.y+35,displayWidth:this._selected.displayWidth,rotation:this._selected.rotation,flipX:this._selected.flipX,flipY:this._selected.flipY});}
  _delete(){if(!this._selected)return;this._objects=this._objects.filter(o=>o!==this._selected);this._selected.destroy();this._selected=null;this._selectionG.clear();}
  _setupInput(){this._panStart=null;this._surfaceStart=null;this.input.on('pointerdown',p=>{if(!this._inside(p))return;if(this._mode==='pan'){this._panStart={x:p.x,y:p.y,sx:this._editCam.scrollX,sy:this._editCam.scrollY};}else if(this._mode==='surface'){this._surfaceStart=this._editCam.getWorldPoint(p.x,p.y);}});this.input.on('pointermove',p=>{if(this._panStart&&p.isDown){this._editCam.scrollX=this._panStart.sx-(p.x-this._panStart.x)/this._editCam.zoom;this._editCam.scrollY=this._panStart.sy-(p.y-this._panStart.y)/this._editCam.zoom;}});this.input.on('pointerup',p=>{if(this._mode==='surface'&&this._surfaceStart&&this._inside(p)){const end=this._editCam.getWorldPoint(p.x,p.y);this._addSurface(this._surfaceStart,end,this._surfaceWidth,this._surfacePhysics);}this._surfaceStart=null;this._panStart=null;});this.input.on('wheel',(_p,_gos,_dx,dy)=>this._zoom(dy>0?1/1.1:1.1));}
  _inside(p){return p.x>=this._vx&&p.x<=this._vx+this._vw&&p.y>=this._vy&&p.y<=this._vy+this._vh;}
  _zoom(m){const c=this._editCam;const z=Phaser.Math.Clamp(c.zoom*m,.1,2.5);c.setZoom(z);}
  _addSurface(a,b,width,physics,data=null){const s={x1:a.x,y1:a.y,x2:b.x,y2:b.y,width,visual:'asphalt',physics};this._surfaces.push(s);this._redrawSurfaces();}
  _redrawSurfaces(){this._surfaceG.clear();for(const s of this._surfaces){this._surfaceG.lineStyle(s.width,0x2b2c2f,.98);this._surfaceG.lineBetween(s.x1,s.y1,s.x2,s.y2);this._surfaceG.lineStyle(3,0x56595e,.9);this._surfaceG.lineBetween(s.x1,s.y1,s.x2,s.y2);}}
  _project(){return{version:1,trackId:this._trackId,environment:this._objects.filter(o=>o.scene).map(o=>({asset:o._env.asset,path:o._env.path,x:+o.x.toFixed(2),y:+o.y.toFixed(2),rotation:+o.rotation.toFixed(5),displayWidth:+o.displayWidth.toFixed(2),flipX:!!o.flipX,flipY:!!o.flipY})),surfaces:this._surfaces.map(s=>({...s}))};}
  _storageKey(){return`tdr2:environmentBuilder:v1:${this._trackId}`;}
  _save(){try{localStorage.setItem(this._storageKey(),JSON.stringify(this._project()));this._flash('GUARDADO');}catch{this._flash('ERROR GUARDANDO');}}
  _load(){try{const raw=localStorage.getItem(this._storageKey());if(!raw){this._flash('SIN PROYECTO');return;}this._applyProject(JSON.parse(raw));this._flash('CARGADO');}catch{this._flash('ERROR CARGANDO');}}
  _applyProject(p){for(const o of this._objects)o?.destroy?.();this._objects=[];this._selected=null;this._selectionG.clear();this._surfaces=[];for(const d of p?.environment||[]){const a=CATALOG.find(x=>x.id===d.asset);if(a)this._spawn(a,d);}this._selected=null;this._selectionG.clear();for(const s of p?.surfaces||[])this._surfaces.push({...s});this._redrawSurfaces();}
  _export(){const txt=JSON.stringify(this._project(),null,2),blob=new Blob([txt],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${this._trackId}.environment.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);this._flash('JSON EXPORTADO');}
  _changeTrackId(){const v=window.prompt('ID del circuito',this._trackId);if(!v)return;this._trackId=String(v).trim().toLowerCase().replace(/\s+/g,'-');this._trackBtn?.t?.setText(`TRACK: ${this._trackId}`);}
  _pickGuide(){this._guideInput?.click();}
  _loadGuideFile(file){if(!file)return;const r=new FileReader();r.onload=e=>{const im=new Image();im.onload=()=>{const key=`env-guide-${Date.now()}`;this.textures.addImage(key,im);this._guide?.destroy?.();const g=this.add.image(WORLD_W/2,WORLD_H/2,key).setDepth(2).setAlpha(.72);const s=Math.min((WORLD_W*.82)/im.width,(WORLD_H*.82)/im.height);g.setScale(s);this.cameras.main.ignore(g);this._guide=g;};im.src=e.target.result;};r.readAsDataURL(file);this._guideInput.value='';}
  _updateSurfaceInfo(){this._surfaceInfo?.setText(`ASFALTO · física ${this._surfacePhysics==='grass'?'CÉSPED':'ASFALTO'} · ancho ${this._surfaceWidth}`);}
  _status(){const label=this._mode==='surface'?'SUPERFICIE ASFALTO':this._mode==='pan'?'PAN':'SELECCIÓN';this._statusText?.setText(`MODO: ${label}`);}
  _flash(msg){this._flashText?.destroy?.();this._flashText=this._uiText(this._vx+this._vw/2,this._vy+28,msg,14,'#2bff88').setOrigin(.5);this.time.delayedCall(1200,()=>this._flashText?.destroy?.());}
}
