import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderSurfaceDepthScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _fitRealTrack(){
    const t=this._realTrack;
    if(!t||!this._editCam)return;

    const pts=(t.centerline||[])
      .map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)})
      .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(!pts.length)return;

    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of pts){
      minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);
      maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);
    }

    const trackW=Math.max(40,Number(t.trackWidth)||100);
    const grass=Math.max(0,Number(t.grassMargin)||0);
    const pad=Math.max(180,trackW*2.6,grass*.45);
    minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;

    const bw=Math.max(200,maxX-minX),bh=Math.max(200,maxY-minY);
    const fitX=this._editCam.width/bw;
    const fitY=this._editCam.height/bh;
    // No artificial 0.1 floor: very large circuits must be allowed to fit.
    const z=Math.max(0.012,Math.min(2.5,Math.min(fitX,fitY)*0.90));

    this._editCam.setZoom(z);
    this._editCam.centerOn((minX+maxX)/2,(minY+maxY)/2);
  }

  _openRealTrack(trackId,resetProject=true){
    super._openRealTrack(trackId,resetProject);
    const t=this._realTrack;
    if(!t||!this._editCam)return;

    const w=Math.max(1200,Number(t.worldW)||this._editorWorldW||8000);
    const h=Math.max(900,Number(t.worldH)||this._editorWorldH||5000);
    this._editorWorldW=w;
    this._editorWorldH=h;
    this._editCam.setBounds(0,0,w,h);
    this._fitRealTrack();
  }

  _zoom(m){
    if(!this._editCam)return;
    const current=Number(this._editCam.zoom)||1;
    const next=Math.max(0.012,Math.min(4,current*Number(m||1)));
    this._editCam.setZoom(next);
    if(this._selectedSurface)this._drawSelection?.();
  }
}
