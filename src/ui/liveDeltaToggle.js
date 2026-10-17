const DELTA_PANEL_ID='tdr-live-delta-panel';
const CONTROL_ID='tdr-race-hud-control';

let enabled=false;
let pendingApply=0;
let lastPanel=null;
let originalPause=null;
let lastStructuralPoll=0;
let lastRace=false;
let pauseRect=null;
let preserveEnabledThroughPause=false;

function raceControlsRoot(){
  return document.getElementById('tdr-race-controls');
}

function isRaceVisible(){
  const controls=raceControlsRoot();
  const hud=document.querySelector('.tdr-race-hud');
  if(!controls?.isConnected||!hud?.isConnected)return false;
  const controlStyle=getComputedStyle(controls);
  const hudStyle=getComputedStyle(hud);
  if(controlStyle.display==='none'||controlStyle.visibility==='hidden')return false;
  if(hudStyle.display==='none'||hudStyle.visibility==='hidden'||Number(hudStyle.opacity)===0)return false;
  if(document.getElementById('tdrStartup'))return false;
  if(document.querySelector('.session-report,.race-report,[data-session-report],#session-report'))return false;
  if(document.querySelector('.veil .modal .report'))return false;
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
  // The original pause button is stable for a race. Reacquire after a scene
  // replaces it, not every rendered frame or every panel refresh.
  if(originalPause?.isConnected)return originalPause;
  const replacement=[...document.querySelectorAll('button')].find(isPauseButton)||null;
  if(replacement!==originalPause)pauseRect=null;
  originalPause=replacement;
  return replacement;
}

function retireLegacyDomDelta(scope=document.body){
  // Full-body scan is only needed at boot. After that inspect ONLY newly
  // attached subtrees or a text node that has changed into DELTA.
  if(!scope||scope.nodeType!==1)return;
  const elements=scope===document.body?scope.querySelectorAll('*'):[scope,...scope.querySelectorAll('*')];
  for(const el of elements){
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
    if(target.style.getPropertyValue('display')!=='none'||target.style.getPropertyPriority('display')!=='important')
      target.style.setProperty('display','none','important');
  }
}

function rememberAndHideOriginalPause(){
  const pause=findPauseButton();
  if(!pause)return null;
  if(!pauseRect){
    const rect=pause.getBoundingClientRect?.();
    if(rect&&rect.width>20&&rect.height>20)pauseRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};
  }
  if(pause.dataset.tdrOriginalPause!=='1')pause.dataset.tdrOriginalPause='1';
  if(pause.style.getPropertyValue('opacity')!=='0'||pause.style.getPropertyPriority('opacity')!=='important')pause.style.setProperty('opacity','0','important');
  if(pause.style.getPropertyValue('pointer-events')!=='none'||pause.style.getPropertyPriority('pointer-events')!=='important')pause.style.setProperty('pointer-events','none','important');
  if(pause.style.getPropertyValue('visibility')!=='hidden'||pause.style.getPropertyPriority('visibility')!=='important')pause.style.setProperty('visibility','hidden','important');
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
    flex:'1 1 50%',minWidth:'0',height:'100%',border:'0',margin:'0',padding:'0 12px',background:'transparent',
    color:'rgba(255,255,255,.78)',font:'900 11px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    letterSpacing:'.12em',touchAction:'none',WebkitUserSelect:'none',userSelect:'none',cursor:'pointer'
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
    position:'fixed',zIndex:'2147483100',display:'none',alignItems:'stretch',overflow:'hidden',borderRadius:'16px',
    border:'1px solid rgba(255,255,255,.24)',background:'linear-gradient(180deg,rgba(15,20,30,.94),rgba(7,11,19,.90))',
    boxShadow:'0 5px 18px rgba(0,0,0,.32)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
    touchAction:'none',WebkitUserSelect:'none',userSelect:'none'
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
        touchHandled=true;e.preventDefault();e.stopPropagation();fn();
      }
    },{capture:true,passive:false});
    button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(touchHandled){touchHandled=false;return;}fn();
    },{capture:true});
  };

  arm(delta,()=>{enabled=!enabled;apply();});
  arm(pause,()=>{
    preserveEnabledThroughPause=true;
    fireOriginalPause();
  });
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
  const android=/Android/i.test(navigator.userAgent||'');
  const inheritedRight=base?Math.max(8,vw-Number(base.right)):18;
  // Android three-button/edge-to-edge layouts leave the legacy pause anchor too far left,
  // overlapping LAST/BEST. Move only the combined DELTA+pause control toward the right edge.
  const right=android?Math.max(8,inheritedRight-72):inheritedRight;
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
  const noReference=String(value?.textContent||'').toUpperCase().includes('SIN REFERENCIA');
  // Delta values update frequently; only a transition to/from "SIN REFERENCIA"
  // or replacement of a child needs typography writes.
  const previous=panel._tdrPolishState;
  if(previous&&previous.noReference===noReference&&previous.label===label&&previous.value===value&&previous.state===state&&previous.rail===rail)return;
  panel._tdrPolishState={noReference,label,value,state,rail};
  if(label){
    label.style.fontSize='7px';
    label.style.lineHeight='1.05';
    label.style.letterSpacing='.14em';
    label.style.whiteSpace='normal';
  }
  if(state){
    state.style.fontSize='7px';
    state.style.lineHeight='1.05';
    state.style.letterSpacing='.09em';
    state.style.whiteSpace='normal';
  }
  if(value){
    value.style.fontSize=noReference?'15px':'20px';
    value.style.lineHeight='1.0';
    value.style.letterSpacing=noReference?'.01em':'.025em';
    value.style.whiteSpace='normal';
    value.style.wordBreak='normal';
  }
  if(rail)rail.style.marginTop='5px';
}

function setPanelContentVisible(panel,visible){
  if(!panel)return;
  for(const child of [...panel.children]){
    child.style.setProperty('transition','opacity .10s ease','important');
    child.style.setProperty('opacity',visible?'1':'0','important');
  }
}

function positionPanel(panel,control,race){
  if(!panel||!control)return;
  const cr=control.getBoundingClientRect();
  const peek=Math.max(7,Math.round(cr.height*.14));
  const right=Math.max(8,window.innerWidth-cr.right);
  const top=Math.round(cr.bottom-peek);
  panel.style.setProperty('position','fixed','important');
  panel.style.setProperty('width',`${Math.round(cr.width)}px`,'important');
  panel.style.setProperty('min-width','0','important');
  panel.style.setProperty('max-width',`${Math.round(cr.width)}px`,'important');
  panel.style.setProperty('left','auto','important');
  panel.style.setProperty('right',`${Math.round(right)}px`,'important');
  panel.style.setProperty('top',`${top}px`,'important');
  panel.style.setProperty('padding','9px 10px 8px','important');
  panel.style.setProperty('border-radius','0 0 12px 12px','important');
  panel.style.setProperty('overflow','hidden','important');
  panel.style.setProperty('transform-origin','top right','important');
  panel.style.setProperty('transition','transform .24s cubic-bezier(.2,.8,.2,1), opacity .16s ease','important');
  panel.style.setProperty('z-index','2147483050','important');

  if(!race){
    setPanelContentVisible(panel,false);
    panel.style.setProperty('transform',`translateY(calc(-100% + ${peek}px))`,'important');
    panel.style.setProperty('opacity','0','important');
    panel.style.setProperty('visibility','hidden','important');
    return;
  }

  panel.style.setProperty('visibility','visible','important');
  panel.style.setProperty('opacity','1','important');
  if(enabled){
    panel.style.setProperty('transform','translateY(0)','important');
    setPanelContentVisible(panel,true);
  }else{
    setPanelContentVisible(panel,false);
    panel.style.setProperty('transform',`translateY(calc(-100% + ${peek}px))`,'important');
  }
}

function apply(){
  const root=makeControl();
  const panel=document.getElementById(DELTA_PANEL_ID);
  const race=isRaceVisible();
  const controls=raceControlsRoot();
  const hud=document.querySelector('.tdr-race-hud');

  const panelChanged=panel!==lastPanel;
  if(race&&(panelChanged||race!==lastRace||root.style.display!=='flex'||!pauseRect||!originalPause?.isConnected))positionControl(root);
  lastPanel=panel;

  if(race&&preserveEnabledThroughPause){
    preserveEnabledThroughPause=false;
  }else if(!race&&lastRace&&!preserveEnabledThroughPause){
    enabled=false;
  }else if(!race&&preserveEnabledThroughPause&&(!controls?.isConnected||!hud?.isConnected)){
    preserveEnabledThroughPause=false;
    enabled=false;
  }

  lastRace=race;
  const display=race?'flex':'none';
  if(root.style.display!==display)root.style.display=display;

  const delta=root.querySelector('[data-tdr-delta-segment]');
  if(delta){
    const aria=enabled?'true':'false',color=enabled?'#58e8ff':'rgba(255,255,255,.78)',bg=enabled?'rgba(88,232,255,.10)':'transparent';
    if(delta.getAttribute('aria-pressed')!==aria)delta.setAttribute('aria-pressed',aria);
    if(delta.style.color!==color)delta.style.color=color;
    if(delta.style.background!==bg)delta.style.background=bg;
  }

  if(panel){
    const flag=enabled?'1':'0';
    if(panel.dataset.tdrUserDeltaEnabled!==flag)panel.dataset.tdrUserDeltaEnabled=flag;
    polishPanel(panel);
    positionPanel(panel,root,race);
  }
}

// DOM observer is intentionally childList-only. The previous full-body
// style/class observer reacted to the styles written by apply() itself and
// to unrelated race telemetry on almost every animation frame.
const STRUCTURAL_SELECTORS=[
  '#tdr-race-controls','.tdr-race-hud',`#${DELTA_PANEL_ID}`,
  '#tdrStartup','.session-report','.race-report','[data-session-report]',
  '#session-report','[data-tdr-session-rewards]','#tdr-session-rewards',
  '.veil','.modal','button'
].join(',');
function matchesStructural(node){
  if(!node||node.nodeType!==1)return false;
  if(node.id===CONTROL_ID||node.closest?.(`#${CONTROL_ID}`))return false;
  if(node.matches?.(STRUCTURAL_SELECTORS))return true;
  return !!node.querySelector?.(STRUCTURAL_SELECTORS);
}
function scheduleApply(){
  if(pendingApply)return;
  pendingApply=setTimeout(()=>{pendingApply=0;apply();},0);
}
function onMutations(records){
  let needsApply=false;
  for(const mutation of records){
    // A delta label changes live during a lap: polish its typography only
    // if the content mode switched. Do not re-layout its panel per digit.
    const target=mutation.target;
    if(target?.closest?.(`#${DELTA_PANEL_ID}`)){
      const panel=document.getElementById(DELTA_PANEL_ID);
      if(panel)polishPanel(panel);
      continue;
    }
    // Ignore text churn from Ghost, timers, game diagnostics, native HTML
    // text bridges and every other subtree unrelated to these controls.
    for(const node of mutation.addedNodes){
      if(node.nodeType===3){
        if(String(node.textContent||'').trim().toUpperCase()==='DELTA')
          retireLegacyDomDelta(node.parentElement);
        continue;
      }
      if(node.nodeType!==1)continue;
      if(!node.closest?.(`#${CONTROL_ID}`)){
        if(String(node.textContent||'').includes('DELTA'))retireLegacyDomDelta(node);
        if(matchesStructural(node))needsApply=true;
      }
    }
    for(const node of mutation.removedNodes){
      if(matchesStructural(node)){needsApply=true;break;}
    }
  }
  if(needsApply)scheduleApply();
}

function boot(){
  enabled=false;
  preserveEnabledThroughPause=false;
  makeControl();
  retireLegacyDomDelta();
  const observer=new MutationObserver(onMutations);
  observer.observe(document.body,{childList:true,subtree:true});
  const relayout=()=>{pauseRect=null;apply();};
  window.addEventListener('resize',relayout,{passive:true});
  window.addEventListener('orientationchange',relayout,{passive:true});
  window.addEventListener('tdr:viewportchange',relayout,{passive:true});
  window.addEventListener('pageshow',relayout,{passive:true});
  apply();
  // Fallback for ancestor display changes that do not attach/remove nodes.
  // Poll for state transitions ONLY; never walk body or write layout each tick.
  setInterval(()=>{
    if(document.hidden)return;
    const race=isRaceVisible(),panel=document.getElementById(DELTA_PANEL_ID);
    if(race!==lastRace||panel!==lastPanel||(!originalPause&&race&&Date.now()-lastStructuralPoll>2000)){
      lastStructuralPoll=Date.now();
      apply();
    }
  },450);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
