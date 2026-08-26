const LEGACY_TEXTURE_KEYS=new Set([
  'panel_event','btn_play','btn_garage','btn_factory','btn_tracks','logo'
]);
const LEGACY_TEXT_MARKERS=[
  'COCHE SELECCIONADO','CIRCUITO SELECCIONADO','SELECTED CAR','SELECTED TRACK',
  'TEMPORADA COMPLETADA','SEASON COMPLETE','GARAGE','GARAJE','FACTORY','FÁBRICA','TRACKS','CIRCUITOS'
];

function topBranch(node,ui){
  let cur=node;
  while(cur?.parentContainer&&cur.parentContainer!==ui)cur=cur.parentContainer;
  return cur&&cur!==ui?cur:null;
}

function killTree(scene,node){
  if(!node)return;
  if(Array.isArray(node.list))for(const child of [...node.list])killTree(scene,child);
  try{scene.tweens?.killTweensOf?.(node);}catch{}
  try{node.removeAllListeners?.();}catch{}
  try{node.disableInteractive?.();}catch{}
}

function destroyBranch(scene,node){
  if(!node||node.destroyed||node.active===false)return;
  killTree(scene,node);
  try{node.destroy?.(true);}catch{try{node.destroy?.();}catch{}}
}

export function destroySupersededLobbyUi(scene){
  const ui=scene?._ui;if(!ui)return 0;
  const doomed=new Set();

  // Header added by the old Phaser lobby/store chain. The DOM header owns these actions now.
  if(scene._topLobbyHeader){
    doomed.add(topBranch(scene._topLobbyHeader,ui)||scene._topLobbyHeader);
    scene._topLobbyHeader=null;
  }

  const walk=node=>{
    if(!node)return;
    const key=String(node?.texture?.key||'');
    const text=typeof node?.text==='string'?node.text.trim().toUpperCase():'';

    // The old hero car is no longer merely hidden: its entire legacy hero branch
    // (including its perpetual float tween and old info box) is removed.
    const legacyHero=key==='car'||key.startsWith('skin:');
    const legacyAsset=LEGACY_TEXTURE_KEYS.has(key);
    const legacyText=LEGACY_TEXT_MARKERS.some(marker=>text===marker||text.startsWith(`${marker} `));
    const oldEvent=/^EVENTO(?:\s|$)/.test(text)||/^EVENT(?:\s|$)/.test(text);

    if(legacyHero||legacyAsset||legacyText||oldEvent){
      const branch=topBranch(node,ui);
      if(branch)doomed.add(branch);
    }
    if(Array.isArray(node.list))for(const child of [...node.list])walk(child);
  };
  walk(ui);

  let count=0;
  for(const node of doomed){
    // Never remove the photographic background or the new platform/glow, which
    // are direct children intentionally kept by the publish lobby.
    const key=String(node?.texture?.key||'');
    if(key==='menu_bg'||key==='lobby-platform')continue;
    destroyBranch(scene,node);count++;
  }
  return count;
}
