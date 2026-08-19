import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderEditablesMenuScene.js';

const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch{return null;}};
const sig=v=>{try{return JSON.stringify(v||{});}catch{return '';}};

export class EnvironmentBuilderScene extends Current{
  create(){
    this._undoApplying=false;
    this._undoStack=[];
    this._undoPendingBefore=null;
    this._undoDebounce=null;
    super.create();
    this._installUndoButton();
    this._undoObserved=clone(this._project?.()||{});
    this._undoObservedSig=sig(this._undoObserved);
    this._startUndoHistory();
  }

  // Recovery stays available, but no longer occupies the surface-width row.
  _installRecoveryUi(){
    this._placeHint?.setVisible?.(false);
    const {width}=this.scale,rx=width-this._right+14,y=this._top+100,w=this._right-28;
    const b=this.add.rectangle(rx,y,w,18,0x142231,1).setOrigin(0)
      .setStrokeStyle(1,0x45dfff,.68).setInteractive({useHandCursor:true}).setDepth(61500);
    const t=this.add.text(rx+7,y+9,'RECUPERAR AUTOGUARDADO',{fontFamily:'system-ui',fontSize:'7px',fontStyle:'bold',color:'#bfeeff'}).setOrigin(0,.5).setDepth(61501);
    this._recoveryInfo=this.add.text(rx+w-7,y+9,'',{fontFamily:'system-ui',fontSize:'7px',color:'#7f97aa'}).setOrigin(1,.5).setDepth(61501);
    this._editCam?.ignore([b,t,this._recoveryInfo]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._restoreRecovery?.();});
    try{const r=JSON.parse(localStorage.getItem(this._recoveryKey())||'null');if(r?.savedAt)this._refreshRecoveryInfo(r.savedAt);}catch{}
  }

  _installUndoButton(){
    const x=10,y=this._top+18;
    // Sits exactly above the old exit/back control and owns its hit area.
    const b=this.add.rectangle(x,y,44,38,0x172034,1).setOrigin(0)
      .setStrokeStyle(2,0xe1b33b,.95).setInteractive({useHandCursor:true}).setDepth(70000);
    const t=this.add.text(x+22,y+19,'↶',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(70001);
    this._undoBadge=this.add.text(x+39,y+5,'',{fontFamily:'system-ui',fontSize:'7px',fontStyle:'bold',color:'#ffd65c'}).setOrigin(1,0).setDepth(70002);
    this._editCam?.ignore([b,t,this._undoBadge]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._undoLast();});
    this._refreshUndoBadge();
  }

  _startUndoHistory(){
    this._undoPoll=this.time.addEvent({delay:180,loop:true,callback:()=>this._observeUndoState()});
    this.events.once('shutdown',()=>{try{this._undoPoll?.remove?.();this._undoDebounce?.remove?.();}catch{}});
  }

  _observeUndoState(){
    if(this._undoApplying)return;
    const now=clone(this._project?.()||{});if(!now)return;
    const nowSig=sig(now);if(nowSig===this._undoObservedSig)return;
    if(!this._undoPendingBefore)this._undoPendingBefore=clone(this._undoObserved);
    this._undoObserved=now;this._undoObservedSig=nowSig;
    try{this._undoDebounce?.remove?.();}catch{}
    this._undoDebounce=this.time.delayedCall(420,()=>this._commitUndoPending());
  }

  _commitUndoPending(){
    if(!this._undoPendingBefore)return;
    const before=this._undoPendingBefore;this._undoPendingBefore=null;
    if(sig(before)!==this._undoObservedSig){
      this._undoStack.push(before);
      if(this._undoStack.length>40)this._undoStack.shift();
      this._refreshUndoBadge();
    }
  }

  _undoLast(){
    // If the last gesture has just ended, make it immediately undoable.
    this._observeUndoState();
    if(this._undoPendingBefore)this._commitUndoPending();
    const prev=this._undoStack.pop();
    if(!prev){this._builderToast?.('NADA QUE DESHACER');this._flash?.('NADA QUE DESHACER');return;}
    this._undoApplying=true;
    this._selected=this._selectedSurface=this._selRail=null;
    this._selectionG?.clear?.();
    this._applyProject?.(clone(prev));
    this.time.delayedCall(0,()=>{
      this._undoObserved=clone(this._project?.()||{});
      this._undoObservedSig=sig(this._undoObserved);
      this._undoPendingBefore=null;
      this._undoApplying=false;
      this._refreshUndoBadge();
      this._builderToast?.('ÚLTIMO CAMBIO DESHECHO');
      this._flash?.('ÚLTIMO CAMBIO DESHECHO');
    });
  }

  _refreshUndoBadge(){this._undoBadge?.setText?.(this._undoStack.length?String(this._undoStack.length):'');}

  _openRealTrack(trackId,resetProject=true){
    super._openRealTrack(trackId,resetProject);
    if(this._undoStack)this.time.delayedCall(0,()=>{
      this._undoStack=[];this._undoPendingBefore=null;
      this._undoObserved=clone(this._project?.()||{});this._undoObservedSig=sig(this._undoObserved);
      this._refreshUndoBadge();
    });
  }
}
