import { getLanguage } from '../i18n/index.js';

const PREFIX='tdr2:onboarding:section:';

const COPY=Object.freeze({
  garage:{
    es:['BIENVENIDO A TU GARAJE','Aquí puedes ver tu colección de coches, consultar sus características y elegir con cuál quieres competir.'],
    en:['WELCOME TO YOUR GARAGE','Here you can view your car collection, check each car’s characteristics and choose which one you want to race.']
  },
  factory:{
    es:['BIENVENIDO A LA FÁBRICA','Aquí fabricas piezas con los materiales que consigues compitiendo y puedes instalarlas en el coche que tengas seleccionado.'],
    en:['WELCOME TO THE FACTORY','Here you craft parts with materials earned by racing and install them on your currently selected car.']
  },
  inventory:{
    es:['BIENVENIDO A TU INVENTARIO','Aquí puedes consultar los materiales y piezas que posees. Los materiales sirven para fabricar nuevas piezas.'],
    en:['WELCOME TO YOUR INVENTORY','Here you can review the materials and parts you own. Materials are used to craft new parts.']
  },
  store:{
    es:['BIENVENIDO A LA TIENDA','Aquí puedes conseguir recursos, recompensas y contenido disponible para ampliar tu progreso.'],
    en:['WELCOME TO THE STORE','Here you can obtain resources, rewards and available content to expand your progress.']
  },
  stats:{
    es:['BIENVENIDO A ESTADÍSTICAS','Aquí queda registrada tu trayectoria: kilómetros, carreras, récords, rendimiento y progreso de maestría con cada coche.'],
    en:['WELCOME TO STATISTICS','Your driving history lives here: mileage, races, records, performance and mastery progress for every car.']
  },
  tracks:{
    es:['BIENVENIDO A CIRCUITOS','Aquí eliges dónde competir. Cada circuito tiene sus propias características, récords y desafíos.'],
    en:['WELCOME TO TRACKS','Choose where to race here. Every track has its own characteristics, records and challenges.']
  },
  season:{
    es:['BIENVENIDO AL PASE DE TEMPORADA','Completa los objetivos de la temporada para avanzar por la ruta y conseguir sus recompensas.'],
    en:['WELCOME TO THE SEASON PASS','Complete seasonal objectives to advance along the route and earn its rewards.']
  },
  settings:{
    es:['BIENVENIDO A CONFIGURACIÓN','Aquí puedes adaptar controles, gráficos, sonido, idioma y opciones de tu cuenta a tu forma de jugar.'],
    en:['WELCOME TO SETTINGS','Adjust controls, graphics, audio, language and account options here to suit how you play.']
  }
});

const key=id=>`${PREFIX}${id}:v1`;
export const FIRST_VISIT_SECTION_IDS=Object.freeze(Object.keys(COPY));

export function hasSeenSectionTutorial(id){try{return localStorage.getItem(key(id))==='1';}catch{return false;}}
export function markSectionTutorialSeen(id){try{localStorage.setItem(key(id),'1');}catch{}}
export function resetFirstVisitTutorials(){
  try{
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(PREFIX))keys.push(k);}
    for(const k of keys)localStorage.removeItem(k);
    return keys.length;
  }catch{return 0;}
}

function installStyle(){
  if(document.getElementById('tdr-first-visit-style'))return;
  const style=document.createElement('style');style.id='tdr-first-visit-style';style.textContent=`
.tdr-first-visit{position:fixed;inset:0;z-index:39000;display:grid;place-items:center;padding:max(14px,var(--tdr-safe-top,8px)) max(14px,var(--tdr-safe-right,10px)) max(14px,var(--tdr-safe-bottom,8px)) max(14px,var(--tdr-safe-left,10px));background:rgba(1,6,10,.72);backdrop-filter:blur(7px);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.tdr-first-visit__panel{width:min(590px,92vw);border:1px solid rgba(75,222,255,.72);border-radius:16px;background:linear-gradient(180deg,#102330,#071017);box-shadow:0 24px 72px rgba(0,0,0,.62),0 0 28px rgba(52,208,255,.1);padding:clamp(17px,3vh,25px);color:#fff;text-align:center}
.tdr-first-visit__eyebrow{font-size:9px;font-weight:1000;letter-spacing:.18em;color:#62ddff}.tdr-first-visit h2{margin:6px 0 9px;font-size:clamp(20px,4.4vh,30px);line-height:1.02}.tdr-first-visit p{max-width:500px;margin:0 auto;color:#c7d7df;font-size:clamp(11px,2.5vh,14px);line-height:1.45}.tdr-first-visit button{margin-top:17px;min-width:150px;min-height:40px;padding:0 22px;border:1px solid #62ddff;border-radius:9px;background:#123c4d;color:#fff;font-weight:1000;letter-spacing:.07em}.tdr-first-visit button:active{transform:scale(.98);filter:brightness(1.12)}
`;
  document.head.appendChild(style);
}

export function showFirstVisitTutorial(id,{delay=0}={}){
  if(!COPY[id]||hasSeenSectionTutorial(id))return false;
  const show=()=>{
    if(hasSeenSectionTutorial(id)||document.querySelector('.tdr-first-visit'))return;
    installStyle();
    const en=getLanguage()==='en',copy=COPY[id][en?'en':'es'];
    const root=document.createElement('div');root.className='tdr-first-visit';root.dataset.section=id;
    root.innerHTML=`<div class="tdr-first-visit__panel" role="dialog" aria-modal="true"><div class="tdr-first-visit__eyebrow">${en?'FIRST VISIT':'PRIMERA VISITA'}</div><h2>${copy[0]}</h2><p>${copy[1]}</p><button type="button">${en?'GOT IT':'ENTENDIDO'}</button></div>`;
    const close=()=>{markSectionTutorialSeen(id);root.remove();};
    root.querySelector('button')?.addEventListener('click',close);
    document.body.appendChild(root);
  };
  if(delay>0)window.setTimeout(show,delay);else show();
  return true;
}
