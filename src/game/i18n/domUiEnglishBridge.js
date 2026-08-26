import { getLanguage } from './index.js';
import { localizeDomTree } from './canonicalRuntimeText.js';

// Temporary compatibility bridge for DOM screens that still render Spanish
// literals. It no longer owns translations: every phrase is resolved by the
// same canonical runtime translator used by Phaser.
export function installDomUiEnglishBridge(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||document.__tdrDomEnglishBridge)return;
  document.__tdrDomEnglishBridge=true;
  localizeDomTree(document.body);
  const obs=new MutationObserver(records=>{
    if(getLanguage()!=='en')return;
    for(const r of records){
      if(r.type==='characterData')localizeDomTree(r.target);
      for(const n of r.addedNodes||[])localizeDomTree(n);
    }
  });
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('tdr2:language-change',()=>{if(getLanguage()==='en')localizeDomTree(document.body);});
}
