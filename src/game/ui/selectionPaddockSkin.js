import paddockCss from './selectionPaddock.css?inline';

const ID='tdr-selection-paddock-css';

// Both screens are lazy-loaded. The authored skin must be installed *after*
// their existing CSS to win cascade without changing any DOM, click handlers,
// selection persistence or visibility/lock logic.
export function ensureSelectionPaddockSkin(){
  let style=document.getElementById(ID);
  if(!style){
    style=document.createElement('style');
    style.id=ID;
    style.textContent=paddockCss;
  }
  // Appending an existing node is safe, deterministic, and keeps one stylesheet.
  document.head.appendChild(style);
}
