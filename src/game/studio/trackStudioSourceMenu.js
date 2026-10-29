// Four keyboard-free actions for the TrackStudio import origin menu.
export const SOURCE_ACTIONS = Object.freeze([
  ['1','CIRCUITO DEL JUEGO','Pista registrada'],
  ['2','PROYECTO GUARDADO','Este dispositivo'],
  ['3','IMPORTAR ARCHIVO','JSON o .tdrtrack'],
  ['4','RECUPERAR TRABAJO','Última copia automática']
]);

export function openTrackStudioSourceMenu(scene) {
  if (typeof document==='undefined') return;
  scene?._closeSourceMenu?.();
  const root=document.createElement('div');
  root.id='tdr-trackstudio-source-menu';
  root.style.cssText='position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:12px;background:rgba(0,6,16,.92);box-sizing:border-box;font:700 13px system-ui,-apple-system,sans-serif;color:#eefaff';
  const dialog=document.createElement('div');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Cargar TrackStudio');
  dialog.style.cssText='width:min(590px,95vw);max-height:90dvh;overflow-y:auto;padding:clamp(12px,3vh,24px);box-sizing:border-box;border:1px solid #2d8caf;border-radius:14px;background:#091b2c';
  const title=document.createElement('h2');
  title.textContent='CARGAR TRACK STUDIO';
  title.style.cssText='text-align:center;font-size:clamp(15px,3vw,21px);color:#64dfff;margin:0 0 14px;letter-spacing:.07em';
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(7px,2vh,13px)';
  const onKeyDown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
  const close=()=>{
    document.removeEventListener('keydown',onKeyDown);
    root.remove();
    scene?.events?.off?.('shutdown',close);
    scene?.events?.off?.('destroy',close);
    if(scene._closeSourceMenu===close)scene._closeSourceMenu=null;
  };
  const handlers=[
    ()=>scene._openGameTrackSourceMenu(),
    ()=>{if(scene._loadProject?.())scene._flashMessage('📂 Proyecto local cargado');},
    ()=>scene._openProjectPicker(),
    ()=>scene._restoreLastTrackStudioRecovery()
  ];
  SOURCE_ACTIONS.forEach(([number,label,description],i)=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.sourceAction=number;
    button.style.cssText='display:flex;align-items:center;min-width:0;gap:9px;min-height:clamp(59px,13vh,86px);padding:10px;text-align:left;color:white;background:#142f43;border:1px solid #377393;border-radius:10px;cursor:pointer;touch-action:manipulation';
    const num=document.createElement('span');num.textContent=number;
    num.style.cssText='flex:0 0 26px;text-align:center;padding:6px 0;background:#146080;border-radius:6px;font:800 16px system-ui;color:#9df5ff';
    const content=document.createElement('span');content.style.cssText='min-width:0;font:700 clamp(10px,2vw,14px) system-ui;line-height:1.25';
    const labelNode=document.createElement('strong');labelNode.textContent=label;labelNode.style.display='block';
    const hint=document.createElement('small');hint.textContent=description;
    hint.style.cssText='display:block;margin-top:4px;color:#b6cfdd;font:500 10px system-ui';
    content.append(labelNode,hint);button.append(num,content);
    button.addEventListener('click',()=>{close();handlers[i]();});
    grid.append(button);
  });
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='CANCELAR';
  cancel.style.cssText='display:block;margin:12px auto 0;min-height:36px;padding:5px 25px;color:#dcefff;background:#1a3243;border:1px solid #57778a;border-radius:9px;touch-action:manipulation';
  cancel.addEventListener('click',close);
  root.addEventListener('pointerdown',e=>{if(e.target===root)close();});
  dialog.append(title,grid,cancel);root.append(dialog);document.body.append(root);
  document.addEventListener('keydown',onKeyDown);
  grid.querySelector('button')?.focus?.();
  scene?.events?.once?.('shutdown',close);scene?.events?.once?.('destroy',close);
  scene._closeSourceMenu=close;
}