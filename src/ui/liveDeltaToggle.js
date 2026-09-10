const DELTA_PANEL_ID='tdr-live-delta-panel';
const CONTROL_ID='tdr-race-hud-control';

let enabled=false;
let raf=0;
let lastRace=false;
let pauseRect=null;

function raceControlsRoot(){
  return document.getElementById('tdr-race-controls');
}

function isRaceVisible(){
  const controls=raceControlsRoot();
  const hud=document.querySelector('.tdr-race-hud');
  if(!controls?.isConnected||!hud?.isConnected)return false;
  const style=getComputedStyle(controls);
  if(style.display==='none'||style.visibility==='hidden')return false;
  if(document.getElementById('tdrStartup'))return false;
  if(document.querySelector('.session-report,.race-report,[data-session-report],#session-report'))return false;
  if(document.querySelector('[data-tdr-session-rewards],#tdr-session-rewards'))return false;
  return true;
}

function isPauseButton(button){
  if(!button||button.id===CONTROL_ID||button.closest?.(`#${CONTROL_ID}`))return false;
  if(button.dataset.tdrOriginalPause==='1')return true;
  const text=String(button.textContent||'').replace(/\s+/g,'').toUpperCase();
  const meta=`${button.getAttribute('aria-label')||''} ${button.title||''}`.toUpperCase();
  return /PAUSA|PAUSE/.test(meta)||text==='Ⅱ'||text==='II'||text==='||'||text==='⏸';
}

function findPauseButton(){
  return [...document.querySelectorAll('button')].find(isPauseButton)||null;
}

function retireLegacyDomDelta(){
  for(const el of [...document.querySelectorAll('body *')]){
    if(el.id===CONTROL_ID||el.closest?.(`#${CONTROL_ID}`)||el.closest?.(`#${DELTA_PANEL_ID}`))continue;
    if(el.children?.length)continue;
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
    if(text!=='DELTA')continue;
    let target=el;
    const parent=el.parentElement;
    if(parent){
      const ptext=String(parent.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      if(ptext.length<=24&&!/\bLAST\b|\bBEST\b/.test(ptext))target=parent;
    }
    target.style.setProperty('display','none','important');
  }
}

function rememberAndHideOriginalPause(){
  const pause=findPauseButton();
  if(!pause)return null;
  pause.dataset.tdrOriginalPause='1';
  const rect=pause.getBoundingClientRect?.();
  if(rect&&rect.width>20&&rect.height>20)pauseRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};
  pause.style.setProperty('opacity','0','important');
  pause.style.setProperty('pointer-events','none','important');
  pause.style.setProperty('visibility','hidden','important');
  return pause;
}

function fireOriginalPause(){
  const pause=findPauseButton();
  if(!pause)return;
  try{pause.click();}catch{}
}

function makeSegment(label,aria){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.setAttribute('aria-label',aria);
  Object.assign(button.style,{
    flex:'1 1 50%',
    minWidth:'0',
    height:'100%',
    border:'0',
    margin:'0',
    padding:'0 12px',
    background:'transparent',
    color:'rgba(255,255,255,.78)',
    font:'900 11px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    letterSpacing:'.12em',
    touchAction:'none',
    WebkitUserSelect:'none',
    userSelect:'none',
    cursor:'pointer'
  });
  return button;
}

function makeControl(){
  let root=document.getElementById(CONTROL_ID);
  if(root)return root;
  root=document.createElement('div');
  root.id=CONTROL_ID;
  root.setAttribute('role','group');
  root.setAttribute('aria-label','Controles de carrera');
  Object.assign(root.style,{
    position:'fixed',
    zIndex:'2147483100',
    display:'none',
    alignItems:'stretch',
    overflow:'hidden',
    borderRadius:'16px',
    border:'1px solid rgba(255,255,255,.24)',
    background:'linear-gradient(180deg,rgba(15,20,30,.94),rgba(7,11,19,.90))',
    boxShadow:'0 5px 18px rgba(0,0,0,.32)',
    backdropFilter:'blur(8px)',
    WebkitBackdropFilter:'blur(8px)',
    touchAction:'none',
    WebkitUserSelect:'none',
    userSelect:'none'
  });

  const delta=makeSegment('DELTA','Mostrar u ocultar delta de vuelta');
  delta.dataset.tdrDeltaSegment='1';
  delta.setAttribute('aria-pressed','false');
  const divider=document.createElement('div');
  Object.assign(divider.style,{width:'1px',background:'rgba(255,255,255,.18)',alignSelf:'stretch',pointerEvents:'none'});
  const pause=makeSegment('Ⅱ','Pausa');
  pause.dataset.tdrPauseSegment='1';
  pause.style.fontSize='20px';
  pause.style.letterSpacing='0';

  const arm=(button,fn)=>{
    let touchHandled=false;
    button.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'||e.pointerType==='pen'){
        touchHandled=true;
        e.preventDefault();e.stopPropagation();
        fn();
      }
    },{capture:true,passive:false});
    button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(touchHandled){touchHandled=false;return;}
      fn();
    },{capture:true});
  };

  arm(delta,()=>{enabled=!enabled;apply();});
  arm(pause,()=>fireOriginalPause());
  root.append(delta,divider,pause);
  document.body.appendChild(root);
  return root;
}

function positionControl(root){
  rememberAndHideOriginalPause();
  const vv=window.visualViewport;
  const vw=Math.max(1,Number(vv?.width||window.innerWidth||document.documentElement.clientWidth||1));
  const base=pauseRect;
  const h=Math.max(48,Math.min(62,Number(base?.height)||56));
  const w=Math.max(132,Math.min(160,h*2.45));
  const right=base?Math.max(8,vw-Number(base.right)):18;
  const top=base?Math.max(8,Number(base.top)):18;
  root.style.width=`${Math.round(w)}px`;
  root.style.height=`${Math.round(h)}px`;
  root.style.right=`${Math.round(right)}px`;
  root.style.top=`${Math.round(top)}px`;
  root.style.borderRadius=`${Math.round(h*.32)}px`;
}

function polishPanel(panel){
  if(!panel)return;
  const kids=[...panel.children];
  const label=kids[0],value=kids[1],state=kids[2],rail=kids[3];
  const estimated=String(label?.textContent||'').toUpperCase().includes('ESTIMACIÓN');
  if(estimated&&label&&value&&state){
    label.textContent='VS MEJOR DE SESIÓN';
    value.textContent='SIN REFERENCIA';
    value.style.color='#ffffff';
    value.style.fontSize='clamp(18px, 2.1vw, 25px)';
    state.textContent='COMPLETA UNA VUELTA';
    state.style.color='rgba(255,255,255,.72)';
    if(rail){
      rail.style.opacity='.45';
      const marker=rail.lastElementChild;
      if(marker){marker.style.left='50%';marker.style.background='#ffffff';}
    }
  }else if(value&&rail){
    value.style.fontSize='clamp(22px, 2.55vw, 31px)';
    rail.style.opacity='1';
  }
}

function positionPanel(panel,control){
  if(!panel||!control)return;
  const cr=control.getBoundingClientRect();
  const width=Math.max(220,Math.min(310,cr.width*2.15));
  const right=Math.max(8,window.innerWidth-cr.right);
  const top=Math.round(cr.bottom+3);
  panel.style.setProperty('position','fixed','important');
  panel.style.setProperty('width',`${Math.round(width)}px`,'important');
  panel.style.setProperty('min-width','0','important');
  panel.style.setProperty('left','auto','important');
  panel.style.setProperty('right',`${Math.round(right)}px`,'important');
  panel.style.setProperty('top',`${top}px`,'important');
  panel.style.setProperty('transform-origin','top right','important');
  panel.style.setProperty('transition','transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease','important');
  panel.style.setProperty('z-index','2147483050','important');
  if(enabled&&isRaceVisible()){
    panel.style.setProperty('visibility','visible','important');
    panel.style.setProperty('transform','translateY(0)','important');
    panel.style.setProperty('opacity','1','important');
  }else{
    panel.style.setProperty('transform','translateY(calc(-100% - 6px))','important');
    panel.style.setProperty('opacity','0','important');
    panel.style.setProperty('visibility','hidden','important');
  }
}

function apply(){
  const root=makeControl();
  const panel=document.getElementById(DELTA_PANEL_ID);
  const race=isRaceVisible();

  retireLegacyDomDelta();
  if(race)positionControl(root);
  if(!race&&lastRace)enabled=false;
  lastRace=race;
  root.style.display=race?'flex':'none';

  const delta=root.querySelector('[data-tdr-delta-segment]');
  if(delta){
    delta.setAttribute('aria-pressed',enabled?'true':'false');
    delta.style.color=enabled?'#58e8ff':'rgba(255,255,255,.78)';
    delta.style.background=enabled?'rgba(88,232,255,.10)':'transparent';
  }

  if(panel){
    panel.dataset.tdrUserDeltaEnabled=enabled?'1':'0';
    polishPanel(panel);
    positionPanel(panel,root);
  }
}

function frame(){
  const panel=document.getElementById(DELTA_PANEL_ID);
  const root=document.getElementById(CONTROL_ID);
  const race=isRaceVisible();
  retireLegacyDomDelta();
  if(root){
    if(race)positionControl(root);
    else root.style.display='none';
  }
  if(panel&&root){polishPanel(panel);positionPanel(panel,root);}
  raf=requestAnimationFrame(frame);
}

function boot(){
  enabled=false;
  makeControl();
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('orientationchange',apply,{passive:true});
  window.addEventListener('tdr:viewportchange',apply,{passive:true});
  apply();
  if(!raf)raf=requestAnimationFrame(frame);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
