export function installFreshGestureGuard(root){
  let startedAction=null;
  const actionFor=target=>{const action=target?.closest?.('[data-a]');return action&&root.contains(action)?action:null;};
  const start=event=>{startedAction=actionFor(event.target);};
  root.addEventListener('pointerdown',start,true);
  root.addEventListener('touchstart',start,{capture:true,passive:true});
  root.addEventListener('pointercancel',()=>{startedAction=null;},true);
  root.addEventListener('touchcancel',()=>{startedAction=null;},true);
  root.addEventListener('click',event=>{
    const pointerClick=event.detail>0||!!event.pointerType;
    const action=actionFor(event.target);
    const allowed=!pointerClick||(action!==null&&action===startedAction);
    startedAction=null;
    if(!allowed){event.preventDefault();event.stopImmediatePropagation();}
  },true);
}
