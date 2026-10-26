// Racing region is self-declared. Device hints reorder choices only, without
// saving or claiming the player's real location. ISO codes ensure stable joins.
const CONTINENTS=Object.freeze([
  ['AF','África','Africa'],['AS','Asia','Asia'],['EU','Europa','Europe'],
  ['NA','América del Norte y Central','North & Central America'],
  ['SA','América del Sur','South America'],['OC','Oceanía','Oceania'],
  ['AN','Antártida','Antarctica']
]);
const COUNTRY_CODES=Object.freeze(
  ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ')
);
const SPAIN_REGIONS=Object.freeze([
  ['ES-AN','Andalucía'],['ES-AR','Aragón'],['ES-AS','Asturias'],
  ['ES-CB','Cantabria'],['ES-CE','Ceuta'],['ES-CL','Castilla y León'],
  ['ES-CM','Castilla-La Mancha'],['ES-CN','Canarias'],
  ['ES-CT','Cataluña'],['ES-EX','Extremadura'],['ES-GA','Galicia'],
  ['ES-IB','Islas Baleares'],['ES-MC','Región de Murcia'],
  ['ES-MD','Comunidad de Madrid'],['ES-ML','Melilla'],
  ['ES-NC','Comunidad Foral de Navarra'],['ES-PV','País Vasco'],
  ['ES-RI','La Rioja'],['ES-VC','Comunitat Valenciana']
]);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const CONTINENT_FOR_HINT_COUNTRY=Object.freeze({
  ES:'EU',PT:'EU',GB:'EU',FR:'EU',DE:'EU',IT:'EU',NL:'EU',IE:'EU',PL:'EU',UA:'EU',
  US:'NA',CA:'NA',MX:'NA',CO:'SA',PE:'SA',BR:'SA',AR:'SA',CL:'SA',
  JP:'AS',CN:'AS',HK:'AS',IN:'AS',AE:'AS',KR:'AS',SG:'AS',
  EG:'AF',ZA:'AF',AU:'OC',NZ:'OC'
});
const COUNTRY_BY_TIME_ZONE=Object.freeze({
  'Atlantic/Canary':'ES','Europe/Madrid':'ES','Africa/Ceuta':'ES',
  'Europe/Lisbon':'PT','Europe/London':'GB','Europe/Paris':'FR',
  'Europe/Berlin':'DE','Europe/Rome':'IT','Europe/Amsterdam':'NL',
  'Europe/Dublin':'IE','Europe/Warsaw':'PL',
  'America/New_York':'US','America/Chicago':'US','America/Denver':'US',
  'America/Los_Angeles':'US','America/Toronto':'CA',
  'America/Mexico_City':'MX','America/Bogota':'CO',
  'America/Lima':'PE','America/Sao_Paulo':'BR',
  'America/Argentina/Buenos_Aires':'AR','America/Santiago':'CL',
  'Asia/Tokyo':'JP','Asia/Shanghai':'CN','Asia/Hong_Kong':'HK',
  'Asia/Kolkata':'IN','Asia/Dubai':'AE','Asia/Seoul':'KR',
  'Asia/Singapore':'SG','Africa/Cairo':'EG',
  'Africa/Johannesburg':'ZA','Australia/Sydney':'AU',
  'Pacific/Auckland':'NZ'
});
// Suggestions reorder only: no GPS, IP, fetch, storage or automatic selection.
export function suggestedRaceRankingGeography({timeZone=null,languages=null}={}){
  let zone='';
  try{zone=String(timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone??'');}catch{}
  let locales=languages;
  if(!Array.isArray(locales)){
    try{locales=[navigator.language,...(navigator.languages||[])];}catch{locales=[];}
  }
  let localeCountry='';
  for(const locale of locales){
    const parts=String(locale??'').replace(/_/g,'-').toUpperCase().split('-').slice(1);
    localeCountry=parts.find(part=>/^[A-Z]{2}$/.test(part)&&COUNTRY_CODES.includes(part))||'';
    if(localeCountry)break;
  }
  const candidate=COUNTRY_BY_TIME_ZONE[zone]||localeCountry;
  const countryCode=COUNTRY_CODES.includes(candidate)?candidate:'';
  const continentCode=CONTINENT_FOR_HINT_COUNTRY[countryCode]||
    (zone.startsWith('Europe/')?'EU':zone.startsWith('Africa/')?'AF':
     zone.startsWith('Asia/')?'AS':zone.startsWith('Australia/')?'OC':'');
  return {continentCode,countryCode,regionCode:zone==='Atlantic/Canary'&&countryCode==='ES'?'ES-CN':''};
}
function suggestedFirst(rows,code){
  if(!code)return rows;
  const row=rows.find(option=>option[0]===code);
  return row?[row,...rows.filter(option=>option[0]!==code)]:rows;
}

export const PILOT_UNKNOWN_REGION='XX';
export function hasDeclaredRaceGeography(profile){
  return !!profile&&CONTINENTS.some(a=>a[0]===profile.continent_code)&&COUNTRY_CODES.includes(profile.country_code);
}
export function resolveRaceRankingLocation({continentCode,countryCode,regionCode}={}){
  const continent=String(continentCode||'').trim().toUpperCase(),country=String(countryCode||'').trim().toUpperCase();
  if(!CONTINENTS.some(c=>c[0]===continent))throw new Error('Selecciona tu continente para los rankings online.');
  if(!COUNTRY_CODES.includes(country))throw new Error('Selecciona tu país para los rankings online.');
  let region='XX',entered=String(regionCode||'').trim();
  if(entered&&entered!=='XX'){
    if(country==='ES'){
      if(!SPAIN_REGIONS.some(r=>r[0]===entered))
        throw new Error('Selecciona una comunidad autónoma válida.');
      region=entered;
    }else{
      // Up to nine normalized alphanumeric characters after the country
      // prefix, respecting the existing Supabase VARCHAR(12) constraint.
      const suffix=entered.toUpperCase().startsWith(country+'-')?entered.slice(3):entered;
      const normalized=suffix.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,9);
      if(normalized)region=country+'-'+normalized;
    }
  }
  return {continentCode:continent,countryCode:country,regionCode:region};
}
const fieldStyle='height:37px;min-width:0;width:100%;box-sizing:border-box;border:1px solid #3e7184;border-radius:6px;background:#06131d;color:#fff;padding:0 9px;font:750 12px system-ui';
export function raceRankingFieldsHtml(en=false){
  const langs=en?'en':'es';
  let displayNames=null;
  try{displayNames=new Intl.DisplayNames([langs],{type:'region'});}catch{}
  const suggestion=suggestedRaceRankingGeography();
  const countryOptions=suggestedFirst(COUNTRY_CODES.map(code=>[code,displayNames?.of(code)||code])
    .sort((a,b)=>a[1].localeCompare(b[1],langs)),suggestion.countryCode)
    .map(([code,name])=>'<option value="'+code+'">'+escapeHtml(name)+' ('+code+')</option>').join('');
  return '<div data-ranking-geography style="display:grid;gap:6px;margin:12px 0 10px">' +
    '<div style="font:950 10px system-ui;letter-spacing:.08em;color:#62eaff">'+
    (en?'ONLINE RANKINGS · YOUR REGION':'RANKINGS ONLINE · TU REGIÓN')+'</div>'+
    '<div style="color:#9ab3c0;font:11px/1.4 system-ui">'+
    (en?'Choose your racing location to enter continental, country and regional rankings. You decide what to share; no GPS is used.':'Indica dónde quieres competir para aparecer en las tablas por continente, país y región. Tú eliges qué compartir; no usamos GPS.')+'</div>'+
    '<label style="color:#c6e5f1;font:800 10px system-ui">'+(en?'Continent':'Continente')+'</label>'+
    '<select data-geo-continent aria-label="'+(en?'Continent':'Continente')+'" style="'+fieldStyle+'"><option value="">'+(en?'Choose continent':'Elige continente')+'</option>'+
    suggestedFirst(CONTINENTS,suggestion.continentCode).map(c=>'<option value="'+c[0]+'">'+escapeHtml(c[en?2:1])+'</option>').join('')+'</select>'+
    '<label style="color:#c6e5f1;font:800 10px system-ui">'+(en?'Country':'País')+'</label>'+
    '<select data-geo-country aria-label="'+(en?'Country':'País')+'" style="'+fieldStyle+'"><option value="">'+(en?'Choose country':'Elige país')+'</option>'+countryOptions+'</select>'+
    '<label style="color:#c6e5f1;font:800 10px system-ui">'+(en?'Region (optional)':'Región / comunidad autónoma (opcional)')+'</label>'+
    '<select data-geo-es-region aria-label="'+(en?'Autonomous community':'Comunidad autónoma')+'" hidden style="'+fieldStyle+'"><option value="">'+(en?'Choose region or skip':'Elige región u omite')+'</option>'+
    suggestedFirst(SPAIN_REGIONS,suggestion.regionCode).map(([code,name])=>'<option value="'+code+'">'+escapeHtml(name)+'</option>').join('')+'</select>'+
    '<input data-geo-other-region aria-label="'+(en?'State or province':'Provincia o región')+'" maxlength="36" autocomplete="off" placeholder="'+(en?'State/province name or code':'Provincia, estado o región')+'" style="'+fieldStyle+'" />'+
    '<div style="color:#8da6b6;font:10px/1.35 system-ui">'+(en?'Region is optional. Without it you still appear in Global, Continent and Country; not Region.':'La región es opcional. Sin ella aparecerás en Global, Continente y País, pero no en Región.')+'</div></div>';
}
export function bindRaceRankingFields(root){
  const continent=root?.querySelector?.('[data-geo-continent]');
  const country=root?.querySelector?.('[data-geo-country]');
  const esRegion=root?.querySelector?.('[data-geo-es-region]');
  const otherRegion=root?.querySelector?.('[data-geo-other-region]');
  if(!continent||!country||!esRegion||!otherRegion)throw new Error('Formulario de región incompleto.');
  let touched=false;
  const refresh=()=>{
    const isSpain=country.value==='ES';
    esRegion.hidden=!isSpain;esRegion.disabled=!isSpain;
    otherRegion.hidden=isSpain;otherRegion.disabled=isSpain;
  };
  for(const field of [continent,country,esRegion,otherRegion])
    field.addEventListener('change',()=>{touched=true;refresh();});
  otherRegion.addEventListener('input',()=>{touched=true;});
  refresh();
  return {
    read:()=>resolveRaceRankingLocation({
      continentCode:continent.value,countryCode:country.value,
      regionCode:country.value==='ES'?esRegion.value:otherRegion.value
    }),
    prefill:profile=>{
      if(touched||!hasDeclaredRaceGeography(profile))return false;
      continent.value=profile.continent_code;
      country.value=profile.country_code;
      refresh();
      const region=String(profile.region_code||'');
      if(country.value==='ES')esRegion.value=SPAIN_REGIONS.some(r=>r[0]===region)?region:'';
      else otherRegion.value=region.startsWith(country.value+'-')?region.slice(3):'';
      return true;
    }
  };
}
export function invalidateLocalRaceRankingCaches(storage){
  // Only per-circuit leaderboard caches: never erase nick, ghosts, times,
  // published records, verified ads, wallet, rewards, or saved progress.
  try{
    for(let i=storage.length-1;i>=0;i--){
      const key=storage.key(i);
      if(key?.startsWith('tdr2:leaderboardSnapshot:'))storage.removeItem(key);
    }
  }catch{}
}
