import { RaceScene as CurrentRaceScene } from './RacePracticeAreaScene.js';

const PRACTICE_KEY='practice-area';
const MODE_KEY='tdr2:gameMode';

function isPractice(data){
  if(data?.gameMode==='practice')return true;
  try{return localStorage.getItem(MODE_KEY)==='practice';}catch{return false;}
}

function destroyCell(cell){
  for(const key of ['tile','overlay','stroke','maskG','maskGraphics','container']){
    try{cell?.[key]?.destroy?.();}catch{}
  }
  try{cell?.mask?.destroy?.();}catch{}
}

export class RaceScene extends CurrentRaceScene{
  init(data){
    const practice=isPractice(data);
    let savedTrack=null;
    let hadSaved=false;

    if(practice){
      try{
        hadSaved=localStorage.getItem('tdr2:trackKey')!==null;
        savedTrack=localStorage.getItem('tdr2:trackKey');
      }catch{}
    }

    super.init?.(data);
    this._practiceAreaMode=practice;

    if(practice){
      // El RaceScene base filtra trackKey antes de create(). Área de Pruebas es
      // un modo especial, así que imponemos su mundo aquí sin sustituir la
      // selección normal de circuito persistida por el jugador.
      this.trackKey=PRACTICE_KEY;
      try{
        if(hadSaved)localStorage.setItem('tdr2:trackKey',savedTrack);
        else localStorage.removeItem('tdr2:trackKey');
      }catch{}
    }
  }

  create(data){
    const result=super.create(data);
    if(this._practiceAreaMode)this._stripPracticeChunks();
    return result;
  }

  _stripPracticeChunks(){
    const track=this.track;
    if(!track)return;

    const gfx=track.gfxByCell;
    if(gfx?.values){
      for(const cell of gfx.values())destroyCell(cell);
    }

    // El mundo libre ya tiene sus cuatro superficies grandes. No necesita el
    // ribbon técnico ni el culling por celdas de un circuito de carrera.
    track.gfxByCell=new Map();
    track.activeCells=new Set();
    track.cullRadiusCells=0;

    if(track.geom){
      track.geom.cells=null;
      if(track.geom.grass)track.geom.grass.cells=null;
    }

    this._aheadVisible=new Set();
    this._applyDirectionalLookahead=()=>{};
    this._centerlineLookaheadCells=()=>new Set();
  }
}
