import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageCleanTypographyScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const trackPts=(track)=>(track?.centerline||[]).map(p=>Array.isArray(p)?{x:+p[0],y:+p[1]}:{x:+p?.x,y:+p?.y}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
const dirtTrack=(track)=>/dirt|tierra|gravel|grava/i.test(String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||''));
function seedFrom(text=''){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

export class TrackGarageScene extends CurrentTrackGarageScene{
  create(){
    super.create();
    const before=Array.isArray(this._tracks)?this._tracks:[];
    const filtered=before.filter(t=>t?.meta?.hiddenFromTrackSelect!==true&&t?.key!=='practice-area'&&t?.id!=='practice-area');
    if(filtered.length!==before.length){
      const selectedKey=before[this._index]?.key;
      this._tracks=filtered;
      const next=this._tracks.findIndex(t=>t?.key===selectedKey);
      this._index=next>=0?next:Math.max(0,Math.min(this._index||0,this._tracks.length-1));
      try{this._commercial?.destroy?.(true);}catch{}
      this._commercial=null;
      try{this._buildCommercial?.();}catch{}
    }
  }

  _buildCommercial(...args){
    super._buildCommercial(...args);
    this._applyFloatingTopChrome();
  }

  _applyFloatingTopChrome(){
    const root=this._commercial;
    if(!root?.list?.length)return;
    const W=this.scale.width;
    const top=8;
    const h=58;
    const side=Math.max(10,Math.min(24,W*.015));

    for(const obj of root.list){
      const type=String(obj?.type||'');
      if((type==='Text'||type==='Rectangle')&&Number.isFinite(Number(obj?.y))&&obj.y<64){
        obj.y+=top;
      }
    }

    const plate=this.add.graphics();
    plate.fillStyle(0x06121d,.95).fillRoundedRect(side,top,W-side*2,h,13);
    plate.lineStyle(1,0x46ddff,.36).strokeRoundedRect(side,top,W-side*2,h,13);
    plate.lineStyle(2,0xe6b84e,.82).lineBetween(side+16,top+1,side+Math.min(260,W*.22),top+1);
    root.addAt(plate,Math.min(1,root.list.length));
  }

  _ensurePremiumPreview(track,w=900,h=520){
    const p=trackPts(track);if(p.length<3)return null;
    const hero=Number(w)>=800,tier=hero?'hero':'thumb';
    const renderW=hero?1024:420,renderH=hero?600:250;
    const sig=`${track?.key}_${dirtTrack(track)?'dirt':'asphalt'}_${p.length}_${tier}_v7_polish`;
    const existing=this._premiumPreviewKeys?.get(sig);if(existing&&this.textures.exists(existing))return existing;
    const key=`premium_track_${sig}`;if(this.textures.exists(key)){this._premiumPreviewKeys?.set(sig,key);return key;}

    try{
      const canvas=document.createElement('canvas');canvas.width=renderW;canvas.height=renderH;
      const ctx=canvas.getContext('2d');if(!ctx)return null;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const xs=p.map(q=>q.x),ys=p.map(q=>q.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY);
      const pad=Math.min(renderW,renderH)*(hero?.10:.115),scale=Math.min((renderW-pad*2)/bw,(renderH-pad*2)/bh),ox=(renderW-bw*scale)/2-minX*scale,oy=(renderH-bh*scale)/2-minY*scale;
      const rawWidth=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160),road=Math.max(hero?24:14,rawWidth*scale);
      const seed=seedFrom(String(track?.key||track?.id||'track')),rand=rng(seed);
      const dirt=dirtTrack(track);

      const bg=ctx.createRadialGradient(renderW*.52,renderH*.44,20,renderW*.5,renderH*.5,Math.max(renderW,renderH)*.7);
      if(dirt){bg.addColorStop(0,'#253d2d');bg.addColorStop(.58,'#172c20');bg.addColorStop(1,'#08130e');}
      else{bg.addColorStop(0,'#243e32');bg.addColorStop(.58,'#152b23');bg.addColorStop(1,'#07130f');}
      ctx.fillStyle=bg;ctx.fillRect(0,0,renderW,renderH);

      // Low-cost deterministic terrain grain: makes every preview feel rendered,
      // while keeping the real circuit geometry untouched.
      const specks=hero?1100:260;
      for(let i=0;i<specks;i++){
        const x=rand()*renderW,y=rand()*renderH,r=(hero?.65:.45)+rand()*(hero?1.6:.8);
        ctx.globalAlpha=.035+rand()*.055;ctx.fillStyle=rand()>.5?(dirt?'#b29a68':'#7da276'):'#07110d';ctx.fillRect(x,y,r,r);
      }
      ctx.globalAlpha=1;
      const vignette=ctx.createRadialGradient(renderW/2,renderH/2,Math.min(renderW,renderH)*.28,renderW/2,renderH/2,Math.max(renderW,renderH)*.68);
      vignette.addColorStop(.35,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.50)');ctx.fillStyle=vignette;ctx.fillRect(0,0,renderW,renderH);

      const path=()=>{ctx.beginPath();ctx.moveTo(p[0].x*scale+ox,p[0].y*scale+oy);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x*scale+ox,p[i].y*scale+oy);ctx.closePath();ctx.lineCap='round';ctx.lineJoin='round';};
      ctx.save();ctx.shadowColor='rgba(0,0,0,.72)';ctx.shadowBlur=hero?18:8;ctx.shadowOffsetY=hero?7:3;path();ctx.strokeStyle='rgba(0,0,0,.78)';ctx.lineWidth=road*1.42;ctx.stroke();ctx.restore();

      if(dirt){
        path();ctx.strokeStyle='#332a20';ctx.lineWidth=road*1.24;ctx.stroke();
        path();ctx.strokeStyle='#765b3d';ctx.lineWidth=road*1.10;ctx.stroke();
        path();ctx.strokeStyle='#a17d52';ctx.lineWidth=road*.94;ctx.stroke();
        path();ctx.strokeStyle='rgba(229,190,128,.14)';ctx.lineWidth=road*.52;ctx.stroke();
        path();ctx.setLineDash([Math.max(3,road*.22),Math.max(5,road*.38)]);ctx.strokeStyle='rgba(65,43,29,.28)';ctx.lineWidth=Math.max(1.2,road*.06);ctx.stroke();ctx.setLineDash([]);
      }else{
        path();ctx.strokeStyle='#10171a';ctx.lineWidth=road*1.28;ctx.stroke();
        path();ctx.strokeStyle='#d9dddc';ctx.lineWidth=road*1.105;ctx.stroke();
        path();ctx.strokeStyle='#30383c';ctx.lineWidth=road*.985;ctx.stroke();
        path();ctx.strokeStyle='#424b50';ctx.lineWidth=road*.76;ctx.stroke();
        path();ctx.strokeStyle='rgba(255,255,255,.075)';ctx.lineWidth=road*.42;ctx.stroke();
        // restrained red/white outer curb cue; subtle enough for thumbnails
        path();ctx.setLineDash([Math.max(4,road*.22),Math.max(4,road*.22)]);ctx.strokeStyle='rgba(214,61,55,.55)';ctx.lineWidth=Math.max(2,road*.07);ctx.stroke();ctx.setLineDash([]);
      }

      // Finish line anchored to the real first segment.
      const a=p[0],b=p[1],ax=a.x*scale+ox,ay=a.y*scale+oy,ang=Math.atan2((b.y-a.y)*scale,(b.x-a.x)*scale),cells=hero?10:7;
      ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);const across=road*.88,cellH=across/cells,cellW=Math.max(hero?5:3.5,road*.075);
      for(let col=0;col<3;col++)for(let row=0;row<cells;row++){ctx.fillStyle=((col+row)&1)?'#11181a':'#f1f3ef';ctx.fillRect((col-1.5)*cellW,-across/2+row*cellH,cellW+.8,cellH+.8);}ctx.restore();

      // A very soft cyan glow ties previews into the rest of the game's UI.
      ctx.globalCompositeOperation='screen';path();ctx.strokeStyle='rgba(67,220,255,.055)';ctx.lineWidth=road*1.34;ctx.stroke();ctx.globalCompositeOperation='source-over';

      this.textures.addCanvas(key,canvas);this._premiumPreviewKeys?.set(sig,key);this._ownedPremiumTextureKeys?.add(key);return key;
    }catch{return null;}
  }
}
