import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderRealTrackCleanScene.js';
import { buildTrackRibbon } from '../tracks/TrackBuilder.js';

function polyFromEdges(left,right){
  const pts=[];
  for(const p of left||[])pts.push({x:Number(p[0]),y:Number(p[1])});
  for(let i=(right||[]).length-1;i>=0;i--){const p=right[i];pts.push({x:Number(p[0]),y:Number(p[1])});}
  return pts;
}

function fillPoly(g,pts,color,alpha=1){
  if(!pts?.length)return;
  g.fillStyle(color,alpha);g.beginPath();g.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.closePath();g.fillPath();
}

function normAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupUi(){
    super._setupUi();
    this._installFineRotationButtons();
  }

  _installFinalTopBar(){
    const {width}=this.scale;
    const usableRight=width-this._right;
    const y=12,h=34,gap=8;
    const cover=this.add.rectangle(0,0,width,this._top,0x101626,1).setOrigin(0).setDepth(60000);
    this._editCam?.ignore(cover);

    const titleW=Math.min(330,Math.max(255,usableRight*.27));
    const title=this.add.text(18,17,'ENVIRONMENT BUILDER',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'19px',fontStyle:'bold',color:'#fff'
    }).setDepth(60003);
    this._editCam?.ignore(title);

    const make=(x,w,label,cb,accent=0x3c4e7a)=>{
      const b=this.add.rectangle(x,y,w,h,0x172034,1).setOrigin(0)
        .setStrokeStyle(1,accent,.95).setInteractive({useHandCursor:true}).setDepth(60002);
      const t=this.add.text(x+w/2,y+h/2,label,{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#fff'
      }).setOrigin(.5).setDepth(60003);
      this._editCam?.ignore([b,t]);
      b.on('pointerup',p=>{p?.event?.stopPropagation?.();cb?.();});
      return {b,t};
    };

    let x=titleW+28;
    this._saveHeaderBtn=make(x,78,'GUARDAR',()=>this._save());x+=86;
    make(x,76,'CARGAR',()=>this._load());x+=84;
    make(x,86,'EXPORTAR',()=>this._export());x+=94;
    make(x,118,'ABRIR CIRCUITO',()=>this._openTrackPicker(),0xe1b33b);x+=126;
    make(x,66,'SALIR',()=>this._exitBuilder(),0xff725f);x+=74;

    const trackW=Math.max(118,usableRight-x-10);
    const trackBg=this.add.rectangle(x,y,trackW,h,0x10251f,1).setOrigin(0)
      .setStrokeStyle(1,0x2bff88,.95).setDepth(60002);
    this._headerTrackText=this.add.text(x+trackW/2,y+h/2,this._realTrack?.name||this._trackId,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#dfffee'
    }).setOrigin(.5).setDepth(60003);
    this._editCam?.ignore([trackBg,this._headerTrackText]);
    this._finalTrackBtn=null;
  }

  _refreshTrackButton(){
    super._refreshTrackButton?.();
    this._headerTrackText?.setText?.(this._realTrack?.name||this._trackId);
  }

  _exitBuilder(){
    const hasWork=(this._objects?.length||0)||(this._surfaces?.length||0);
    if(hasWork){
      const ok=window.confirm?.('¿Salir del editor? Los cambios que no hayas guardado pueden perderse.');
      if(ok===false)return;
    }
    this.scene.start('admin-hub');
  }

  _installFineRotationButtons(){
    const {width,height}=this.scale;
    const rx=width-this._right+14;
    const py=height-174;
    const make=(x,label,deg)=>{
      const b=this.add.rectangle(x,py+24,62,30,0x172034,1).setOrigin(0)
        .setStrokeStyle(1,0x5b7196,.98).setInteractive({useHandCursor:true}).setDepth(61000);
      const t=this.add.text(x+31,py+39,label,{
        fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#fff'
      }).setOrigin(.5).setDepth(61001);
      this._editCam?.ignore([b,t]);
      b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._rotate(deg);});
    };
    make(rx,'↺ 1°',-1);
    make(rx+68,'↻ 1°',1);
  }

  _save(){
    super._save?.();
    const name=this._realTrack?.name||this._trackId;
    if(this._saveHeaderBtn?.t){
      this._saveHeaderBtn.t.setText('✓ GUARDADO');
      this.time.delayedCall(1700,()=>this._saveHeaderBtn?.t?.setText?.('GUARDAR'));
    }
    this._builderToast(`GUARDADO · ${name}`);
  }

  _builderToast(message){
    try{this._builderToastRoot?.destroy?.(true);}catch{}
    const x=this._vx+this._vw/2,y=this._vy+24;
    const root=this.add.container(0,0).setDepth(62000);
    const bg=this.add.rectangle(x,y,260,34,0x07120d,.96).setStrokeStyle(2,0x2bff88,.95);
    const tx=this.add.text(x,y,message,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#dffff0'}).setOrigin(.5);
    root.add([bg,tx]);this._editCam?.ignore(root);this._builderToastRoot=root;
    this.time.delayedCall(1800,()=>{if(this._builderToastRoot===root)this._builderToastRoot=null;root.destroy(true);});
  }

  _drawRealTrack(){
    const t=this._realTrack,g=this._realTrackG,m=this._realTrackMarkG;
    if(!t||!g||!m)return;
    g.clear();m.clear();

    const shoulderPx=Math.max(8,Number(t.shoulderPx)||18);
    const geom=buildTrackRibbon({
      centerline:t.centerline,
      trackWidth:t.trackWidth,
      grassMargin:shoulderPx,
      sampleStepPx:Math.max(6,Number(t.sampleStepPx)||10),
      cellSize:Number(t.cellSize)||400
    });
    const center=(geom.center||[]).map(p=>({x:Number(p.x),y:Number(p.y),width:Number(p.width)||Number(t.trackWidth)||100}));
    const left=geom.left||[],right=geom.right||[];

    // Shoulder first, then the asphalt ribbon.
    if(geom.grass?.left?.length&&geom.grass?.right?.length){
      fillPoly(g,polyFromEdges(geom.grass.left,geom.grass.right),0x65533d,.72);
    }
    fillPoly(g,polyFromEdges(left,right),0x2c2b2b,1);

    // Crisp white edge lines, important when positioning props against the track.
    const edgeWidth=Math.max(2,Number(t.trackWidth||100)*.018);
    const edge=(arr)=>{
      if(!arr?.length)return;
      g.lineStyle(edgeWidth,0xf0f2ed,.96);g.beginPath();g.moveTo(arr[0][0],arr[0][1]);
      for(let i=1;i<arr.length;i++)g.lineTo(arr[i][0],arr[i][1]);
      g.closePath();g.strokePath();
    };
    edge(left);edge(right);

    // Mobile-friendly red/white kerbs on the inside of meaningful corners.
    const n=Math.min(center.length,left.length,right.length);
    if(n>12){
      const curbW=Math.max(7,Math.min(13,Number(t.trackWidth||100)*.13));
      let phase=0;
      for(let i=0;i<n;i++){
        const im=(i-4+n)%n,ip=(i+4)%n;
        const a=center[im],b=center[i],c=center[ip];
        const turn=normAngle(Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(b.y-a.y,b.x-a.x));
        if(Math.abs(turn)<0.055)continue;
        const j=(i+1)%n;
        const e0=turn>0?left[i]:right[i],e1=turn>0?left[j]:right[j];
        const c0=center[i],c1=center[j];
        if(!e0||!e1||!c0||!c1)continue;
        const d0=Math.hypot(e0[0]-c0.x,e0[1]-c0.y)||1;
        const d1=Math.hypot(e1[0]-c1.x,e1[1]-c1.y)||1;
        const o0={x:e0[0]+(e0[0]-c0.x)/d0*curbW,y:e0[1]+(e0[1]-c0.y)/d0*curbW};
        const o1={x:e1[0]+(e1[0]-c1.x)/d1*curbW,y:e1[1]+(e1[1]-c1.y)/d1*curbW};
        const col=(Math.floor(phase/3)%2===0)?0xf4f1e8:0xd62f2f;
        g.fillStyle(col,.98);g.beginPath();g.moveTo(e0[0],e0[1]);g.lineTo(e1[0],e1[1]);g.lineTo(o1.x,o1.y);g.lineTo(o0.x,o0.y);g.closePath();g.fillPath();
        phase++;
      }
    }

    // Checkered finish reference instead of a single anonymous white stroke.
    const f=t.finishLine;
    if(f?.a&&f?.b){
      const blocks=10;
      const lw=Math.max(7,Number(t.trackWidth||100)*.065);
      for(let i=0;i<blocks;i++){
        const t0=i/blocks,t1=(i+1)/blocks;
        const x0=f.a.x+(f.b.x-f.a.x)*t0,y0=f.a.y+(f.b.y-f.a.y)*t0;
        const x1=f.a.x+(f.b.x-f.a.x)*t1,y1=f.a.y+(f.b.y-f.a.y)*t1;
        m.lineStyle(lw,i%2?0x151515:0xffffff,1);m.lineBetween(x0,y0,x1,y1);
      }
    }
  }
}
