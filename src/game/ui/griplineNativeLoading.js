// CSS-only animation for the required native-track photo decoding gate.
// Based on the approved right-facing Avenir Gripline side profile.
const STYLE_ID = 'tdr-native-gripline-loading-style';
const CSS = [
  '#tdr-native-gate .tdr-native-gripline-loading{width:100%;margin:0 auto 10px;pointer-events:none}',
  '#tdr-native-gate .tdr-native-gripline-rig{position:relative;width:min(76vw,540px);aspect-ratio:974/357;margin:0 auto;isolation:isolate}',
  '#tdr-native-gate .tdr-native-gripline-car{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:3}',
  '#tdr-native-gate .tdr-native-gripline-wheel{position:absolute;top:75%;width:15.2%;aspect-ratio:1;z-index:2;transform:translate(-50%,-50%)}',
  '#tdr-native-gate .tdr-native-gripline-wheel.rear{left:19.2%}',
  '#tdr-native-gate .tdr-native-gripline-wheel.front{left:81%}',
  '#tdr-native-gate .tdr-native-gripline-wheel img{display:block;width:100%;height:100%;object-fit:contain;animation:tdr-gripline-wheel-spin .26s linear infinite}',
  '#tdr-native-gate .tdr-native-gripline-road{position:absolute;left:0;right:0;top:94.5%;height:8px;overflow:hidden;opacity:.94;z-index:1;filter:drop-shadow(0 0 4px rgba(90,202,241,.28))}',
  '#tdr-native-gate .tdr-native-gripline-road i{position:absolute;left:-120px;top:0;width:calc(100% + 240px);height:100%;background:repeating-linear-gradient(90deg,transparent 0 18px,#62abc9 18px 92px,transparent 92px 120px);animation:tdr-gripline-road-left .24s linear infinite}',
  // Motion trails stay BEHIND the right-facing car; no car translation and
  // no extra frame/update loops. Only compositor-friendly transforms animate.
  '#tdr-native-gate .tdr-native-gripline-speed{position:absolute;z-index:1;left:-10%;top:38%;width:68%;height:48%;overflow:hidden;opacity:.82;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent,#000 17%,#000 78%,transparent);mask-image:linear-gradient(90deg,transparent,#000 17%,#000 78%,transparent)}',
  '#tdr-native-gate .tdr-native-gripline-speed:before,#tdr-native-gate .tdr-native-gripline-speed:after{content:"";position:absolute;left:0;width:calc(100% + 168px);height:3px;background:repeating-linear-gradient(90deg,transparent 0 28px,rgba(117,207,239,.88) 28px 108px,transparent 108px 168px);animation:tdr-gripline-trail-left .31s linear infinite}',
  '#tdr-native-gate .tdr-native-gripline-speed:before{top:19%}',
  '#tdr-native-gate .tdr-native-gripline-speed:after{top:73%;height:2px;opacity:.7;animation-duration:.41s;animation-delay:-.17s}',
  '#tdr-native-gate.tdr-native-gate-error .tdr-native-gripline-loading{display:none}',
  '@keyframes tdr-gripline-wheel-spin{to{transform:rotate(360deg)}}',
  '@keyframes tdr-gripline-road-left{to{transform:translate3d(-120px,0,0)}}',
  '@keyframes tdr-gripline-trail-left{to{transform:translate3d(-168px,0,0)}}',
  '@media(prefers-reduced-motion:reduce){#tdr-native-gate .tdr-native-gripline-wheel img,#tdr-native-gate .tdr-native-gripline-road i,#tdr-native-gate .tdr-native-gripline-speed:before,#tdr-native-gate .tdr-native-gripline-speed:after{animation:none}}'
].join('\n');

export function mountGriplineNativeLoading(panel) {
  if (typeof document === 'undefined' || !panel) return;
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  const root = document.createElement('div');
  root.className = 'tdr-native-gripline-loading';
  root.setAttribute('aria-hidden', 'true');
  const rig = document.createElement('div');
  rig.className = 'tdr-native-gripline-rig';
  const road = document.createElement('div');
  road.className = 'tdr-native-gripline-road';
  road.appendChild(document.createElement('i'));
  const speed = document.createElement('div');
  speed.className = 'tdr-native-gripline-speed';
  const base = import.meta.env?.BASE_URL || '/';
  const wheelUrl = base + 'assets/ui/loading/gripline-loader-wheel.webp';
  const wheel = spot => {
    const holder = document.createElement('span');
    holder.className = 'tdr-native-gripline-wheel ' + spot;
    const image = document.createElement('img');
    image.src = wheelUrl;
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    holder.appendChild(image);
    return holder;
  };
  const car = document.createElement('img');
  car.className = 'tdr-native-gripline-car';
  car.src = base + 'assets/ui/loading/gripline-loader-body.webp';
  car.alt = '';
  car.decoding = 'async';
  car.draggable = false;
  rig.append(road, speed, wheel('rear'), wheel('front'), car);
  root.append(rig);
  panel.prepend(root);
}
