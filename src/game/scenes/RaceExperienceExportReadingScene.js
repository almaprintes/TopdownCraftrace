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

  // Some export layouts build the reading card with a heading and a generic
  // sentence that may change wording. Patch that card too, but only inside a
  // scope explicitly headed "LECTURA DE LA TANDA".
  const leaves=nodes.filter(el=>!el?.children?.length);
  const headings=leaves.filter(el=>normalized(el?.textContent)==='LECTURA DE LA TANDA');
  for(const heading of headings){
    let scope=heading.parentElement;
    for(let depth=0;scope&&depth<4;depth++,scope=scope.parentElement){
      const candidates=[...scope.querySelectorAll('*')]
        .filter(el=>!el.children?.length&&el!==heading)
        .map(el=>({el,text:String(el.textContent||'').trim()}))
        .filter(row=>row.text.length>=4&&normalized(row.text)!=='LECTURA DE LA TANDA');
      const generic=candidates.find(row=>/SESI[ÓO]N DE REFERENCIA/i.test(row.text));
      if(generic){
        generic.el.textContent=reading;
        generic.el.dataset.tdrDynamicSessionReading='1';
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

export class RaceScene extends CurrentRaceScene {
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

      // Arm before the legacy export click handler runs. MutationObserver fires
      // as soon as the export/share DOM is inserted, before the next paint, so
      // the exported card and the on-screen report stay identical.
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
