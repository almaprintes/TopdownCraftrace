// RACE CONTROL 2.0 — DEV-only entry adapter.
// Keep the existing Stats/Race Control scene and data pipeline fully intact.
// No extra inheritance layer is added to the driving scene.
import { StatsScene as PreviousStatsScene } from './StatsTesterExchangeScene.js';
import { getLanguage } from '../i18n/index.js';
import { mountRaceControlHub } from '../ui/raceControlHub.js';
import { mountRaceControlDirectory } from '../ui/raceControlDirectory.js';

export class StatsScene extends PreviousStatsScene {
  create(data) {
    // The main lobby always supplies raceControlTrackId to jump directly into
    // the old leaderboard. Strip that *only* for DEV hub entry so the inherited
    // StatsBroadcastRealReplayScene does not schedule a delayed direct render.
    // Preserve the selected track for when the player chooses Clasificaciones.
    const onlineEntry=data?.onlineFromLobby===true && data?.statsView!=='overview';
    this._rc2PreferredTrack=onlineEntry?String(data?.raceControlTrackId||''):null;
    // Preserve the exact NORMAL/INVERSO circuit and selected car across scenes.
    this._rc2LiveTrack=onlineEntry?String(data?.liveTrackId||this._rc2PreferredTrack||''):null;
    this._rc2LiveCar=onlineEntry?String(data?.liveCarId||''):null;
    super.create(onlineEntry?{...data,raceControlTrackId:'',statsView:'overview'}:data);
    this.events.once('shutdown', () => this._disposeRaceControlHub());
    this.events.once('destroy', () => this._disposeRaceControlHub());
    if(onlineEntry) this._showRaceControlHub();
    // Revancha returns to RACE CONTROL with a NEW authorized waiting room.
    // This runs only on explicit host proposal or human acceptance; no auto
    // consent and no reuse of the previous locked grid/result rows.
    if(onlineEntry&&data?.live4RematchRoom?.id){
      const next=data.live4RematchRoom;
      void import('../ui/craftraceLiveV2Lobby.js').then(({openCrafRaceLiveV2Lobby})=>{
        if(!this.scene?.isActive?.()||!this._root?.isConnected)return;
        openCrafRaceLiveV2Lobby(this,{trackId:next.track_id,
          carId:this._rc2LiveCar||next.car_id,
          initialRoom:next,rematchExpectedHumans:data.live4RematchExpectedHumans||1});
      }).catch(error=>console.error('[LIVE 4] Could not open rematch lobby',error));
    }
  }

  _disposeRaceControlHub() {
    this._rc2Dispose?.();
    this._rc2Dispose = null;
  }

  _installBroadcastTab() {
    super._installBroadcastTab();
    const btn=this._root?.querySelector('.br-records-tab');
    if(!btn || btn.dataset.rc2Bound==='1')return;
    btn.dataset.rc2Bound='1';
    // Intercept only a deliberate tap on the RACE CONTROL button; leave all
    // internal calls to _renderBroadcastRecords and their async refreshes untouched.
    btn.addEventListener('click',event=>{
      event.preventDefault();event.stopImmediatePropagation();
      this._showRaceControlHub();
    },true);
  }

  _showRaceControlHub() {
    if(!this._root)return;
    this._stopRaceControlReplay?.();
    this._disposeRaceControlHub();
    this._rc2Visited=true;
    this._rc2FromProfile=false;
    this._rc2Dispose=mountRaceControlHub(this._root,{
      language:getLanguage(),
      onExit:()=>this._onlineFromLobby?this.scene.start('menu'):this._renderCars(),
      onAction:action=>{
        if(action==='multiplayer'){
          // Keep the hub mounted beneath the dialog. Closing LIVE must return
          // to a fully working Race Control panel, not an inert preview.
          if(this._rc2LiveOpening)return;
          this._rc2LiveOpening=true;
          void import('../ui/craftraceLiveLobby.js').then(({openCrafRaceLiveLobby})=>{
            if(!this.scene?.isActive?.()||!this._root?.isConnected||
               !this._root.querySelector('.tdr-rc2'))return;
            openCrafRaceLiveLobby(this,{
              trackId:this._rc2LiveTrack||this._rc2PreferredTrack||null,
              carId:this._rc2LiveCar||null
            });
          }).catch(error=>{
            console.error('[Race Control] Could not open CraftRace Live',error);
            const note=this._root?.querySelector('.rc2-footer-note');
            if(note)note.textContent='NO SE PUDO ABRIR MULTIJUGADOR. VUELVE A INTENTARLO.';
          }).finally(()=>{this._rc2LiveOpening=false;});
          return;
        }
        this._disposeRaceControlHub();
        switch(action){
          case 'rankings':
          case 'ghosts':
            this._renderBroadcastRecords(this._rc2PreferredTrack||null);
            break;
          case 'pilots':
          case 'circuits':
          case 'events':
            this._showRaceControlDirectory(action);
            break;
          case 'seasons':
            this.scene.start('season');
            break;
          default:break; // Upcoming features never launch fake rooms/events.
        }
      }
    });
  }

  _showRaceControlDirectory(type) {
    if(!this._root)return;
    this._disposeRaceControlHub();
    this._rc2Dispose=mountRaceControlDirectory(this._root,{
      type,language:getLanguage(),
      onBack:()=>this._showRaceControlHub(),
      onTrack:trackId=>this._renderBroadcastRecords(trackId)
    });
  }

  _renderBroadcastRecords(trackId=null) {
    this._disposeRaceControlHub();
    super._renderBroadcastRecords(trackId);
    if(!this._rc2Visited)return;
    const back=this._root?.querySelector('.sh-back');
    if(back && back.dataset.rc2Back!=='1'){
      back.dataset.rc2Back='1';
      back.addEventListener('click',event=>{
        event.preventDefault();event.stopImmediatePropagation();
        this._showRaceControlHub();
      },true);
    }
  }

  _renderCars() {
    this._disposeRaceControlHub();
    super._renderCars();
    if(!this._rc2FromProfile)return;
    const back=this._root?.querySelector('.sh-back');
    if(back && back.dataset.rc2Back!=='1'){
      back.dataset.rc2Back='1';
      back.addEventListener('click',event=>{
        event.preventDefault();event.stopImmediatePropagation();
        this._showRaceControlHub();
      },true);
    }
  }
}
