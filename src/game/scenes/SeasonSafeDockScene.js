import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// UX layer over the season pass DOM. When a reward is claimable, give the
// bottom dock enough real space for title + reward + CTA instead of letting
// the fixed-height cell clip the button on short landscape viewports.
export class SeasonScene extends BaseSeasonScene {
  _mount(){
    super._mount();
    const style=document.getElementById('tdr-season-dom-style');
    if(!style)return;
    style.textContent+=`
#tdr-season-dom .detail-dock{bottom:max(28px,calc(env(safe-area-inset-bottom,0px) + 18px))}
#tdr-season-dom .detail-dock:has(.claim){height:124px;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:8px;padding-bottom:8px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){
  display:grid;
  grid-template-rows:10px 48px 30px;
  align-content:center;
  row-gap:4px;
  overflow:visible;
}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3) .detail-kicker{align-self:center}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:48px;min-height:48px;margin:0;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .claim{display:block;width:100%;height:30px;min-height:30px;margin:0;padding:0 10px;align-self:end}
@media(max-height:520px){
  #tdr-season-dom .detail-dock{bottom:max(22px,calc(env(safe-area-inset-bottom,0px) + 14px))}
  #tdr-season-dom .detail-dock:has(.claim){height:112px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:6px;padding-bottom:6px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){grid-template-rows:9px 42px 28px;row-gap:3px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:42px;min-height:42px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{height:28px;min-height:28px}
}
`;
  }
}
