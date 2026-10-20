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
  '#tdr-native-gate .tdr-native-gripline-wheel img{display:block;width:100%;height:100%;object-fit:contain;animation:tdr-gripline-wheel-spin .8s linear infinite}',
  '#tdr-native-gate .tdr-native-gripline-road{position:absolute;left:0;right:0;top:95%;height:5px;overflow:hidden;opacity:.74;z-index:1}',
  '#tdr-native-gate .tdr-native-gripline-road i{position:absolute;left:-120px;top:0;width:calc(100% + 240px);height:100%;background:repeating-linear-gradient(90deg,transparent 0 34px,#397e99 34px 93px,transparent 93px 120px);animation:tdr-gripline-road-left .65s linear infinite}',
  '#tdr-native-gate.tdr-native-gate-error .tdr-native-gripline-loading{display:none}',
  '@keyframes tdr-gripline-wheel-spin{to{transform:rotate(360deg)}}',
  '@keyframes tdr-gripline-road-left{to{transform:translate3d(-120px,0,0)}}',
  '@media(prefers-reduced-motion:reduce){#tdr-native-gate .tdr-native-gripline-wheel img,#tdr-native-gate .tdr-native-gripline-road i{animation:none}}'
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
  rig.append(road, wheel('rear'), wheel('front'), car);
  root.append(rig);
  panel.prepend(root);
}
