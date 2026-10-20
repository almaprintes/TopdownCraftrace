import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGaragePlayerLightScene.js';
import { showFirstVisitTutorial } from '../ui/FirstVisitTutorial.js';
import { ensureSelectionPaddockSkin } from '../ui/selectionPaddockSkin.js';
import { attachCenteredSelectionRail } from '../ui/centeredSelectionRail.js';
import { pxToMeters } from '../cars/speedUnits.js';
import {TENERIFE_LEGACY_ID,circuitVariantFor,selectedCircuitRaceId,readCircuitDirection,saveCircuitDirection} from '../tracks/trackReverseVariant.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';

const ROOT_ID='tdr-track-selector-dom';
const TAP_MOVE_PX=14;
const TAP_TIME_MS=650;

function canonicalLengthM(track){const p=(track?.raceCenterline?.length?track.raceCenterline:track?.centerline)||[];let d=0;const end=track?.closed===false?p.length-1:p.length;for(let i=0;i<end;i++){const a=p[i],b=p[(i+1)%p.length];const ax=Number(a?.x??a?.[0]),ay=Number(a?.y??a?.[1]),bx=Number(b?.x??b?.[0]),by=Number(b?.y??b?.[1]);if([ax,ay,bx,by].every(Number.isFinite))d+=Math.hypot(bx-ax,by-ay);}return Math.max(0,Math.round(pxToMeters(d)));}
function syncCanonicalLengths(root,tracks,index){if(!root)return;root.querySelectorAll('.tdr-ts-card').forEach((card,i)=>{const meta=card.querySelector('.tdr-ts-card-meta'),track=tracks?.[i];if(!meta||!track||card.classList.contains('locked'))return;meta.innerHTML=meta.innerHTML.replace(/\d+\s*m\s*·/,`${canonicalLengthM(track)} m ·`);});const firstStat=root.querySelector('.tdr-ts-stat strong'),selected=tracks?.[index];if(firstStat&&selected&&!root.querySelector('.tdr-ts-locked-hero'))firstStat.textContent=`${canonicalLengthM(selected)} m`;}

export class TrackGarageScene extends CurrentTrackGarageScene {
  create(...args){
    super.create(...args);
    showFirstVisitTutorial('tracks',{delay:260});
  }

  _selectTrackCard(index){
    const i=Math.max(0,Math.min(this._tracks.length-1,Number(index)||0));
    if(i===this._index){
      this._centeredTrackRail?.center(i,'smooth');
      return;
    }
    this._index=i;
    // Rebuild the authoritative hero/locked state, but restore the old rail
    // position BEFORE smoothly centering the newly selected circuit.
    this._nextRailBehavior='smooth';
    this._installDomSelector();
  }

  _installDomSelector(){
    const previous=this._centeredTrackRail;
    const oldTop=previous?.list?.scrollTop;
    previous?.destroy();
    this._centeredTrackRail=null;
    const behavior=this._nextRailBehavior||'instant';
    this._nextRailBehavior=null;
    super._installDomSelector?.();
    const root=this._trackSelectorDom||document.getElementById(ROOT_ID);
    if(!root)return;
    if(this._mode!=='admin')ensureSelectionPaddockSkin();
    syncCanonicalLengths(root,this._tracks,this._index);
    // Each physical circuit occupies ONE selector card. Choose the racing
    // direction inside the hero, and keep historical IDs untouched.
    root.querySelectorAll('.tdr-ts-card').forEach((card,i)=>{
      const id=this._tracks?.[i]?.key;
      if(!circuitVariantFor(id))return;
      const normalId=id===TENERIFE_LEGACY_ID?'karting-tenerife-horario':id;
      const label=card.querySelector('.tdr-ts-card-title');
      if(label&&!card.classList.contains('locked'))
        label.textContent=getTrackPublicName(normalId);
    });
    const selected=this._tracks?.[this._index];
    const base=selected?.key;
    const spec=circuitVariantFor(base);
    if(spec&&!root.querySelector('.tdr-ts-locked-hero')){
      const header=root.querySelector('.tdr-ts-hero-head');
      if(header){
        const cssId='tdr-terrace-direction-selector-style';
        if(!document.getElementById(cssId)){
          const sheet=document.createElement('style');sheet.id=cssId;
          sheet.textContent='#tdr-track-selector-dom .tdr-ts-route-modes{display:flex;gap:7px;justify-content:center;align-items:center;margin:8px auto 0;max-width:min(490px,100%)}#tdr-track-selector-dom .tdr-ts-route-modes button{flex:1;min-width:0;min-height:34px;border:1px solid #36566d;border-radius:8px;background:#132337;color:#b9d6e7;font:800 10px system-ui,-apple-system,sans-serif;letter-spacing:.02em;padding:4px 7px;touch-action:manipulation}#tdr-track-selector-dom .tdr-ts-route-modes button[aria-pressed="true"]{border-color:#2bff88;background:#163d35;color:#d6ffe8}#tdr-track-selector-dom .tdr-ts-hero-head:has(.tdr-ts-route-modes){padding-top:6px;padding-bottom:4px}@media(max-height:520px){#tdr-track-selector-dom .tdr-ts-route-modes{margin-top:3px}#tdr-track-selector-dom .tdr-ts-route-modes button{min-height:28px;font-size:9px}}';
          document.head.appendChild(sheet);
        }
        const row=document.createElement('div');row.className='tdr-ts-route-modes';
        row.setAttribute('role','group');
        const lang=document.documentElement.lang==='en'?'en':'es';
        row.setAttribute('aria-label',lang==='en'?'Race direction':'Sentido de circulación');
        const normal=spec.base===TENERIFE_LEGACY_ID?'clockwise':spec.legacy;
        const glyph=normal==='clockwise'?'↻':'↺',opposite=normal==='clockwise'?'↺':'↻';
        const choices=[
          ['normal',glyph+' '+(lang==='en'?'NORMAL':'NORMAL')],
          ['inverse',opposite+' '+(lang==='en'?'REVERSE':'INVERSO')]
        ];
        const update=()=>{
          const current=readCircuitDirection(localStorage,base);
          const selectedId=selectedCircuitRaceId(base,localStorage);
          const publicName=getTrackPublicName(selectedId);
          for(const button of row.querySelectorAll('button'))
            button.setAttribute('aria-pressed',String(button.dataset.raceDirection===current));
          const title=root.querySelector('.tdr-ts-hero-name');
          const caption=root.querySelector('.tdr-ts-hero-caption');
          if(title)title.textContent=publicName;
          if(caption)caption.textContent=publicName;
        };
        for(const [value,label] of choices){
          const btn=document.createElement('button');btn.type='button';btn.dataset.raceDirection=value;
          btn.textContent=label;row.appendChild(btn);
          btn.addEventListener('click',event=>{
            event.preventDefault();event.stopPropagation();
            saveCircuitDirection(localStorage,base,value);
            update();
          });
        }
        update();
        header.appendChild(row);
      }
    }

    this._centeredTrackRail=attachCenteredSelectionRail(root,{
      listSelector:'.tdr-ts-list',
      itemSelector:'.tdr-ts-card',
      onSettle:index=>{
        if(index===this._index)return;
        this._index=index;
        this._nextRailBehavior='instant';
        this._installDomSelector();
      }
    });
    const rail=this._centeredTrackRail;
    if(Number.isFinite(oldTop))rail?.restore(oldTop);
    requestAnimationFrame(()=>{if(rail===this._centeredTrackRail)rail?.center(this._index,behavior);});
    if(root.__tdrPointerTapInstalled)return;
    root.__tdrPointerTapInstalled=true;

    let down=null;
    let suppressClickUntil=0;

    const actionable=(target)=>target?.closest?.('[data-index],.tdr-ts-select,.tdr-ts-back')||null;

    root.addEventListener('pointerdown',(e)=>{
      if(e.pointerType==='mouse')return;
      const action=actionable(e.target);
      if(!action)return;
      down={pointerId:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),action};
    },{passive:true});

    root.addEventListener('pointercancel',(e)=>{if(down?.pointerId===e.pointerId)down=null;},{passive:true});

    root.addEventListener('pointerup',(e)=>{
      if(e.pointerType==='mouse'||!down||down.pointerId!==e.pointerId)return;
      const start=down;down=null;
      const dx=e.clientX-start.x,dy=e.clientY-start.y;
      const moved=Math.hypot(dx,dy);
      const elapsed=performance.now()-start.t;
      const action=actionable(e.target);
      if(!action||action!==start.action||moved>TAP_MOVE_PX||elapsed>TAP_TIME_MS)return;

      suppressClickUntil=performance.now()+500;
      e.preventDefault();
      e.stopPropagation();

      if(action.matches('[data-index]')){
        this._selectTrackCard(action.dataset.index);
        return;
      }
      if(action.matches('.tdr-ts-select')){
        if(!action.disabled)this._launchSelected?.();
        return;
      }
      if(action.matches('.tdr-ts-back'))this.scene.start('menu');
    },{passive:false});

    root.addEventListener('click',(e)=>{
      if(performance.now()<suppressClickUntil&&actionable(e.target)){
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // Selection centering is handled by _selectTrackCard for both pointer and mouse.
    });
  }
}
