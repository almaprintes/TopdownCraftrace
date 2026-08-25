const SETTINGS_KEY='tdr2:settings';

export const SUPPORTED_LANGUAGES=Object.freeze([
  Object.freeze({code:'es',label:'Español',nativeLabel:'Español'}),
  Object.freeze({code:'en',label:'English',nativeLabel:'English'})
]);

const DICTIONARIES=Object.freeze({
  es:Object.freeze({
    'settings.back':'← VOLVER',
    'settings.title':'CONFIGURACIÓN',
    'settings.saved':'Guardado automático ✓',
    'settings.controls':'CONTROLES',
    'settings.video':'VÍDEO',
    'settings.audio':'AUDIO',
    'settings.language':'IDIOMA',
    'settings.languageTitle':'IDIOMA DEL JUEGO',
    'settings.languageDesc':'Elige el idioma de la interfaz. La selección se guarda en este dispositivo.',
    'settings.languageActive':'Idioma activo',
    'settings.languageNote':'Español e inglés disponibles en la primera versión. Francés, alemán e italiano quedan preparados para una actualización posterior.',
    'settings.restartNote':'Los textos de otras pantallas usarán el nuevo idioma al volver a entrar en ellas.',
    'settings.customizeControls':'PERSONALIZAR CONTROLES',
    'settings.cancel':'← CANCELAR',
    'settings.reset':'RESTABLECER',
    'settings.cleanView':'VISTA LIMPIA',
    'settings.save':'GUARDAR',
    'settings.savedShort':'GUARDADO ✓'
  }),
  en:Object.freeze({
    'settings.back':'← BACK',
    'settings.title':'SETTINGS',
    'settings.saved':'Autosaved ✓',
    'settings.controls':'CONTROLS',
    'settings.video':'VIDEO',
    'settings.audio':'AUDIO',
    'settings.language':'LANGUAGE',
    'settings.languageTitle':'GAME LANGUAGE',
    'settings.languageDesc':'Choose the interface language. Your selection is saved on this device.',
    'settings.languageActive':'Active language',
    'settings.languageNote':'Spanish and English are available for the first release. French, German and Italian are ready to be added in a later update.',
    'settings.restartNote':'Other screens will use the new language the next time you open them.',
    'settings.customizeControls':'CUSTOMIZE CONTROLS',
    'settings.cancel':'← CANCEL',
    'settings.reset':'RESET',
    'settings.cleanView':'CLEAN VIEW',
    'settings.save':'SAVE',
    'settings.savedShort':'SAVED ✓'
  })
});

function normalizeLanguage(value){
  const code=String(value||'').trim().toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.some(x=>x.code===code)?code:null;
}

export function detectDeviceLanguage(){
  try{
    const candidates=[navigator?.language,...(navigator?.languages||[])];
    for(const candidate of candidates){
      const code=normalizeLanguage(candidate);
      if(code)return code;
    }
  }catch{}
  return 'en';
}

export function getLanguage(){
  try{
    const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return normalizeLanguage(settings?.language)||detectDeviceLanguage();
  }catch{return detectDeviceLanguage();}
}

export function setLanguage(language){
  const code=normalizeLanguage(language)||'en';
  try{
    const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    settings.language=code;
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  }catch{}
  try{document.documentElement.lang=code;}catch{}
  try{window.dispatchEvent(new CustomEvent('tdr2:language-change',{detail:{language:code}}));}catch{}
  return code;
}

export function t(key,params=null,language=getLanguage()){
  const lang=normalizeLanguage(language)||'en';
  const source=DICTIONARIES[lang]||DICTIONARIES.en;
  let value=source[key]??DICTIONARIES.en[key]??key;
  if(params&&typeof value==='string'){
    for(const [name,replacement] of Object.entries(params)){
      value=value.replaceAll(`{${name}}`,String(replacement));
    }
  }
  return value;
}

export function languageName(code){
  return SUPPORTED_LANGUAGES.find(x=>x.code===normalizeLanguage(code))?.nativeLabel||'English';
}

export function initLanguage(){
  const language=getLanguage();
  try{document.documentElement.lang=language;}catch{}
  return language;
}
