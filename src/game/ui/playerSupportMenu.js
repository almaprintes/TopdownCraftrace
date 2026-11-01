// One-tap help entry from the lobby header. No automatic telemetry/network calls.
import {getLanguage} from '../i18n/index.js';
import './playerSupportMenu.css';

let activeDispose=null;
const make=(tag,className='',label)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(label!==undefined)node.textContent=label;
  return node;
};

export function mountPlayerSupportMenu(){
  if(typeof document==='undefined')return ()=>{};
  activeDispose?.();
  const en=getLanguage()==='en';
  const tr=(es,english)=>en?english:es;
  const shade=make('div','tdr-support-shade');
  shade.dataset.tdrSupportMenu='1';
  shade.setAttribute('role','dialog');
  shade.setAttribute('aria-modal','true');
  shade.setAttribute('aria-label',tr('Ayuda y soporte','Help & support'));
  const panel=make('section','tdr-support-panel');
  const head=make('div','tdr-support-head');
  const header=make('div','');
  header.append(make('small','',tr('TOP DOWN RACE · SOPORTE','TOP DOWN RACE · SUPPORT')),
    make('h2','',tr('¿NECESITAS AYUDA?','NEED HELP?')));
  const close=make('button','tdr-support-close',tr('CERRAR','CLOSE'));
  close.type='button';close.setAttribute('aria-label',tr('Cerrar ayuda','Close help'));
  head.append(header,close);
  panel.append(head,make('p','tdr-support-intro',
    tr('Comunícanos un problema o comparte una idea para mejorar el juego.','Tell us about an issue or share an idea to improve the game.')));
  const choices=make('div','tdr-support-choices');

  function addChoice({symbol,name,description,category}){
    const button=make('button','tdr-support-choice');button.type='button';
    const ico=make('span','tdr-support-choice-icon',symbol);
    ico.setAttribute('aria-hidden','true');
    const body=make('span','tdr-support-choice-body');
    body.append(make('strong','',name),make('small','',description));
    button.append(ico,body);
    button.addEventListener('click',()=>void openForm(category));
    choices.append(button);
  }
  addChoice({
    symbol:'!',category:'performance',
    name:tr('INFORMAR DE UN ERROR','REPORT A BUG'),
    description:tr('Fallos, tirones, controles o problemas online','Crashes, slowdowns, controls or online issues')
  });
  addChoice({
    symbol:'✦',category:'other',
    name:tr('ENVIAR UNA SUGERENCIA','SEND A SUGGESTION'),
    description:tr('Ideas para coches, circuitos y mejoras','Ideas for cars, tracks and improvements')
  });
  panel.append(choices,
    make('p','tdr-support-note',
      tr('El envío es voluntario, requiere una cuenta online y puede estar desactivado temporalmente para proteger el servidor.',
         'Sending is voluntary, requires an online account and may be temporarily disabled to protect the server.')));
  shade.append(panel);document.body.append(shade);
  const previousFocus=document.activeElement;
  let closed=false;
  const onKey=(event)=>{if(event.key==='Escape')dispose();};
  document.addEventListener('keydown',onKey);
  close.addEventListener('click',dispose);
  shade.addEventListener('click',event=>{if(event.target===shade)dispose();});
  function dispose(){
    if(closed)return;
    closed=true;
    document.removeEventListener('keydown',onKey);
    shade.remove();
    if(activeDispose===dispose)activeDispose=null;
    try{previousFocus?.focus?.();}catch{}
  }
  async function openForm(category){
    dispose();
    try{
      const {mountPlayerFeedback}=await import('./playerFeedback.js');
      mountPlayerFeedback({category});
    }catch(error){console.warn('[tdr-help] feedback unavailable',error);}
  }
  activeDispose=dispose;
  close.focus();
  return dispose;
}
