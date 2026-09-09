import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';

function normalized(value){
  return String(value||'').replace(/\s+/g,' ').trim().toUpperCase();
}

function dynamicReadingFromReport(scene){
  try{
    const modal=scene?._sessionReportModal;
    const marked=modal?.querySelector?.('[data-tdr-dynamic-session-reading="1"]');
    const text=String(marked?.textContent||'').trim();
    if(text)return text;
  }catch{}
  return'';
}

function patchReadingInTree(root,reading){
  if(!root||!reading)return false;
  let changed=false;
  const nodes=[];
  try{
    if(root.nodeType===Node.ELEMENT_NODE)nodes.push(root);
    if(root.querySelectorAll)nodes.push(...root.querySelectorAll('*'));
  }catch{return false;}

  for(const el of nodes){
    if(el?.children?.length)continue;
    const text=String(el?.textContent||'').trim();
    const key=normalized(text);
    if(key==='SESIÓN DE REFERENCIA.'||key==='SESION DE REFERENCIA.'||key==='SESIÓN DE REFERENCIA'||key==='SESION DE REFERENCIA'){
      el.textContent=reading;
      el.dataset.tdrDynamicSessionReading='1';
      changed=true;
    }
  }

  // The export layout is rebuilt independently from the visible report. Inside
  // the card headed "LECTURA DE LA TANDA", force its narrative body to the
  // exact telemetry-driven sentence currently shown to the player, regardless
  // of the placeholder/legacy wording used by the export template.
  const leaves=nodes.filter(el=>!el?.children?.length);
  const headings=leaves.filter(el=>normalized(el?.textContent)==='LECTURA DE LA TANDA');
  for(const heading of headings){
    let scope=heading.parentElement;
    for(let depth=0;scope&&depth<4;depth++,scope=scope.parentElement){
      const candidates=[...scope.querySelectorAll('*')]
        .filter(el=>!el.children?.length&&el!==heading&&!el.closest?.('[data-tdr-session-trend="1"]'))
        .map(el=>({el,text:String(el.textContent||'').replace(/\s+/g,' ').trim()}))
        .filter(row=>{
          const key=normalized(row.text);
          return row.text.length>20&&
            key!=='LECTURA DE LA TANDA'&&
            !key.startsWith('EVOLUCIÓN DE LA TANDA')&&
            !key.startsWith('EVOLUCION DE LA TANDA');
        });
      const target=
        candidates.find(row=>row.el.dataset?.tdrDynamicSessionReading==='1')||
        candidates.find(row=>/SESI[ÓO]N DE REFERENCIA/i.test(row.text))||
        candidates.sort((a,b)=>b.text.length-a.text.length)[0];
      if(target){
        if(target.text!==reading)target.el.textContent=reading;
        target.el.dataset.tdrDynamicSessionReading='1';
        changed=true;
        break;
      }
    }
  }
  return changed;
}

function patchWholeDocument(reading){
  if(typeof document==='undefined'||!reading)return false;
  return patchReadingInTree(document.body,reading);
}

// The legacy exporter may clone and rasterize its DOM synchronously inside the
// EXPORTAR click handler. MutationObserver is intentionally asynchronous, so a
// clone could previously be captured with the legacy sentence before our
// observer saw it. Patch clones and inserted export trees synchronously for the
// duration of that click stack, then restore the native DOM methods immediately.
function armSynchronousExportPatch(reading){
  if(typeof Node==='undefined'||!reading)return()=>{};
  const proto=Node.prototype;
  const original={
    cloneNode:proto.cloneNode,
    appendChild:proto.appendChild,
    insertBefore:proto.insertBefore,
    replaceChild:proto.replaceChild
  };
  let active=true;

  try{
    proto.cloneNode=function(deep){
      const clone=original.cloneNode.call(this,deep);
      try{patchReadingInTree(clone,reading);}catch{}
      return clone;
    };
    proto.appendChild=function(child){
      try{patchReadingInTree(child,reading);}catch{}
      return original.appendChild.call(this,child);
    };
    proto.insertBefore=function(child,before){
      try{patchReadingInTree(child,reading);}catch{}
      return original.insertBefore.call(this,child,before);
    };
    proto.replaceChild=function(child,oldChild){
      try{patchReadingInTree(child,reading);}catch{}
      return original.replaceChild.call(this,child,oldChild);
    };
  }catch{}

  const restore=()=>{
    if(!active)return;
    active=false;
    try{proto.cloneNode=original.cloneNode;}catch{}
    try{proto.appendChild=original.appendChild;}catch{}
    try{proto.insertBefore=original.insertBefore;}catch{}
    try{proto.replaceChild=original.replaceChild;}catch{}
  };
  setTimeout(restore,0);
  return restore;
}

export class RaceScene extends CurrentRaceScene {
  _openPauseMenu(...args){
    const alreadyPaused=this._tdrPauseMenuOpen===true||!!this._experiencePauseUi?.root?.isConnected;
    if(!alreadyPaused&&!Number.isFinite(this._tdrPauseTimingStartedAt)){
      this._tdrPauseTimingStartedAt=performance.now();
      this._tdrPauseTimingStartedTick=Number.isFinite(Number(this.simTick))?Number(this.simTick):null;
    }
    return super._openPauseMenu?.(...args);
  }

  _closePauseMenu(resume=true){
    const startedAt=Number(this._tdrPauseTimingStartedAt);
    const startedTick=Number(this._tdrPauseTimingStartedTick);
    const pausedMs=Number.isFinite(startedAt)?Math.max(0,performance.now()-startedAt):0;
    const currentTick=Number(this.simTick);
    const pausedTicks=Number.isFinite(startedTick)&&Number.isFinite(currentTick)?Math.max(0,currentTick-startedTick):0;

    // Physics pause stops the car but the base timing clocks keep advancing.
    // Advance BOTH timing origins before resuming so menu time never enters
    // lap/sector times, history, ghost timing or telemetry tick deltas.
    if(resume!==false){
      if(pausedMs>0&&this.timing?.started&&Number.isFinite(this.timing?.lapStart)){
        this.timing.lapStart+=pausedMs;
      }
      if(pausedTicks>0&&Number.isFinite(this.lapStartTick)){
        this.lapStartTick+=pausedTicks;
      }
      this._tdrPauseTimingStartedAt=NaN;
      this._tdrPauseTimingStartedTick=null;
    }

    return super._closePauseMenu?.(resume);
  }

  _armSessionExportReadingBridge(){
    const modal=this._sessionReportModal;
    if(!modal?.querySelectorAll||modal.dataset?.tdrExportReadingBridge==='1')return;
    const reading=dynamicReadingFromReport(this);
    if(!reading)return;
    modal.dataset.tdrExportReadingBridge='1';
    this._tdrSessionEngineerReading=reading;

    const buttons=[...modal.querySelectorAll('button')];
    const exportBtn=buttons.find(btn=>normalized(btn.textContent)==='EXPORTAR');
    if(!exportBtn)return;

    exportBtn.addEventListener('click',()=>{
      const current=dynamicReadingFromReport(this)||this._tdrSessionEngineerReading||reading;
      this._tdrSessionEngineerReading=current;

      // The export renderer can clone/capture in this same event dispatch. Patch
      // those clones synchronously, before its own click handler can rasterize
      // the legacy wording. The observer below remains as a safety net for any
      // asynchronous export/share DOM created afterwards.
      armSynchronousExportPatch(current);

      let observer=null;
      try{
        observer=new MutationObserver(records=>{
          for(const record of records){
            for(const node of record.addedNodes||[])patchReadingInTree(node,current);
          }
          patchWholeDocument(current);
        });
        observer.observe(document.body,{childList:true,subtree:true});
      }catch{}

      patchWholeDocument(current);
      for(const delay of [0,40,120,300,700]){
        setTimeout(()=>patchWholeDocument(current),delay);
      }
      setTimeout(()=>{try{observer?.disconnect?.();}catch{}},1400);
    },{capture:true});
  }

  _openSessionReport(...args){
    const result=super._openSessionReport?.(...args);
    const arm=()=>{
      try{
        // The parent scene first replaces the legacy generic sentence with the
        // telemetry-driven reading. Capture that exact final text for export.
        this._patchSessionReading?.();
        this._tdrSessionEngineerReading=dynamicReadingFromReport(this)||this._tdrSessionEngineerReading||'';
        this._armSessionExportReadingBridge();
      }catch(error){console.warn('[session-engineer-export] bridge failed',error);}
    };
    arm();
    setTimeout(arm,0);
    setTimeout(arm,100);
    return result;
  }
}