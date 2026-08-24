import { RaceScene as CurrentRaceScene } from './RaceLeftHandedControlsScene.js';
import { GENERATED_WHEEL_ASSET } from '../ui/generatedWheelAsset.js';

const SETTINGS_KEY='tdr2:settings';
function prefs(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}catch{return {};}}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrWheelMode=prefs().steeringMode==='wheel';
    const result=super.create(data);
    if(this._tdrWheelMode)this._buildSteeringWheel();
    return result;
  }

  _buildSteeringWheel(){
    document.getElementById('tdr-steering-wheel')?.remove?.();
    document.getElementById('tdr-steering-wheel-style')?.remove?.();
    const p=prefs();
    const left=!!p.leftHanded;
    const style=document.createElement('style');
    style.id='tdr-steering-wheel-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick{display:none!important}
      #tdr-steering-wheel{position:fixed;z-index:80;${left?'right':'left'}:max(18px,1.8vw);bottom:max(10px,1.8vh);width:clamp(142px,17vw,194px);aspect-ratio:320/277;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,.42));}
      #tdr-steering-wheel .art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;opacity:.96;transition:filter 80ms linear}
      #tdr-steering-wheel.active .art{filter:brightness(1.08)}
      #tdr-steering-wheel .steer-cue{position:absolute;left:50%;top:3.5%;width:7px;height:18px;border-radius:5px;background:#18a7ff;box-shadow:0 0 8px rgba(24,167,255,.8);transform:translateX(calc(-50% + var(--cue,0px)));transition:transform 55ms ease-out;pointer-events:none}
    `;
    document.head.appendChild(style);

    const wheel=document.createElement('div');
    wheel.id='tdr-steering-wheel';
    wheel.innerHTML=`<img class="art" src="${GENERATED_WHEEL_ASSET}" alt=""><i class="steer-cue"></i>`;
    document.body.appendChild(wheel);

    let activeId=null;
    let startX=0;
    let steer=0;

    const setSteer=(value)=>{
      const current=prefs();
      const sens=Math.max(.4,Math.min(1.4,Number(current.sensitivity||1)));
      const inv=current.invertSteer===true?-1:1;
      steer=Math.max(-1,Math.min(1,value*sens*inv));
      if(this.touch){
        this.touch.stickX=steer;
        this.touch.stickY=0;
        this.touch.steer=steer;
        this.touch.leftActive=Math.abs(steer)>.01;
      }
      const cue=Math.round(steer*Math.max(24,wheel.clientWidth*.27));
      wheel.style.setProperty('--cue',`${cue}px`);
    };

    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      startX=e.clientX;
      wheel.setPointerCapture?.(e.pointerId);
      wheel.classList.add('active');
      setSteer(0);
      e.preventDefault();
    };

    const move=e=>{
      if(activeId!==e.pointerId)return;
      const r=wheel.getBoundingClientRect();
      const travel=Math.max(46,r.width*.42);
      setSteer((e.clientX-startX)/travel);
      e.preventDefault();
    };

    const release=e=>{
      if(activeId!==e.pointerId)return;
      try{wheel.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;
      startX=0;
      wheel.classList.remove('active');
      setSteer(0);
      e.preventDefault();
    };

    wheel.addEventListener('pointerdown',down,{passive:false});
    wheel.addEventListener('pointermove',move,{passive:false});
    wheel.addEventListener('pointerup',release,{passive:false});
    wheel.addEventListener('pointercancel',release,{passive:false});
    wheel.addEventListener('lostpointercapture',release,{passive:false});

    this.events.once('shutdown',()=>{
      wheel.removeEventListener('pointerdown',down);
      wheel.removeEventListener('pointermove',move);
      wheel.removeEventListener('pointerup',release);
      wheel.removeEventListener('pointercancel',release);
      wheel.removeEventListener('lostpointercapture',release);
      if(this.touch){this.touch.stickX=0;this.touch.stickY=0;this.touch.steer=0;this.touch.leftActive=false;}
      wheel.remove();
      document.getElementById('tdr-steering-wheel-style')?.remove();
    });
  }
}
