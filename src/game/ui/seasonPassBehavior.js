const FLAG='__tdrSeasonPassBehaviorInstalled';

if(typeof window!=='undefined'&&!window[FLAG]){
  window[FLAG]=true;

  let savedScrollLeft=null;
  let lastScroller=null;

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  const ensureStyle=()=>{
    if(document.getElementById('tdr-season-pass-behavior-style'))return;
    const style=document.createElement('style');
    style.id='tdr-season-pass-behavior-style';
    style.textContent=`
#tdr-season-dom .route-scroll{scroll-snap-type:x mandatory;scroll-padding-inline:50%;}
#tdr-season-dom .route-inner{grid-template-columns:repeat(14,clamp(190px,28vw,230px))!important;column-gap:clamp(24px,4vw,48px)!important;padding-left:clamp(150px,22vw,220px)!important;padding-right:clamp(150px,22vw,220px)!important;}
#tdr-season-dom .stage-node{width:clamp(190px,28vw,230px)!important;transform:scale(calc(var(--focus,.92) * var(--tdr-season-stage-scale,1)))!important;}
#tdr-season-dom .free-node{scroll-snap-align:center;scroll-snap-stop:always;}
#tdr-season-dom .reward-card{width:205px!important;height:258px!important;}
#tdr-season-dom .reward-card.car-reward{width:238px!important;height:268px!important;}
#tdr-season-dom .node-art{width:178px!important;height:172px!important;margin-top:26px!important;}
#tdr-season-dom .node-loot{width:128px!important;height:145px!important;}
#tdr-season-dom .node-loot.coin{width:142px!important;}
#tdr-season-dom .node-loot.car{width:188px!important;height:170px!important;}
#tdr-season-dom .node-loot img{max-height:132px!important;}
#tdr-season-dom .node-loot.coin img{max-height:145px!important;}
#tdr-season-dom .node-loot.car img{max-width:188px!important;max-height:168px!important;}
#tdr-season-dom .premium-gift{width:176px!important;height:156px!important;}
#tdr-season-dom .premium-gift img{max-width:172px!important;max-height:152px!important;}
#tdr-season-dom .stage-node.current .reward-card,#tdr-season-dom .stage-node.selected .reward-card{transform:translateY(-5px) scale(1.045)!important;}
@media(max-height:520px){
  #tdr-season-dom .route-inner{grid-template-rows:54% 46%!important;padding-bottom:64px!important;}
  #tdr-season-dom .stage-node.free-node{margin-top:0!important;}
  #tdr-season-dom .stage-node.premium-node{margin-top:-38px!important;}
}
`;
    document.head.appendChild(style);
  };

  const rememberScroll=(event)=>{
    const root=event.target?.closest?.('#tdr-season-dom');
    if(!root)return;
    if(!event.target?.closest?.('.stage-node,.claim'))return;
    const scroller=root.querySelector('.route-scroll');
    if(scroller)savedScrollLeft=scroller.scrollLeft;
  };

  document.addEventListener('pointerdown',rememberScroll,true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' ')rememberScroll(event);
  },true);

  const setScale=(root)=>{
    const h=Math.max(320,root.getBoundingClientRect().height||window.innerHeight||520);
    const scale=clamp(.72+(h-430)*.0022,.62,1);
    root.style.setProperty('--tdr-season-stage-scale',scale.toFixed(3));
  };

  const placeScroller=(root)=>{
    const scroller=root.querySelector('.route-scroll');
    if(!scroller)return;
    setScale(root);

    let left=null;
    if(Number.isFinite(savedScrollLeft)){
      left=savedScrollLeft;
      savedScrollLeft=null;
    }else if(scroller!==lastScroller){
      const current=scroller.querySelector('.free-node.current');
      if(current)left=current.offsetLeft-(scroller.clientWidth-current.offsetWidth)/2;
    }

    if(Number.isFinite(left)){
      const previous=scroller.style.scrollBehavior;
      scroller.style.scrollBehavior='auto';
      scroller.scrollLeft=Math.max(0,left);
      void scroller.offsetWidth;
      scroller.style.scrollBehavior=previous||'smooth';
    }
    lastScroller=scroller;
  };

  ensureStyle();
  const observer=new MutationObserver(()=>{
    ensureStyle();
    const root=document.getElementById('tdr-season-dom');
    if(root)placeScroller(root);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('resize',()=>{
    const root=document.getElementById('tdr-season-dom');
    if(root)setScale(root);
  },{passive:true});
}
