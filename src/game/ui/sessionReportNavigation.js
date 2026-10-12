// A single, discoverable navigation model for post-race session reports.
// Do not remove or recalculate stats: move the existing DOM sections into
// three explicit pages, preserving F1 sector tables, verdicts and exports.
const TABS=[
  {id:'resumen',name:'RESUMEN',next:'VER CONDUCCIÓN →'},
  {id:'conduccion',name:'CONDUCCIÓN',next:'VER VUELTAS →'},
  {id:'vueltas',name:'VUELTAS',next:null}
];

export function sessionReportSection(node,current=0){
  if(node?.tagName==='H3'){
    const title=String(node.textContent||'').trim().toLocaleLowerCase('es');
    if(title.includes('uso de controles'))return 1;
    if(title.startsWith('vueltas'))return 2;
  }
  return current;
}

export function installSessionReportNavigation(root){
  if(!root||root.dataset?.reportNavigation==='1')return null;
  const modal=root.querySelector?.('.modal');
  const scroll=modal?.querySelector?.('.scroll');
  const report=scroll?.querySelector?.('.report');
  const actions=modal?.querySelector?.('.actions');
  if(!modal||!scroll||!report||!actions)return null;
  const children=[...report.children];
  if(!children.length)return null;
  const doc=root.ownerDocument||document;
  const pages=TABS.map((tab,i)=>{
    const page=doc.createElement('section');
    page.className='tdr-report-page';
    page.dataset.reportPage=tab.id;
    page.setAttribute('role','tabpanel');
    page.setAttribute('aria-label',tab.name);
    page.hidden=i!==0;
    return page;
  });
  let current=0;
  for(const child of children){
    current=sessionReportSection(child,current);
    pages[current].appendChild(child);
  }
  if(pages.some(p=>!p.children.length))return null;
  report.append(...pages);
  root.dataset.reportNavigation='1';
  root.classList.add('tdr-report-paged');

  const style=doc.createElement('style');
  style.textContent=`
    .tdr-report-paged .modal{
      display:flex!important;flex-direction:column!important;overflow:hidden!important;
      width:min(94vw,1100px)!important;max-width:94vw!important;
      max-height:calc(100dvh - 16px)!important;
      min-height:0!important;padding:0!important
    }
    .tdr-report-paged .tdr-report-tabs{
      flex:0 0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
      gap:6px;padding:9px 12px 8px;background:#0b1423;
      border-bottom:1px solid #22364d
    }
    .tdr-report-paged .tdr-report-tab{
      min-width:0;min-height:46px;border:1px solid #2a3c52;border-radius:10px;
      background:#111d2d;color:#a2b0c4;font:850 12px system-ui;
      letter-spacing:.025em;display:flex;justify-content:center;align-items:center;
      gap:7px;cursor:pointer;touch-action:manipulation
    }
    .tdr-report-paged .tdr-report-tab .step{
      width:21px;height:21px;flex:0 0 21px;border-radius:50%;
      display:grid;place-items:center;border:1px solid #455c76;
      font-size:10px;color:#a7bdd4
    }
    .tdr-report-paged .tdr-report-tab[aria-selected="true"]{
      background:#18334b;border-color:#5ddcf2;color:#fff
    }
    .tdr-report-paged .tdr-report-tab[aria-selected="true"] .step{
      background:#5ddcf2;border-color:#5ddcf2;color:#07101b
    }
    .tdr-report-paged .scroll{
      flex:1 1 auto!important;min-height:0!important;
      overflow-x:hidden!important;overflow-y:auto!important;
      overscroll-behavior:contain!important;
      -webkit-overflow-scrolling:touch!important;
      touch-action:pan-y!important;scrollbar-width:thin
    }
    .tdr-report-paged .tdr-report-page[hidden]{display:none!important}
    .tdr-report-paged .tdr-report-page{min-width:0;padding-bottom:4px}
    .tdr-report-paged .report{padding-top:14px!important;padding-bottom:14px!important}
    .tdr-report-paged .actions{
      display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
      flex:0 0 auto!important;gap:8px!important;padding:10px 12px!important;
      margin:0!important;border-top:1px solid #2d415a!important;background:#0a101b!important
    }
    .tdr-report-paged .actions button{
      min-width:0;min-height:47px!important;padding:9px!important;
      border-radius:12px!important;touch-action:manipulation;
      font-size:12px!important;font-weight:900!important;cursor:pointer
    }
    .tdr-report-paged .actions .tdr-report-next{
      background:#d8f5ff!important;color:#091c2e!important;
      border:1px solid #a1e9ff!important;letter-spacing:.025em!important
    }
    .tdr-report-paged .actions.tdr-report-three-actions{
      grid-template-columns:repeat(3,minmax(0,1fr))!important
    }
    .tdr-report-paged .actions [hidden]{display:none!important}
    @media (orientation:landscape) and (max-height:550px){
      .tdr-report-paged .tdr-report-tabs{padding:5px 10px;gap:5px}
      .tdr-report-paged .tdr-report-tab{min-height:38px;font-size:11px;gap:5px}
      .tdr-report-paged .actions{padding:6px 10px!important}
      .tdr-report-paged .actions button{min-height:40px!important}
      .tdr-report-paged .report{padding-top:9px!important;padding-bottom:8px!important}
    }
    @media(max-width:460px){
      .tdr-report-paged .tdr-report-tabs{padding:8px 6px;gap:4px}
      .tdr-report-paged .tdr-report-tab{font-size:9px;gap:4px;min-height:43px}
    }
  `;
  root.appendChild(style);

  const tabs=doc.createElement('nav');
  tabs.className='tdr-report-tabs';
  tabs.setAttribute('aria-label','Secciones del informe de sesión');
  const tabButtons=TABS.map((tab,i)=>{
    const button=doc.createElement('button');
    button.type='button';button.className='tdr-report-tab';
    button.dataset.reportTab=tab.id;
    button.innerHTML=`<span class="step">${i+1}</span><span>${tab.name}</span>`;
    button.setAttribute('aria-controls',tab.id);
    tabs.appendChild(button);
    return button;
  });
  modal.insertBefore(tabs,scroll);

  const next=doc.createElement('button');
  next.type='button';next.dataset.a='report-next';next.className='tdr-report-next';
  const back=doc.createElement('button');
  back.type='button';back.dataset.a='report-back';back.textContent='← ANTERIOR';
  actions.appendChild(next);actions.appendChild(back);
  const exportBtn=actions.querySelector('[data-a="export"]');
  const exitBtn=actions.querySelector('[data-a="exit"]');
  const continueBtn=actions.querySelector('[data-a="continue"]');
  let page=0;
  const show=i=>{
    page=Math.max(0,Math.min(2,i));
    pages.forEach((p,n)=>{p.hidden=n!==page;});
    tabButtons.forEach((b,n)=>{
      b.setAttribute('aria-selected',String(n===page));
      b.setAttribute('tabindex',n===page?'0':'-1');
    });
    const last=page===2;
    if(next){next.hidden=last;next.textContent=TABS[page].next||'';}
    if(back)back.hidden=page!==1;
    if(exportBtn)exportBtn.hidden=page===1;
    if(exitBtn)exitBtn.hidden=!last;
    // Manual session reports keep their old CONTINUAR action on the last
    // page. Final-session rewards explicitly hide it in the caller.
    if(continueBtn)continueBtn.hidden=!last;
    actions.classList.toggle('tdr-report-three-actions',last&&!!continueBtn&&!continueBtn.hidden&&continueBtn.style.display!=='none');
    scroll.scrollTop=0;
  };
  tabButtons.forEach((b,i)=>b.addEventListener('click',()=>show(i)));
  next.addEventListener('click',()=>show(page+1));
  back.addEventListener('click',()=>show(page-1));
  show(0);
  return {show,getPage:()=>page,count:pages.length};
}
