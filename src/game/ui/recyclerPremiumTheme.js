// The existing recycler/dismantle styles are created dynamically when a
// screen opens. Keep this shared skin AFTER their legacy styles in <head>
// so both views use the same premium visual language, without touching
// exchange rates, saved state, rewarded ads, dismantling, or quantities.
import css from './recycler-premium.css?inline';

const STYLE_ID='tdr-recycler-premium-theme';
export function applyRecyclerPremiumTheme(){
  if(typeof document==='undefined')return;
  let style=document.getElementById(STYLE_ID);
  if(!style){
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=css;
  }
  // PartDismantleDom may inject its original CSS after MaterialExchangeDom.
  // Always keep our theme last; moving a style node does not duplicate CSS.
  document.head.appendChild(style);
}
