// RACE CONTROL 2.0 — DEV-only entry adapter.
// Keep the existing Stats/Race Control scene and data pipeline fully intact.
// No extra inheritance layer is added to the driving scene.
import { StatsScene as PreviousStatsScene } from './StatsTesterExchangeScene.js';
import { getLanguage } from '../i18n/index.js';
import { mountRaceControlHub } from '../ui/raceControlHub.js';

export class StatsScene extends PreviousStatsScene {
  create(data) {
    // A replay returning to an exact track must bypass the decorative hub.
    let pendingReplayReturn = false;
    try { pendingReplayReturn = !!sessionStorage.getItem('tdr2:statsReturnTrack'); } catch {}
    super.create(data);
    this.events.once('shutdown', () => this._disposeRaceControlHub());
    this.events.once('destroy', () => this._disposeRaceControlHub());
    if(data?.onlineFromLobby === true &&
       data?.statsView !== 'overview' &&
       !data?.raceControlTrackId &&
       !pendingReplayReturn) this._showRaceControlHub();
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
        this._disposeRaceControlHub();
        switch(action){
          case 'rankings':
          case 'ghosts':
            this._renderBroadcastRecords();
            break;
          case 'pilots':
          case 'cars':
            this._rc2FromProfile=true;
            this._renderCars();
            break;
          case 'seasons':
            this.scene.start('season');
            break;
          default:break; // Upcoming features never launch fake rooms/events.
        }
      }
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
