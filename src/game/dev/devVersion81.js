const VERSION='DEV 1.0.81';
const replace=()=>{
  const root=document.body;if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode())){
    if(/DEV 1\.0\.\d+/.test(node.nodeValue||''))node.nodeValue=node.nodeValue.replace(/DEV 1\.0\.\d+/g,VERSION);
  }
};
if(typeof document!=='undefined'){
  replace();
  new MutationObserver(replace).observe(document.documentElement,{subtree:true,childList:true});
}
try{window.__tdrDevVersion=VERSION;}catch{}
