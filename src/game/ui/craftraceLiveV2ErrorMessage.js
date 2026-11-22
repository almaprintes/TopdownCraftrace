// Human-readable LIVE 4 errors. Backend keeps stable English error codes;
// the UI displays the retry timestamp supplied by the server, not a guess.
const RETRY=/^retry_at_utc=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/;
export function liveV2ErrorMessage(error){
 const message=String(error?.message||'');
 if(message==='Room creation limit'){
  const match=RETRY.exec(String(error?.details||''));
  const timestamp=match?Date.parse(match[1]):NaN;
  if(Number.isFinite(timestamp)&&timestamp>Date.now()-60_000){
   const time=new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));
   const day=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit'}).format(new Date(timestamp));
   const today=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit'}).format(new Date());
   return 'Has alcanzado el límite temporal de creación de pistas. Podrás crear otra a partir de las '+time+
    (day===today?'':' del '+day)+'.';
  }
  return 'Has alcanzado el límite temporal de creación de pistas. Prueba de nuevo más tarde.';
 }
 return message||'Error al comunicar con la pista';
}
