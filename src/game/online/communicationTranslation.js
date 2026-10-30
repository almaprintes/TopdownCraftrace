// Optional on-demand assisted translation for DEV Paddock authoring.
// Only called after an administrator presses "Traducir al inglés".
// The translated text is untrusted: it must be reviewed before publishing.
// MyMemory's documented GET endpoint has a 500-byte UTF-8 per-segment limit.
export const TRANSLATOR_NAME='MyMemory';
const TRANSLATOR_URL='https://api.mymemory.translated.net/get';
const MAX_BYTES=450;
const encoder=new TextEncoder();
const utf8Size=value=>encoder.encode(value).byteLength;

export function splitTranslationSegments(text){
  const value=String(text||'');
  if(!value)return [];
  const segments=[];
  // Keep original paragraph breaks. Never batch several paragraphs into
  // one API request (the provider disallows multi-paragraph lookups).
  for(const part of value.split(/(\n+)/)){
    if(!part)continue;
    if(/^\n+$/.test(part)){segments.push({text:part,translate:false});continue;}
    let current='';
    const flush=()=>{if(current){segments.push({text:current,translate:!!current.trim()});current='';}};
    for(const fragment of (part.match(/\s+|\S+/g)||[])){
      if(utf8Size(current+fragment)<=MAX_BYTES){current+=fragment;continue;}
      flush();
      if(utf8Size(fragment)<=MAX_BYTES){current=fragment;continue;}
      // Unusually long words are split on codepoint, never in UTF-8 middle.
      for(const character of fragment){
        if(utf8Size(current+character)>MAX_BYTES)flush();
        current+=character;
      }
    }
    flush();
  }
  return segments;
}

function decodeEntities(value){
  const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(full,entity)=>{
    const key=entity.toLowerCase();
    if(Object.hasOwn(named,key))return named[key];
    const code=key.startsWith('#x')?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
    return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)
      ?String.fromCodePoint(code):full;
  });
}

async function translateSegment(span,fetchFn){
  if(!span.translate)return span.text;
  const query=new URLSearchParams({q:span.text.trim(),langpair:'es|en',mt:'1'});
  let response;
  try{
    response=await fetchFn(TRANSLATOR_URL+'?'+query.toString(),{
      method:'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
      signal:AbortSignal.timeout(12000)
    });
  }catch{throw Error('No se pudo conectar con el traductor. Prueba de nuevo más tarde.');}
  if(!response?.ok)throw Error('El traductor no está disponible (HTTP '+(response?.status||'?')+').');
  const data=await response.json().catch(()=>null);
  if(Number(data?.responseStatus)!==200||data?.quotaFinished===true)
    throw Error('El servicio de traducción ha agotado su cuota o ha rechazado el texto.');
  const translated=decodeEntities(data?.responseData?.translatedText||'').trim();
  if(!translated||/MYMEMORY WARNING|QUERY LENGTH LIMIT EXCEEDED/i.test(translated))
    throw Error('El servicio no ha devuelto una traducción válida.');
  // Preserve whitespace surrounding each translated segment.
  const prefix=span.text.match(/^\s*/)?.[0]||'';
  const suffix=span.text.match(/\s*$/)?.[0]||'';
  return prefix+translated+suffix;
}
async function translateField(source,fetchFn){
  if(!String(source||'').trim())return '';
  const chunks=splitTranslationSegments(source);
  const translated=[];
  for(const segment of chunks)translated.push(await translateSegment(segment,fetchFn));
  return translated.join('').trim();
}

export async function translateCommunicationDraft({title,body,actionLabel=''},fetchFn=globalThis.fetch){
  if(!String(title||'').trim()||!String(body||'').trim())
    throw Error('Escribe primero el título y el mensaje en español.');
  if(typeof fetchFn!=='function')throw Error('El servicio de traducción no está disponible.');
  const enTitle=await translateField(title,fetchFn);
  const enBody=await translateField(body,fetchFn);
  const enLabel=String(actionLabel||'').trim()
    ?await translateField(actionLabel,fetchFn):'';
  if(!enTitle||!enBody)throw Error('La traducción está incompleta.');
  return {title:enTitle,body:enBody,action_label:enLabel||null};
}
