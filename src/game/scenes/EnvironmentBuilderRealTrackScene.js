import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderContinuousSurfaceScene.js';
import { createTrack, getTrackKeys } from '../tracks/trackRegistry.js';
import { buildTrackRibbon } from '../tracks/TrackBuilder.js';

function polygonPoints(left,right){
  const out=[];
  for(const p of left||[])out.push({x:Number(p[0]),y:Number(p[1])});
  for(let i=(right||[]).length-1;i>=0;i--){const p=right[i];out.push({x:Number(p[0]),y:Number(p[1])});}
  return out;
}

function drawFilledPolygon(g,pts,color,alpha=1){
  if(!pts?.length)return;
  g.fillStyle(color,alpha);g.beginPath();g.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.closePath();g.fillPath();
}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  constructor(){
    super();
    this._trackKeys=getTrackKeys();
    if(!this._trackKeys.includes(this._trackId))this._trackId=this._trackKeys[0]||'karting-tenerife';
    this._realTrack=null;
  }

  _setupWorld(){
    super._setupWorld();
    this._realTrackG=this.add.graphics().setDepth(2.35);
    this._realTrackMarkG=this.add.graphics().setDepth(2.45);
    this.cameras.main.ignore([this._realTrackG,this._realTrackMarkG]);
    this._openRealTrack(this._trackId,false);
  }

  _setupUi(){
    super._setupUi();
    const {width}=this.scale;
    const y=13;
    const x=width-this._right-254;
    this._prevTrackBtn=this._btn(x,y,32,32,'‹',()=>this._cycleTrack(-1),0x2bff88);
    this._nextTrackBtn=this._btn(width-this._right-42,y,32,32,'›',()=>this._cycleTrack(1),0x2bff88);
    this._refreshTrackButton();
  }

  _changeTrackId(){this._cycleTrack(1);}

  _cycleTrack(dir){
    if(!this._trackKeys?.length)return;
    let i=this._trackKeys.indexOf(this._trackId);if(i<0)i=0;
    i=(i+dir+this._trackKeys.length)%this._trackKeys.length;
    const next=this._trackKeys[i];
    if(next===this._trackId)return;
    if((this._objects?.length||0)||(this._surfaces?.length||0)){
      const ok=window.confirm?.('Cambiar de circuito conservará el proyecto actual solo si lo guardaste. ¿Continuar?');
      if(ok===false)return;
    }
    this._openRealTrack(next,true);
  }

  _openRealTrack(trackId,resetProject=true){
    let track=null;
    try{track=createTrack(trackId);}catch{this._flash?.('CIRCUITO NO ENCONTRADO');return;}
    this._trackId=trackId;this._realTrack=track;
    if(resetProject){
      for(const o of this._objects||[])o?.destroy?.();
      this._objects=[];this._surfaces=[];this._selected=null;this._selectedSurface=null;
      this._selectionG?.clear?.();this._redrawSurfaces?.();
    }
    const w=Math.max(1200,Number(track.worldW)||8000),h=Math.max(900,Number(track.worldH)||5000);
    this._editorWorldW=w;this._editorWorldH=h;
    this._editCam?.setBounds?.(0,0,w,h);
    this._drawRealTrack();
    this._fitRealTrack();
    this._refreshTrackButton();
    this._load();
  }

  _drawRealTrack(){
    const t=this._realTrack,g=this._realTrackG,m=this._realTrackMarkG;if(!t||!g||!m)return;
    g.clear();m.clear();
    const isOpen=t.closed===false||t.raceType==='stage';
    if(isOpen){
      // Environment Studio must show the authored stage literally. Do not feed
      // an open rally stage through any closed-polygon/ribbon renderer: draw
      // only consecutive authored points, so META can never connect to SALIDA.
      const center=(t.centerline||[]).map(p=>({x:Number(p?.x??p?.[0]),y:Number(p?.y??p?.[1]),width:Number(p?.width)||Number(t.trackWidth)||100})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
      const left=[],right=[];
      for(let i=0;i<center.length;i++){
        const p=center[i],prev=center[Math.max(0,i-1)],next=center[Math.min(center.length-1,i+1)];
        let tx=next.x-prev.x,ty=next.y-prev.y,d=Math.hypot(tx,ty)||1;tx/=d;ty/=d;
        const nx=-ty,ny=tx,half=p.width*.5;left.push({x:p.x+nx*half,y:p.y+ny*half});right.push({x:p.x-nx*half,y:p.y-ny*half});
      }
      g.fillStyle(0x2c2b2b,1);
      for(let i=0;i<center.length-1;i++){g.beginPath();g.moveTo(left[i].x,left[i].y);g.lineTo(left[i+1].x,left[i+1].y);g.lineTo(right[i+1].x,right[i+1].y);g.lineTo(right[i].x,right[i].y);g.closePath();g.fillPath();}
      g.lineStyle(Math.max(2,Number(t.trackWidth||100)*.015),0xe8edf0,.9);
      const edge=arr=>{if(!arr.length)return;g.beginPath();g.moveTo(arr[0].x,arr[0].y);for(let i=1;i<arr.length;i++)g.lineTo(arr[i].x,arr[i].y);g.strokePath();};edge(left);edge(right);
    }else{
      const geom=buildTrackRibbon({centerline:t.centerline,trackWidth:t.trackWidth,grassMargin:0,sampleStepPx:Math.max(8,Number(t.sampleStepPx)||12),cellSize:Number(t.cellSize)||400,closed:true});
      const left=geom.left||[],right=geom.right||[];
      g.fillStyle(0x2c2b2b,1);
      for(let i=0;i<left.length;i++){const j=(i+1)%left.length;if(!left[i]||!right[i]||!left[j]||!right[j])continue;g.beginPath();g.moveTo(left[i][0],left[i][1]);g.lineTo(left[j][0],left[j][1]);g.lineTo(right[j][0],right[j][1]);g.lineTo(right[i][0],right[i][1]);g.closePath();g.fillPath();}
      g.lineStyle(Math.max(2,Number(t.trackWidth||100)*.015),0xe8edf0,.9);
      const edge=arr=>{if(!arr?.length)return;g.beginPath();g.moveTo(arr[0][0],arr[0][1]);for(let i=1;i<arr.length;i++)g.lineTo(arr[i][0],arr[i][1]);g.closePath();g.strokePath();};edge(left);edge(right);
    }
    const finish=t.finishLine;if(finish?.a&&finish?.b){m.lineStyle(Math.max(7,Number(t.trackWidth||100)*.06),0xffffff,1);m.lineBetween(finish.a.x,finish.a.y,finish.b.x,finish.b.y);}
  }

  _fitRealTrack(){
    const t=this._realTrack;if(!t||!this._editCam)return;
    const pts=(t.centerline||[]).filter(p=>Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)));if(!pts.length)return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
    const pad=Math.max(180,Number(t.trackWidth||100)*2.3);minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;
    const bw=Math.max(200,maxX-minX),bh=Math.max(200,maxY-minY);
    const z=Math.max(.1,Math.min(2.5,Math.min(this._editCam.width/bw,this._editCam.height/bh)*.92));
    this._editCam.setZoom(z);this._editCam.centerOn((minX+maxX)/2,(minY+maxY)/2);
  }

  _refreshTrackButton(){
    const name=this._realTrack?.name||this._trackId;
    this._trackBtn?.t?.setText?.(`${name}`);
  }

  _project(){
    const p=super._project();
    p.version=Math.max(3,Number(p.version)||1);
    p.trackId=this._trackId;
    p.baseTrack={id:this._trackId,name:this._realTrack?.name||this._trackId,source:`src/game/tracks/library/${this._trackId}/track.json`,locked:true};
    p.repositoryPath=`src/game/tracks/library/${this._trackId}/${this._trackId}.environment.json`;
    return p;
  }

  _export(){
    const data=this._project();
    const txt=JSON.stringify(data,null,2),blob=new Blob([txt],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${this._trackId}.environment.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    this._flash?.(`EXPORTADO · subir a library/${this._trackId}/`);
  }
}
