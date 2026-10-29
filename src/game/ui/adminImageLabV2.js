
// IMAGE LAB 2.0: presentation adapter for the existing offline converter.
// Never re-encodes an image and never sends it to a server.
const node=(tag,className,text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!=null)el.textContent=text;
  return el;
};
const human=n=>!Number.isFinite(n)?'—':n>=1048576?(n/1048576).toFixed(2)+' MB':Math.max(0,Math.round(n/1024))+' KB';
const formatLabel=f=>f==='jpeg'?'JPG':String(f||'').toUpperCase();
const cut=(s,max=60)=>String(s||'').length>max?String(s).slice(0,max-1)+'…':String(s||'');
const mbx=(label,fn,cls='tdr-image-lab__action')=>{
  const b=node('button',cls,label);
  b.type='button';b.addEventListener('click',fn);return b;
};

export function mountImageLabV2({overlay,panel,head,heading,close,hint,fileWrap,pick,
  options,formatWrap,formatInput,scaleWrap,scaleInput,qualityWrap,qualityInput,
  qualityValue,note,launch,status,results,
  exportLimits={mobile:false,maxEdge:16383,maxPixels:64_000_000}}){
  overlay.classList.add('tdr-image-lab');
  panel.classList.add('tdr-image-lab__shell');
  panel.style.cssText='';
  head.classList.add('tdr-image-lab__head');head.style.cssText='';
  heading.classList.add('tdr-image-lab__titles');heading.style.cssText='';
  const h2=heading.querySelector('h2');
  if(h2){h2.innerHTML='IMAGE LAB <span>2.0</span>';h2.style.cssText='';}
  const existingSub=heading.querySelector('div');
  if(existingSub)existingSub.remove();
  heading.insertBefore(node('div','tdr-image-lab__eyebrow','ADMIN HUB'),heading.firstChild);
  heading.append(node('div','tdr-image-lab__headnote','CONVERSIÓN · AMPLIACIÓN · ANÁLISIS'));
  const brand=node('div','tdr-image-lab__brand');
  const logo=node('div','tdr-image-lab__logo');
  logo.innerHTML='TD<em>R</em>';
  brand.append(logo,heading);
  const actionsHead=node('div','tdr-image-lab__headright');
  const version=document.querySelector('meta[name="tdr-dev-version"]')?.content||'DEV';
  actionsHead.append(node('span','tdr-image-lab__version',version));
  close.classList.add('tdr-image-lab__close');close.style.cssText='';close.textContent='VOLVER A PADDOCK';
  actionsHead.append(close);
  head.replaceChildren(brand,actionsHead);

  const workspace=node('div','tdr-image-lab__workspace');
  const stageArea=node('section','tdr-image-lab__stage-area');
  stageArea.setAttribute('aria-label','Vista previa antes y después');
  const stageTop=node('div','tdr-image-lab__stage-top');
  const filename=node('span','tdr-image-lab__filename','SIN ARCHIVO SELECCIONADO');
  const mode=node('span','tdr-image-lab__mode','IMAGEN ORIGINAL');
  stageTop.append(filename,mode);
  const stage=node('div','tdr-image-lab__stage');
  const viewport=node('div','tdr-image-lab__viewport');
  const canvas=node('div','tdr-image-lab__canvas');
  const before=node('img');
  before.alt='Vista previa de imagen original';
  before.hidden=true;
  const after=node('img');
  after.alt='Vista previa de imagen convertida';
  after.hidden=true;
  canvas.append(before,after);viewport.append(canvas);
  const placeholder=node('div','tdr-image-lab__placeholder');
  placeholder.append(node('strong','','ELIGE UNA IMAGEN PARA COMENZAR'));
  placeholder.append(node('small','','Hasta 8 imágenes por lote · Conversión local y privada'));
  const divider=node('div','tdr-image-lab__divider');divider.hidden=true;
  const handle=node('div','tdr-image-lab__handle','‹ ›');
  handle.setAttribute('role','slider');
  handle.setAttribute('tabindex','0');
  handle.setAttribute('aria-label','Separación antes/después');
  handle.setAttribute('aria-valuemin','0');
  handle.setAttribute('aria-valuemax','100');
  handle.setAttribute('aria-valuenow','50');
  handle.hidden=true;divider.append(handle);
  const beforeLabel=node('div','tdr-image-lab__photo-label tdr-image-lab__photo-label--before');
  beforeLabel.innerHTML='<strong>ANTES</strong><span>—</span>';beforeLabel.hidden=true;
  const afterLabel=node('div','tdr-image-lab__photo-label tdr-image-lab__photo-label--after');
  afterLabel.innerHTML='<strong>DESPUÉS</strong><span>—</span>';afterLabel.hidden=true;
  stage.append(viewport,placeholder,divider,beforeLabel,afterLabel);
  const bottom=node('div','tdr-image-lab__stage-bottom');
  const pickButton=mbx('＋ AÑADIR IMÁGENES',()=>pick.click(),'tdr-image-lab__pick');
  const fit=mbx('AJUSTAR',()=>zoom(false),'tdr-image-lab__zoom');
  const pixels=mbx('100 %',()=>zoom(true),'tdr-image-lab__zoom');
  const slider=node('input','tdr-image-lab__split-slider');
  slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.value='50';
  slider.disabled=true;slider.setAttribute('aria-label','Porcentaje de imagen convertida visible');
  bottom.append(pickButton,fit,pixels,slider);
  stageArea.append(stageTop,stage,bottom);

  const side=node('aside','tdr-image-lab__side');
  const setting=(wrap,title)=>{
    wrap.classList.add('tdr-image-lab__setting');
    wrap.style.cssText='';
    const strong=wrap.querySelector('strong');if(strong){strong.textContent=title;strong.style.cssText='';}
    return wrap;
  };
  setting(formatWrap,'FORMATO DE SALIDA');
  setting(scaleWrap,'ESCALA DE AMPLIACIÓN');
  setting(qualityWrap,'CALIDAD DE EXPORTACIÓN');
  qualityValue.style.cssText='';
  qualityInput.style.cssText='';
  const choiceButtons=[];
  const scaleButtons=[];
  const choices=(wrap,select,data,cls)=>{
    select.style.cssText='';
    const holder=node('div',cls);
    const choices=[];
    for(const [val,label] of data){
      const b=mbx(label,()=>{
        select.value=val;
        select.dispatchEvent(new Event('change',{bubbles:true}));
      },cls==='tdr-image-lab__format-options'?'tdr-image-lab__format-choice':'tdr-image-lab__scale-choice');
      holder.append(b);choices.push([val,b]);choiceButtons.push(b);
      if(cls==='tdr-image-lab__scale-options')scaleButtons.push([Number(val),b]);
    }
    wrap.append(holder);
    const update=()=>{
      for(const [val,b] of choices)b.setAttribute('aria-pressed',String(select.value===val));
    };
    select.addEventListener('change',update);
    update();
  };
  choices(formatWrap,formatInput,[['webp','WebP'],['png','PNG'],['jpeg','JPG'],['original','Mantener formato']],'tdr-image-lab__format-options');
  choices(scaleWrap,scaleInput,[['1','×1'],['1.5','×1,5'],['2','×2'],['2.5','×2,5'],['3','×3']],'tdr-image-lab__scale-options');
  const limitsHint=node('small','tdr-image-lab__export-hint');
  limitsHint.setAttribute('role','status');limitsHint.setAttribute('aria-live','polite');
  scaleWrap.append(limitsHint);
  note.classList.add('tdr-image-lab__settings-note');note.style.cssText='';
  const metrics=node('div','tdr-image-lab__metrics');
  const buildMetric=(title,different=false)=>{
    const el=node('div','tdr-image-lab__metric'+(different?' tdr-image-lab__metric--delta':''));
    const label=node('span','',title),value=node('strong','','—');
    el.append(label,value);metrics.append(el);return value;
  };
  const originalSize=buildMetric('Resolución original');
  const outputSize=buildMetric('Resolución de salida');
  const originalBytes=buildMetric('Peso original');
  const outputBytes=buildMetric('Peso final');
  const savings=buildMetric('Variación de peso',true);
  const metricStatus=buildMetric('Resultado');
  const actionRow=node('div','tdr-image-lab__actions');
  launch.classList.add('tdr-image-lab__launch');launch.style.cssText='';
  const compare=mbx('COMPARAR',()=>current?.compare?.());
  const download=mbx('DESCARGAR',()=>current?.download?.(),'tdr-image-lab__action tdr-image-lab__action--download');
  compare.disabled=true;download.disabled=true;
  actionRow.append(launch,compare,download);
  status.classList.add('tdr-image-lab__status');status.style.cssText='';
  side.append(formatWrap,scaleWrap,qualityWrap,metrics,note,actionRow,status);
  workspace.append(stageArea,side);

  const resultsWrap=node('section','tdr-image-lab__results-wrap');
  resultsWrap.append(node('h3','tdr-image-lab__results-head','RESULTADOS DE ESTA SESIÓN'));
  results.classList.add('tdr-image-lab__results');results.style.cssText='';
  resultsWrap.append(results);
  const footer=node('p','tdr-image-lab__footer');
  footer.textContent='Todo se procesa en tu dispositivo. Ampliar añade píxeles interpolados, no recupera detalle inexistente. Al cerrar IMAGE LAB se liberan los recursos temporales.';
  hint.remove();options.remove();fileWrap.remove();
  // Keep the real input and its event handlers. This label is visually hidden, not removed.
  fileWrap.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);';
  pick.style.cssText='';
  panel.replaceChildren(head,workspace,resultsWrap,footer,fileWrap);

  let sourceUrl=null,current=null,actualZoom=false,sourceMeta=null,isBusy=false;
  const describeLimit=()=>exportLimits.mobile
    ?'Móvil: 8192 px/lado y 16 MP'
    :'Mac/PC: 16.383 px/lado y 64 MP';
  const refreshPrediction=()=>{
    const {maxEdge,maxPixels}=exportLimits;
    if(!sourceMeta){
      limitsHint.textContent='Límite de salida · '+describeLimit();
      limitsHint.setAttribute('data-warning','false');
      for(const [,button] of scaleButtons)button.disabled=isBusy;
      if(!isBusy)launch.disabled=false;
      return;
    }
    const canKeepOriginal=formatInput.value==='original'&&Number(scaleInput.value)===1;
    const width=Math.round(sourceMeta.width*Number(scaleInput.value));
    const height=Math.round(sourceMeta.height*Number(scaleInput.value));
    const pixels=width*height;
    const invalid=!canKeepOriginal&&(width>maxEdge||height>maxEdge||pixels>maxPixels);
    for(const [scale,button] of scaleButtons){
      const w=Math.round(sourceMeta.width*scale),h=Math.round(sourceMeta.height*scale);
      const directCopy=formatInput.value==='original'&&scale===1;
      const prohibited=!directCopy&&(w>maxEdge||h>maxEdge||w*h>maxPixels);
      button.disabled=isBusy||prohibited;
      button.title=prohibited?'Supera '+describeLimit():'';
    }
    outputSize.textContent=width+' × '+height+(invalid?' ⚠':'');
    outputSize.parentElement?.setAttribute('data-warning',String(invalid));
    limitsHint.setAttribute('data-warning',String(invalid));
    limitsHint.textContent=invalid
      ?'NO ADMISIBLE · '+(width>maxEdge||height>maxEdge?'excede lado':'excede MP')+' · '+describeLimit()
      :'Salida prevista: '+width+' × '+height+' · '+(pixels/1e6).toFixed(1)+' MP';
    if(!isBusy)launch.disabled=invalid;
    if(!current)metricStatus.textContent=invalid?'REDUCE ESCALA':'PENDIENTE';
  };
  formatInput.addEventListener('change',refreshPrediction);
  scaleInput.addEventListener('change',refreshPrediction);
  const revoke=()=>{if(sourceUrl){URL.revokeObjectURL(sourceUrl);sourceUrl=null;}};
  const resetFrame=()=>{
    revoke();current=null;actualZoom=false;sourceMeta=null;
    before.removeAttribute('src');after.removeAttribute('src');
    before.hidden=after.hidden=true;
    placeholder.hidden=false;divider.hidden=handle.hidden=beforeLabel.hidden=afterLabel.hidden=true;
    slider.disabled=true;slider.value='50';slider.setAttribute('aria-valuenow','50');
    canvas.style.width='100%';canvas.style.height='100%';
    viewport.scrollLeft=0;viewport.scrollTop=0;
    compare.disabled=download.disabled=true;
    filename.textContent='SIN ARCHIVO SELECCIONADO';mode.textContent='IMAGEN ORIGINAL';
    for(const metric of [originalSize,outputSize,originalBytes,outputBytes,savings,metricStatus])metric.textContent='—';
    updateZoomButtons();
    refreshPrediction();
  };
  function draw(){
    if(!current)return;
    const fraction=Number(slider.value)/100;
    const boundary=viewport.scrollLeft+viewport.clientWidth*fraction;
    after.style.clipPath='inset(0 '+Math.max(0,canvas.clientWidth-boundary)+'px 0 0)';
    divider.style.left=(100*fraction)+'%';
    slider.setAttribute('aria-valuenow',slider.value);
    handle.setAttribute('aria-valuenow',slider.value);
  }
  function updateZoomButtons(){
    fit.setAttribute('aria-pressed',String(!actualZoom));
    pixels.setAttribute('aria-pressed',String(actualZoom));
  }
  function zoom(value){
    if(!current)return;
    actualZoom=value;
    canvas.style.width=value?current.result.width+'px':'100%';
    canvas.style.height=value?current.result.height+'px':'100%';
    viewport.scrollLeft=0;viewport.scrollTop=0;
    updateZoomButtons();draw();
  }
  slider.addEventListener('input',draw);
  viewport.addEventListener('scroll',draw,{passive:true});
  const slidePointer=event=>{
    if(!current)return;
    const rect=stage.getBoundingClientRect();
    if(!rect.width)return;
    slider.value=String(Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)/rect.width*100))));
    draw();
  };
  handle.addEventListener('pointerdown',event=>{
    if(!current)return;
    event.preventDefault();handle.setPointerCapture?.(event.pointerId);slidePointer(event);
  });
  handle.addEventListener('pointermove',event=>{
    if(event.buttons||event.pressure>0)slidePointer(event);
  });
  handle.addEventListener('keydown',event=>{
    if(!current)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();
      slider.value=String(Math.max(0,Math.min(100,Number(slider.value)+(event.key==='ArrowRight'?2:-2))));
      draw();
    }
  });
  const showSelection=(file,count)=>{
    resetFrame();
    if(!file)return;
    sourceUrl=URL.createObjectURL(file);
    before.src=sourceUrl;before.hidden=false;placeholder.hidden=true;
    filename.textContent=cut(file.name||'imagen');
    mode.textContent=count>1?count+' IMÁGENES SELECCIONADAS · VISTA DE LA PRIMERA':'ORIGINAL · PREVISUALIZACIÓN';
    originalBytes.textContent=human(file.size);
    metricStatus.textContent='PENDIENTE';
    const preview=new Image();
    preview.onload=()=>{
      if(before.src!==sourceUrl||!sourceUrl)return;
      originalSize.textContent=preview.naturalWidth+' × '+preview.naturalHeight;
      sourceMeta={width:preview.naturalWidth,height:preview.naturalHeight};
      refreshPrediction();
    };
    preview.src=sourceUrl;
  };
  const presentResult=(result,sourceFile,outputUrl,compareAction,downloadAction)=>{
    revoke();sourceUrl=URL.createObjectURL(sourceFile);
    before.src=sourceUrl;after.src=outputUrl;
    before.hidden=after.hidden=false;placeholder.hidden=true;
    divider.hidden=handle.hidden=beforeLabel.hidden=afterLabel.hidden=false;
    slider.disabled=false;slider.value='50';current={result,compare:compareAction,download:downloadAction};
    filename.textContent=cut(result.name);mode.textContent='ANTES / DESPUÉS · DESLIZA PARA COMPARAR';
    const beforeInfo=result.originalWidth+' × '+result.originalHeight+' · '+human(result.originalBytes);
    const afterInfo=result.width+' × '+result.height+' · '+human(result.blob.size);
    beforeLabel.querySelector('span').textContent=beforeInfo;
    afterLabel.querySelector('span').textContent=afterInfo;
    originalSize.textContent=result.originalWidth+' × '+result.originalHeight;
    outputSize.textContent=result.width+' × '+result.height;
    originalBytes.textContent=human(result.originalBytes);
    outputBytes.textContent=human(result.blob.size);
    const delta=result.originalBytes?((result.blob.size-result.originalBytes)/result.originalBytes*100):0;
    savings.textContent=(delta>0?'+':'')+delta.toFixed(1)+' %';
    metricStatus.textContent=formatLabel(result.format)+' · LISTO';
    sourceMeta={width:result.originalWidth,height:result.originalHeight};
    compare.disabled=download.disabled=false;zoom(false);
    requestAnimationFrame(draw);
  };
  const setBusy=(busy)=>{
    isBusy=busy;
    pickButton.disabled=busy;
    for(const button of choiceButtons)button.disabled=busy;
    refreshPrediction();
  };
  resetFrame();
  return {showSelection,presentResult,clearOutput:resetFrame,dispose:resetFrame,setBusy};
}
