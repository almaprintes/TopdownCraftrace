import { RaceScene as CurrentRaceScene } from './RaceLeftHandedControlsScene.js';

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
    const old=document.getElementById('tdr-steering-wheel');
    old?.remove?.();
    const p=prefs();
    const left=!!p.leftHanded;
    const style=document.createElement('style');
    style.id='tdr-steering-wheel-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick{display:none!important}
      #tdr-steering-wheel{position:fixed;z-index:80;${left?'right':'left'}:max(22px,2vw);bottom:max(18px,2.7vh);width:clamp(112px,14vw,152px);aspect-ratio:1;border-radius:50%;pointer-events:auto;touch-action:none;opacity:.88;filter:drop-shadow(0 7px 16px rgba(0,0,0,.28));}
      #tdr-steering-wheel .rim{position:absolute;inset:5%;border-radius:50%;border:10px solid rgba(210,225,240,.44);box-shadow:inset 0 0 0 2px rgba(7,19,30,.9),0 0 0 2px rgba(90,205,255,.12),0 0 18px rgba(80,190,255,.10);background:radial-gradient(circle,rgba(20,36,50,.13) 0 53%,transparent 54%);transform:rotate(var(--rot,0deg));transition:transform 55ms linear,filter 80ms linear}
      #tdr-steering-wheel.active .rim{filter:brightness(1.22)}
      #tdr-steering-wheel .hub{position:absolute;left:50%;top:50%;width:28%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 38% 34%,#dcecff,#7398b5 48%,#22394b 72%);border:2px solid rgba(255,255,255,.28)}
      #tdr-steering-wheel .spoke{position:absolute;left:50%;top:50%;width:38%;height:8px;background:linear-gradient(90deg,rgba(215,230,242,.7),rgba(89,119,142,.75));transform-origin:0 50%}
      #tdr-steering-wheel .s1{transform:translateY(-50%) rotate(0deg)}#tdr-steering-wheel .s2{transform:translateY(-50%) rotate(120deg)}#tdr-steering-wheel .s3{transform:translateY(-50%) rotate(240deg)}
    `;
    document.head.appendChild(style);
    const wheel=document.createElement('div');
    wheel.id='tdr-steering-wheel';
    wheel.innerHTML='<div class="rim"><i class="spoke s1"></i><i class="spoke s2"></i><i class="spoke s3"></i><i class="hub"></i></div>';
    document.body.appendChild(wheel);
    const rim=wheel.querySelector('.rim');
    let activeId=null;
    const apply=(clientX)=>{
      const r=wheel.getBoundingClientRect();
      const cx=r.left+r.width/2;
      const norm=Math.max(-1,Math.min(1,(clientX-cx)/(r.width*.48)));
      const sens=Math.max(.4,Math.min(1.4,Number(prefs().sensitivity||1)));
      const inv=prefs().invertSteer===true?-1:1;
      const steer=Math.max(-1,Math.min(1,norm*sens*inv));
      if(this.touch){this.touch.stickX=steer;this.touch.stickY=0;this.touch.steer=steer;this.touch.leftActive=true;}
      rim?.style?.setProperty('--rot',`${steer*105}deg`);
    };
    const down=e=>{activeId=e.pointerId;wheel.setPointerCapture?.(e.pointerId);wheel.classList.add('active');apply(e.clientX);e.preventDefault();};
    const move=e=>{if(activeId!==e.pointerId)return;apply(e.clientX);e.preventDefault();};
    const up=e=>{if(activeId!==e.pointerId)return;activeId=null;wheel.classList.remove('active');if(this.touch){this.touch.stickX=0;this.touch.stickY=0;this.touch.steer=0;this.touch.leftActive=false;}rim?.style?.setProperty('--rot','0deg');e.preventDefault();};
    wheel.addEventListener('pointerdown',down,{passive:false});
    wheel.addEventListener('pointermove',move,{passive:false});
    wheel.addEventListener('pointerup',up,{passive:false});
    wheel.addEventListener('pointercancel',up,{passive:false});
    this.events.once('shutdown',()=>{wheel.removeEventListener('pointerdown',down);wheel.removeEventListener('pointermove',move);wheel.removeEventListener('pointerup',up);wheel.removeEventListener('pointercancel',up);wheel.remove();document.getElementById('tdr-steering-wheel-style')?.remove();});
  }
}
