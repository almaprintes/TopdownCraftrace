import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderInputFixScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupInput() {
    super._setupInput();

    this._freePan = null;

    const isWorldAsset = (obj) => !!obj?._env;
    const pointerInsideEditor = (p) => {
      if (typeof this._inside === 'function') return this._inside(p);
      return p.x >= this._vx && p.x <= this._vx + this._vw && p.y >= this._vy && p.y <= this._vy + this._vh;
    };
    const cameraBounds = () => {
      const cam=this._editCam;
      const b=cam?._bounds;
      const minX=Number.isFinite(Number(b?.x))?Number(b.x):0;
      const minY=Number.isFinite(Number(b?.y))?Number(b.y):0;
      const worldW=Math.max(1,Number(b?.width)||Number(this._editorWorldW)||8000);
      const worldH=Math.max(1,Number(b?.height)||Number(this._editorWorldH)||5000);
      const zoom=Math.max(.0001,Number(cam?.zoom)||1);
      const visibleW=Number(cam?.width||0)/zoom;
      const visibleH=Number(cam?.height||0)/zoom;
      return {minX,minY,maxX:Math.max(minX,minX+worldW-visibleW),maxY:Math.max(minY,minY+worldH-visibleH)};
    };
    const clampCamera=()=>{
      const cam=this._editCam;if(!cam)return;
      const b=cameraBounds();
      cam.scrollX=Math.max(b.minX,Math.min(b.maxX,cam.scrollX));
      cam.scrollY=Math.max(b.minY,Math.min(b.maxY,cam.scrollY));
    };

    this.input.on('pointerdown', (pointer, currentlyOver = []) => {
      if (this._mode !== 'select') return;
      if (!pointerInsideEditor(pointer)) return;
      if (this._pinching || this._suppressSinglePanUntilAllUp) return;
      if (Array.isArray(currentlyOver) && currentlyOver.some(isWorldAsset)) return;

      this._freePan = {pointerId:pointer.id,x:pointer.x,y:pointer.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};
    });

    this.input.on('pointermove', (pointer) => {
      const pan = this._freePan;
      if (!pan || !pointer.isDown || pointer.id !== pan.pointerId || this._pinching || this._suppressSinglePanUntilAllUp) return;
      const zoom = Math.max(0.0001, this._editCam.zoom || 1);
      const dx = (pointer.x - pan.x) / zoom;
      const dy = (pointer.y - pan.y) / zoom;
      this._editCam.scrollX = pan.scrollX - dx;
      this._editCam.scrollY = pan.scrollY - dy;
      clampCamera();
    });

    const stop = (pointer) => {
      if (!this._freePan) return;
      if (pointer && pointer.id !== this._freePan.pointerId) return;
      this._freePan = null;
      clampCamera();
    };

    this.input.on('pointerup', stop);
    this.input.on('pointerupoutside', stop);
  }
}
