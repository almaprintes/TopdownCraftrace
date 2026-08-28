import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// Small UX layer over the season pass DOM. The base dock is intentionally compact,
// but when a CLAIM button appears its content can exceed the fixed dock height and
// be clipped at the bottom on short/mobile landscape viewports.
export class SeasonScene extends BaseSeasonScene {
  _mount(){
    super._mount();
    const style=document.getElementById('tdr-season-dom-style');
    if(!style)return;
    style.textContent+=`
#tdr-season-dom .detail-dock{bottom:max(14px,calc(env(safe-area-inset-bottom,0px) + 8px))}
#tdr-season-dom .detail-dock:has(.claim){height:90px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:6px;padding-bottom:6px}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:38px}
#tdr-season-dom .detail-dock:has(.claim) .claim{height:26px;min-height:26px;flex:0 0 26px;margin-top:2px}
@media(max-height:520px){
  #tdr-season-dom .detail-dock{bottom:max(12px,calc(env(safe-area-inset-bottom,0px) + 6px))}
  #tdr-season-dom .detail-dock:has(.claim){height:82px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:32px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{height:24px;min-height:24px;flex-basis:24px}
}
`;
  }
}
