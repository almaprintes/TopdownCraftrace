import { getLanguage } from './index.js';
import { canonicalRuntimeText, localizeDomTree } from './canonicalRuntimeText.js';

// Compatibility API kept for old scenes. Translation decisions now live only in
// canonicalRuntimeText.js, so legacy Phaser/DOM paths cannot disagree.
export function localizeLegacyText(value){
  return canonicalRuntimeText(value);
}

export function installLegacyDomLocalization(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||document.__tdrLegacyDomLocalization)return;
  document.__tdrLegacyDomLocalization=true;
  localizeDomTree(document.body);
  const observer=new MutationObserver(records=>{
    if(getLanguage()!=='en')return;
    for(const record of records){
      if(record.type==='characterData')localizeDomTree(record.target);
      for(const node of record.addedNodes||[])localizeDomTree(node);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('tdr2:language-change',()=>{if(getLanguage()==='en')localizeDomTree(document.body);});
}
