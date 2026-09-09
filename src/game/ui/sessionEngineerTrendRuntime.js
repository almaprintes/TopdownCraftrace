const NS='http://www.w3.org/2000/svg';

function parseTime(text){
  const value=String(text||'').trim();
  if(!value)return NaN;
  const match=value.match(/^(?:(\d+):)?(\d+)\.(\d{3})$/);
  if(!match)return NaN;
  const minutes=Number(match[1]||0),seconds=Number(match[2]||0),ms=Number(match[3]||0);
  return minutes*60000+seconds*1000+ms;
}

function fmtMs(ms){
  const value=Math.max(0,Number(ms)||0);
  const min=Math.floor(value/60000);
  const sec=(value-min*60000)/1000;
  return min?`${min}:${sec.toFixed(3).padStart(6,'0')}`:sec.toFixed(3);
}

function textOf(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim();}

function findReadingHeading(root){
  return [...root.querySelectorAll('*')].find(el=>!el.children?.length&&textOf(el).toUpperCase()==='LECTURA DE LA TANDA')||null;
}

function findReadingCard(heading){
  let node=heading?.parentElement||null;
  for(let i=0;node&&i<4;i++,node=node.parentElement){
    const txt=textOf(node);
    if(txt.toUpperCase().includes('LECTURA DE LA TANDA')&&txt.length>25)return node;
  }
  return heading?.parentElement||null;
}

function leafTexts(root){
  return [...root.querySelectorAll('*')]
    .filter(el=>!el.children?.length)
    .map(el=>({el,text:textOf(el)}))
    .filter(x=>x.text);
}

function findLapContainer(lapLeaf){
  let node=lapLeaf?.parentElement||null;
  for(let depth=0;node&&depth<6;depth++,node=node.parentElement){
    const leaves=leafTexts(node);
    const lapLeaves=leaves.filter(x=>/^V\d{1,3}$/i.test(x.text));
    const timeLeaves=leaves.filter(x=>Number.isFinite(parseTime(x.text)));
    if(lapLeaves.length===1&&timeLeaves.length>=1&&timeLeaves.length<=5)return node;
    if(lapLeaves.length>1)break;
  }
  return null;
}

function extractRows(root){
  const lapLeaves=leafTexts(root).filter(x=>/^V\d{1,3}$/i.test(x.text));
  const byLap=new Map();
  for(const lapLeaf of lapLeaves){
    const lap=Number(lapLeaf.text.slice(1));
    if(!Number.isInteger(lap)||lap<=0)continue;
    const row=findLapContainer(lapLeaf.el);
    if(!row)continue;
    const values=leafTexts(row)
      .filter(x=>x.el!==lapLeaf.el)
      .map(x=>x.text)
      .filter(text=>Number.isFinite(parseTime(text)));
    if(!values.length)continue;
    const total=parseTime(values[values.length-1]);
    if(!Number.isFinite(total)||total<=0)continue;
    byLap.set(lap,{lap,total});
  }
  return [...byLap.values()].sort((a,b)=>a.lap-b.lap);
}

function median(values){
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

function chartScale(times){
  const med=median(times);
  const regular=times.filter(v=>v<=med*2);
  const basis=regular.length>=2?regular:times;
  const min=Math.min(...basis),max=Math.max(...basis);
  return{min,max:Math.max(min+1,max)};
}

function makeSvg(rows){
  const w=760,h=150,padX=34,padTop=18,padBottom=34;
  const times=rows.map(r=>r.total),bestMs=Math.min(...times);
  const scale=chartScale(times),span=Math.max(1,scale.max-scale.min);
  const x=i=>rows.length===1?w/2:padX+i*((w-padX*2)/(rows.length-1));
  const y=value=>{
    const clipped=Math.min(scale.max,Math.max(scale.min,value));
    return padTop+((scale.max-clipped)/span)*(h-padTop-padBottom);
  };
  const bestIndex=times.indexOf(bestMs);
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio','none');
  svg.style.cssText='display:block;width:100%;height:118px;overflow:visible';
  const bg=document.createElementNS(NS,'rect');
  bg.setAttribute('x','0');bg.setAttribute('y','0');bg.setAttribute('width',String(w));bg.setAttribute('height',String(h));bg.setAttribute('rx','14');bg.setAttribute('fill','rgba(4,13,24,.35)');bg.setAttribute('stroke','rgba(108,164,199,.22)');
  svg.appendChild(bg);
  for(let i=0;i<3;i++){
    const gy=padTop+i*((h-padTop-padBottom)/2);
    const line=document.createElementNS(NS,'line');
    line.setAttribute('x1',String(padX));line.setAttribute('x2',String(w-padX));line.setAttribute('y1',String(gy));line.setAttribute('y2',String(gy));line.setAttribute('stroke','rgba(255,255,255,.07)');line.setAttribute('stroke-width','1');
    svg.appendChild(line);
  }
  const poly=document.createElementNS(NS,'polyline');
  poly.setAttribute('points',rows.map((r,i)=>`${x(i)},${y(r.total)}`).join(' '));
  poly.setAttribute('fill','none');poly.setAttribute('stroke','#5fe3c0');poly.setAttribute('stroke-width','4');poly.setAttribute('stroke-linecap','round');poly.setAttribute('stroke-linejoin','round');
  svg.appendChild(poly);
  rows.forEach((r,i)=>{
    const cx=x(i),cy=y(r.total),best=i===bestIndex,extreme=r.total>scale.max;
    const dot=document.createElementNS(NS,'circle');
    dot.setAttribute('cx',String(cx));dot.setAttribute('cy',String(cy));dot.setAttribute('r',best?'7':'5');dot.setAttribute('fill',best?'#65f2bd':extreme?'#f2c65f':'#dbe7f5');dot.setAttribute('stroke',best?'#b8ffe1':extreme?'#ffd98a':'#5fe3c0');dot.setAttribute('stroke-width',best?'3':'2');svg.appendChild(dot);
    const label=document.createElementNS(NS,'text');
    label.setAttribute('x',String(cx));label.setAttribute('y',String(h-12));label.setAttribute('text-anchor','middle');label.setAttribute('fill',best?'#65f2bd':'#9baabd');label.setAttribute('font-size','15');label.setAttribute('font-weight',best?'800':'700');label.textContent=`V${r.lap}`;svg.appendChild(label);
    if(best){
      const tag=document.createElementNS(NS,'text');tag.setAttribute('x',String(cx));tag.setAttribute('y',String(Math.max(13,cy-13)));tag.setAttribute('text-anchor','middle');tag.setAttribute('fill','#65f2bd');tag.setAttribute('font-size','12');tag.setAttribute('font-weight','900');tag.textContent=`MEJOR · ${fmtMs(r.total)} s`;svg.appendChild(tag);
    }else if(extreme){
      const tag=document.createElementNS(NS,'text');tag.setAttribute('x',String(cx));tag.setAttribute('y',String(Math.min(h-42,cy+17)));tag.setAttribute('text-anchor','middle');tag.setAttribute('fill','#f2c65f');tag.setAttribute('font-size','10');tag.setAttribute('font-weight','800');tag.textContent=`${fmtMs(r.total)} s`;svg.appendChild(tag);
    }
  });
  return svg;
}

function patchCard(root){
  const heading=findReadingHeading(root);if(!heading)return;
  const card=findReadingCard(heading);if(!card)return;
  const rows=extractRows(root);if(rows.length<2)return;
  if(card.querySelector('[data-tdr-session-trend="1"]'))return;
  const graph=document.createElement('div');
  graph.dataset.tdrSessionTrend='1';
  graph.style.cssText='margin:12px 0 14px;padding:10px 12px 6px;border-radius:14px;background:linear-gradient(180deg,rgba(10,28,45,.82),rgba(6,18,31,.62));border:1px solid rgba(95,227,192,.22);box-shadow:inset 0 0 22px rgba(51,201,169,.04)';
  const cap=document.createElement('div');
  cap.textContent='EVOLUCIÓN DE LA TANDA · MENOR TIEMPO = MEJOR';
  cap.style.cssText='font:800 11px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:.12em;color:#8fa4b8;margin:0 0 5px 2px';
  graph.append(cap,makeSvg(rows));
  heading.insertAdjacentElement('afterend',graph);
}

function scan(){
  if(typeof document==='undefined')return;
  const roots=[document.body,...document.querySelectorAll('[role="dialog"],.modal,.overlay')];
  for(const root of roots){try{patchCard(root);}catch{}}
}

if(typeof document!=='undefined'){
  const start=()=>{
    let queued=false;
    const schedule=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;scan();},90);};
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    schedule();
  };
  if(document.body)start();else addEventListener('DOMContentLoaded',start,{once:true});
}
