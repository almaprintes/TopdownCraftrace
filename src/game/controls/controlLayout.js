const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

const STEERING_DEFAULTS={
  stick:{steer:{x:.11,y:.77,scale:1}},
  wheel:{steer:{x:.115,y:.76,scale:1}},
  buttons:{left:{x:.085,y:.78,scale:1},right:{x:.19,y:.78,scale:1}}
};

function viewportSize(){
  const w=Math.max(320,Number(globalThis.innerWidth)||844);
  const h=Math.max(240,Number(globalThis.innerHeight)||390);
  return {w,h};
}

function factoryPedalLayout(){
  const {w,h}=viewportSize();
  const handW=clamp(w*.08,78,102);
  const pedalW=clamp(w*.092,88,122);
  const pedalH=clamp(h*.24,132,172);
  const edge=Math.max(4,w*.0055);
  const bottom=Math.max(8,h*.015);
  const y=1-(bottom+pedalH*.5)/h;
  const handbrake={x:1-(edge+handW*.5)/w,y,scale:1};
  const brakeRight=edge+handW+5;
  const brake={x:1-(brakeRight+pedalW*.5)/w,y,scale:1};
  const gasRight=brakeRight+pedalW+6;
  const gas={x:1-(gasRight+pedalW*.5)/w,y,scale:1};
  return {gas,brake,handbrake};
}

function mirror(layout){
  const out={};
  for(const [k,v] of Object.entries(layout||{}))out[k]={...v,x:1-Number(v.x||0)};
  if(layout?.left&&layout?.right){
    out.left={...layout.left,x:1-Number(layout.right.x||0)};
    out.right={...layout.right,x:1-Number(layout.left.x||0)};
  }
  return out;
}

export function controlLayoutKey(controls={}){
  const mode=['stick','buttons','wheel'].includes(controls.steeringMode)?controls.steeringMode:'stick';
  return `${mode}:${controls.leftHanded===true?'left':'right'}`;
}

export function defaultControlLayout(controls={}){
  const mode=['stick','buttons','wheel'].includes(controls.steeringMode)?controls.steeringMode:'stick';
  const base={...structuredClone(STEERING_DEFAULTS[mode]||STEERING_DEFAULTS.stick),...factoryPedalLayout()};
  return controls.leftHanded===true?mirror(base):base;
}

export function readControlLayout(controlsOverride=null){
  let settings={};
  try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch{}
  const controls={...(settings.controls||{}),...(controlsOverride||{})};
  const key=controlLayoutKey(controls);
  return {key,controls,layout:{...defaultControlLayout(controls),...((settings.controls?.layouts||{})[key]||{})}};
}

export function saveControlLayout(layout,controlsOverride=null){
  let settings={};
  try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch{}
  settings.controls={...(settings.controls||{}),...(controlsOverride||{})};
  const key=controlLayoutKey(settings.controls);
  settings.controls.layouts={...(settings.controls.layouts||{}),[key]:layout};
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  return key;
}

export function resetControlLayout(controlsOverride=null){
  let settings={};
  try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch{}
  settings.controls={...(settings.controls||{}),...(controlsOverride||{})};
  const key=controlLayoutKey(settings.controls);
  if(settings.controls.layouts){delete settings.controls.layouts[key];}
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  return defaultControlLayout(settings.controls);
}

export function sanitizeLayoutPoint(point={}){
  return {
    x:clamp(Number(point.x)||.5,.04,.96),
    y:clamp(Number(point.y)||.75,.12,.94),
    scale:clamp(Number(point.scale)||1,.65,1.55)
  };
}

function placeDom(el,point,sizeScale=true){
  if(!el||!point)return;
  const p=sanitizeLayoutPoint(point);
  el.style.setProperty('left',`${p.x*100}vw`,'important');
  el.style.setProperty('top',`${p.y*100}vh`,'important');
  el.style.setProperty('right','auto','important');
  el.style.setProperty('bottom','auto','important');
  el.style.setProperty('transform','translate(-50%,-50%)','important');
  el.dataset.tdrLayoutScale=String(p.scale);
  if(sizeScale){
    const base=Number(el.dataset.tdrLayoutBaseWidth)||el.getBoundingClientRect().width||100;
    if(!el.dataset.tdrLayoutBaseWidth)el.dataset.tdrLayoutBaseWidth=String(base);
    el.style.setProperty('width',`${base*p.scale}px`,'important');
  }
}

function hardenIosRaceControls(root){
  if(!root)return;
  const nodes=[
    root,
    ...root.querySelectorAll('*'),
    document.getElementById('tdr-handbrake'),
    document.getElementById('tdr-steering-wheel')
  ].filter(Boolean);
  for(const el of nodes){
    el.style.setProperty('user-select','none','important');
    el.style.setProperty('-webkit-user-select','none','important');
    el.style.setProperty('-webkit-touch-callout','none','important');
    el.style.setProperty('-webkit-tap-highlight-color','transparent','important');
    el.style.setProperty('-webkit-user-drag','none','important');
    el.style.setProperty('touch-action','none','important');
    try{el.draggable=false;}catch{}
  }

  for(const pedal of root.querySelectorAll('.tdr-pedal')){
    pedal.style.setProperty('pointer-events','auto','important');
    for(const child of pedal.querySelectorAll('*')){
      child.style.setProperty('pointer-events','none','important');
      child.style.setProperty('-webkit-user-drag','none','important');
      try{child.draggable=false;}catch{}
    }
  }

  if(root.dataset.tdrIosTouchGuard==='1')return;
  root.dataset.tdrIosTouchGuard='1';
  const block=e=>{e.preventDefault();};
  const guarded=['dblclick','contextmenu','selectstart','dragstart','gesturestart','gesturechange','gestureend'];
  guarded.forEach(type=>root.addEventListener(type,block,{capture:true,passive:false}));

  // Safari can still start its long-press magnifier from Touch Events even when
  // Pointer Events and user-select are disabled. Cancel the native touch default
  // only inside the race control surface; our pointer handlers remain the input.
  root.addEventListener('touchstart',block,{capture:true,passive:false});
  root.addEventListener('touchmove',block,{capture:true,passive:false});

  let lastTouchEnd=0;
  root.addEventListener('touchend',e=>{
    const now=Date.now();
    if(now-lastTouchEnd<420)e.preventDefault();
    lastTouchEnd=now;
  },{capture:true,passive:false});
}

export function applyDomControlLayout(){
  const {controls,layout}=readControlLayout();
  const root=document.getElementById('tdr-race-controls');
  if(!root)return;
  hardenIosRaceControls(root);
  placeDom(root.querySelector('[data-stick]'),layout.steer);
  placeDom(root.querySelector('[data-pedal="gas"]'),layout.gas);
  placeDom(root.querySelector('[data-pedal="brake"]'),layout.brake);
  placeDom(document.getElementById('tdr-handbrake'),layout.handbrake);
  if(controls.steeringMode==='wheel')placeDom(document.getElementById('tdr-steering-wheel'),layout.steer);
}
