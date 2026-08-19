import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderUndoScene.js';

export class EnvironmentBuilderScene extends Current{
  create(){
    this._surfaceCreationArmed=false;
    this._linearCreationArmed=false;
    super.create();
  }

  _disarmCreation(){
    this._surfaceCreationArmed=false;
    this._linearCreationArmed=false;
    this._surfaceStart=null;
    this._linearStart=null;
    this._railStart=null;
  }

  _chooseAsphalt(){
    this._disarmCreation();
    this._surfaceCreationArmed=true;
    super._chooseAsphalt?.();
  }

  _chooseLinear(def){
    this._disarmCreation();
    this._linearCreationArmed=true;
    super._chooseLinear?.(def);
  }

  _select(obj){
    this._disarmCreation();
    super._select?.(obj);
    this._mode='select';
  }

  _selectSurface(s){
    this._disarmCreation();
    super._selectSurface?.(s);
    this._mode='select';
  }

  _selectRail(s){
    this._disarmCreation();
    super._selectRail?.(s);
    this._mode='select';
  }

  _addSurface(a,b,width,physics,data=null){
    // Never allow a stale inherited `surface` mode to create geometry.
    if(!this._surfaceCreationArmed){
      this._surfaceStart=null;
      this._mode='select';
      return;
    }
    super._addSurface?.(a,b,width,physics,data);
    // One deliberate activation creates one segment. Re-arm from EDITABLES.
    this._surfaceCreationArmed=false;
    this._surfaceStart=null;
    this._mode='select';
  }

  _setupInput(){
    super._setupInput();

    // The inherited linear-barrier handler checks only `_mode`. If that mode
    // ever survives accidentally, neutralize it unless the tool was explicitly armed.
    this.input.on('pointerdown',()=>{
      if(this._mode==='linear-barrier'&&!this._linearCreationArmed){
        this._linearStart=null;
        this._mode='select';
      }
      if(this._mode==='surface'&&!this._surfaceCreationArmed){
        this._surfaceStart=null;
        this._mode='select';
      }
    });

    this.input.on('pointerup',()=>{
      // Once a newly-created linear element has been selected by the inherited
      // handler, creation must be considered finished.
      if(this._linearCreationArmed&&this._mode==='select'){
        this._linearCreationArmed=false;
        this._linearStart=null;
      }
    });
  }

  _applyProject(p){
    this._disarmCreation();
    super._applyProject?.(p);
    this._mode='select';
  }
}
