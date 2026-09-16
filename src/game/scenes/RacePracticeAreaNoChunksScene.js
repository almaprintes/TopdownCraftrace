import { RaceScene as CurrentRaceScene } from './RacePracticeAreaScene.js';

const PRACTICE_KEY='practice-area';
const MODE_KEY='tdr2:gameMode';

// Practice was retired from the shipping mode selector. A legacy saved
// `tdr2:gameMode=practice` must never reactivate its race wrappers when a real
// mode (timeattack/ghost/duel) launches. Only an explicit legacy/dev launch may
// opt into the old practice runtime.
function isPractice(data){
  return data?.gameMode==='practice';
}

function retireStalePracticeMode(data){
  if(data?.gameMode==='practice')return;
  try{
    if(localStorage.getItem(MODE_KEY)!=='practice')return;
    const incoming=String(data?.gameMode||'').trim();
    if(incoming)localStorage.setItem(MODE_KEY,incoming);
    else localStorage.removeItem(MODE_KEY);
    console.info('[TDR2] retired stale practice gameMode before race init',{incoming:incoming||null});
  }catch{}
}

function hideCell(cell){
  for(const key of ['tile','overlay','stroke','maskG','maskGraphics','container']){
    try{cell?.[key]?.setVisible?.(false);}catch{}
  }
  try{cell?.mask?.setVisible?.(false);}catch{}
}

export class RaceScene extends CurrentRaceScene{
  init(data){
    retireStalePracticeMode(data);
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
      for(const cell of gfx.values())hideCell(cell);
    }

    // Área de Pruebas no usa el renderer por celdas. Ocultamos sus objetos,
    // pero NO los destruimos: otras capas del RaceScene pueden conservar una
    // referencia durante este frame y Phaser deja geom=null tras destroy().
    track.gfxByCell=new Map();
    track.activeCells=new Set();
    track.cullRadiusCells=0;

    // Vacío válido en vez de null para consumidores tardíos del motor base.
    if(track.geom){
      track.geom.cells=new Map();
      if(track.geom.grass)track.geom.grass.cells=new Map();
    }

    this._aheadVisible=new Set();
    this._applyDirectionalLookahead=()=>{};
    this._centerlineLookaheadCells=()=>new Set();
  }
}
