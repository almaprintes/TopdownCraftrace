// Voluntary feedback opened from the lobby's Help & Support button.
import {submitPlayerFeedback,hasFeedbackAccount} from '../online/feedbackReports.js';
import './playerFeedback.css';

const make=(tag,cls,label)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(label!==undefined)el.textContent=label;
  return el;
};
export function mountPlayerFeedback({category:preferredCategory='performance'}={}){
  if(typeof document==='undefined')return ()=>{};
  document.querySelector('[data-tdr-feedback-modal]')?.remove();
  const root=make('div','tdr-feedback-modal');
  root.dataset.tdrFeedbackModal='1';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Informar de un problema');
  const panel=make('section','tdr-feedback-panel');
  const head=make('div','tdr-feedback-head');
  head.append(make('strong','','INFORMAR DE UN PROBLEMA'));
  const close=make('button','','CERRAR');close.type='button';
  head.append(close);panel.append(head);
  panel.append(make('p','','Tu opinión nos ayuda a mejorar Top Down RACE. Los informes se envían solo cuando pulsas ENVIAR.'));
  const category=make('select');category.setAttribute('aria-label','Tipo de problema');
  const options=[['performance','El juego va lento o da tirones'],['controls','Los controles fallan'],
    ['track','Problema con un circuito'],['online','Récords o funciones online'],['other','Otro problema o sugerencia']];
  for(const [value,label] of options){
    const option=make('option','',label);option.value=value;category.append(option);
  }
  category.value=['performance','controls','track','online','other'].includes(preferredCategory)?preferredCategory:'performance';
  const message=make('textarea');message.placeholder='¿Qué ocurrió? (mínimo 8 caracteres)';
  message.maxLength=1000;message.rows=4;
  const consent=make('label','tdr-feedback-consent');
  const check=make('input');check.type='checkbox';check.checked=false;
  consent.append(check,make('span','','Adjuntar datos técnicos básicos (plataforma, pantalla y últimos tipos de error; sin ubicación, correo ni identificadores del dispositivo).'));
  const actions=make('div','tdr-feedback-actions');
  const send=make('button','tdr-feedback-send','ENVIAR INFORME');send.type='button';
  const status=make('p','tdr-feedback-status','');status.setAttribute('role','status');
  actions.append(send);panel.append(category,message,consent,actions,status);
  const hint=make('p','tdr-feedback-hint',hasFeedbackAccount()?'Máximo 2 informes por cuenta y día.':
    'Para limitar el consumo de Supabase necesitas tener una cuenta online vinculada desde Ajustes → Cuenta.');
  panel.append(make('p','tdr-feedback-hint','El informe se asocia a tu ID de jugador para impedir abusos. No adjuntamos ubicación ni correo electrónico.'));
  panel.append(hint);
  root.append(panel);document.body.append(root);
  const previousFocus=document.activeElement;
  const onKey=e=>{if(e.key==='Escape')dispose();};
  document.addEventListener('keydown',onKey);
  function dispose(){
    document.removeEventListener('keydown',onKey);
    root.remove();try{previousFocus?.focus?.();}catch{}
  }
  close.onclick=dispose;
  root.addEventListener('click',e=>{if(e.target===root)dispose();});
  send.onclick=async()=>{
    if(send.disabled)return;
    send.disabled=true;status.textContent='Enviando…';
    try{
      await submitPlayerFeedback({category:category.value,message:message.value,includeDiagnostics:check.checked});
      status.textContent='¡Recibido! Gracias por ayudarnos a mejorar TDR.';
      message.value='';send.textContent='ENVIADO';
    }catch(error){
      status.textContent=error?.message||'El informe no se ha podido enviar.';
    }finally{send.disabled=false;}
  };
  setTimeout(()=>category.focus(),0);
  return dispose;
}
