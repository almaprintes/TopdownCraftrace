// Shared native-scrolling selector for Garage and Circuits.
// Keep WebKit momentum; only snap to the nearest centered item after the user
// has finished scrolling. Buttons, unlocks and scene navigation stay external.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function centeredRailTarget(scrollTop,viewportHeight,itemTop,itemHeight,maxScroll){
  return clamp(scrollTop+itemTop-(viewportHeight-itemHeight)/2,0,Math.max(0,maxScroll));
}
export function closestCenteredIndex(viewCenter,itemCenters){
  let best=-1,distance=Infinity;
  for(let i=0;i<itemCenters.length;i++){
    const delta=Math.abs(itemCenters[i]-viewCenter);
    if(delta<distance){distance=delta;best=i;}
  }
  return best;
}
export function attachCenteredSelectionRail(root,{listSelector,itemSelector,onSettle}){
  const list=root?.querySelector?.(listSelector);
  if(!list)return null;
  let disposed=false,frame=0,idle=0,programmatic=false,userScrolled=false,pointerActive=false;
  const items=()=>Array.from(list.querySelectorAll(itemSelector));
  const rect=node=>node.getBoundingClientRect();
  const reduceMotion=()=>typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const pointCenter=node=>{const r=rect(node);return (r.top+r.bottom)/2;};
  function paddings(){
    const cards=items();
    if(!cards.length)return;
    // Padding makes even first/last possible snap centers, not just middle cards.
    const h=list.clientHeight;
    list.style.paddingTop=Math.max(0,(h-cards[0].offsetHeight)/2)+'px';
    list.style.paddingBottom=Math.max(0,(h-cards[cards.length-1].offsetHeight)/2)+'px';
  }
  function target(index){
    const card=items()[index];
    if(!card)return list.scrollTop;
    const box=rect(card),outer=rect(list),relativeTop=box.top-outer.top;
    return centeredRailTarget(list.scrollTop,list.clientHeight,relativeTop,box.height,list.scrollHeight-list.clientHeight);
  }
  function center(index,behavior='smooth'){
    if(disposed)return;
    clearTimeout(idle);
    paddings();
    const to=target(index),smooth=behavior==='smooth'&&!reduceMotion();
    programmatic=true;userScrolled=false;
    list.scrollTo?.({top:to,behavior:smooth?'smooth':'instant'});
    if(!list.scrollTo)list.scrollTop=to;
    // Scrollend may be unsupported; center animation ends on its own.
    // Never turn a programmatic selection into a second user selection.
    clearTimeout(idle);
    idle=setTimeout(()=>{programmatic=false;},smooth?750:40);
  }
  function selectedAtCenter(){
    const cards=items();
    if(!cards.length)return -1;
    const outer=rect(list),mid=(outer.top+outer.bottom)/2;
    return closestCenteredIndex(mid,cards.map(pointCenter));
  }
  function settle(){
    if(disposed||pointerActive||programmatic||!userScrolled)return;
    userScrolled=false;
    const index=selectedAtCenter();
    if(index<0)return;
    center(index,'smooth');
    onSettle?.(index);
  }
  function scroll(){
    if(disposed||programmatic||!userScrolled)return;
    clearTimeout(idle);
    // iOS inertia emits scroll events until its velocity has reached zero.
    // Do not fight that momentum with programmatic scrollTo on every event.
    idle=setTimeout(settle,180);
  }
  function begin(){clearTimeout(idle);programmatic=false;userScrolled=true;}
  function press(){pointerActive=true;begin();}
  function release(){pointerActive=false;if(userScrolled){clearTimeout(idle);idle=setTimeout(settle,230);}}
  const resize=()=>{if(disposed)return;paddings();};
  list.addEventListener('scroll',scroll,{passive:true});
  list.addEventListener('scrollend',settle,{passive:true});
  list.addEventListener('pointerdown',press,{passive:true});
  list.addEventListener('pointerup',release,{passive:true});
  list.addEventListener('pointercancel',release,{passive:true});
  list.addEventListener('touchend',release,{passive:true});
  list.addEventListener('wheel',begin,{passive:true});
  list.addEventListener('keydown',begin);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  observer?.observe(list);
  paddings();
  return {
    list,center,restore(top){list.scrollTop=clamp(Number(top)||0,0,Math.max(0,list.scrollHeight-list.clientHeight));},
    destroy(){
      disposed=true;clearTimeout(idle);if(frame)cancelAnimationFrame(frame);
      observer?.disconnect();
      list.removeEventListener('scroll',scroll);list.removeEventListener('scrollend',settle);
      list.removeEventListener('pointerdown',press);list.removeEventListener('pointerup',release);
      list.removeEventListener('pointercancel',release);list.removeEventListener('touchend',release);
      list.removeEventListener('wheel',begin);list.removeEventListener('keydown',begin);
    }
  };
}
