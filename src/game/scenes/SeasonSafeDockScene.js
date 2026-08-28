import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// UX layer over the season pass DOM. Keep the reward CTA comfortably inside
// the visible landscape viewport, including devices with a bottom safe area.
export class SeasonScene extends BaseSeasonScene {
  _mount(){
    super._mount();
    const style=document.getElementById('tdr-season-dom-style');
    if(!style)return;
    style.textContent+=`
#tdr-season-dom .detail-dock{bottom:max(24px,calc(env(safe-area-inset-bottom,0px) + 14px))}
#tdr-season-dom .detail-dock:has(.claim){height:102px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:6px;padding-bottom:6px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){justify-content:flex-start}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:38px;min-height:38px;flex:0 0 38px}
#tdr-season-dom .detail-dock:has(.claim) .claim{display:block;width:100%;height:28px;min-height:28px;flex:0 0 28px;margin-top:4px;margin-bottom:0}
@media(max-height:520px){
  #tdr-season-dom .detail-dock{bottom:max(18px,calc(env(safe-area-inset-bottom,0px) + 10px))}
  #tdr-season-dom .detail-dock:has(.claim){height:94px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:32px;min-height:32px;flex-basis:32px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{height:26px;min-height:26px;flex-basis:26px;margin-top:3px}
}
`;
  }
}
