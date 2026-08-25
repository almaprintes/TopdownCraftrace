import { getLanguage } from './index.js';

const EN_EXACT = new Map(Object.entries({
  'GARAJE':'GARAGE','COLECCIÓN':'COLLECTION','JUGADOR':'PLAYER','PLAYER':'PLAYER','COMÚN':'COMMON','POCO COMÚN':'UNCOMMON','RARO':'RARE','ÉPICO':'EPIC','LEGENDARIO':'LEGENDARY',
  'VEL PUNTA':'TOP SPEED','VELOCIDAD':'SPEED','ACELERACIÓN':'ACCELERATION','FRENADA':'BRAKING','AGARRE':'GRIP','CONTROL':'CONTROL',
  'EDITAR COCHE':'EDIT CAR','SELECCIONAR':'SELECT','SELECCIONADO':'SELECTED','SELECCIONADA':'SELECTED','VOLVER':'BACK','VER FICHA':'VIEW SPECS','EDITAR':'EDIT',
  'LONGITUD':'LENGTH','SECTORES':'SECTORS','SUPERFICIE':'SURFACE','ANCHO':'WIDTH','ASFALTO':'ASPHALT','TIERRA':'DIRT','HORARIO':'CLOCKWISE','ANTIHORARIO':'COUNTERCLOCKWISE',
  'ELIGE MODO DE JUEGO':'CHOOSE GAME MODE','Desliza el carrusel o usa las flechas':'Swipe the carousel or use the arrows','ÚLTIMO USADO':'LAST USED',
  '🏎️ DUELO · DISTANCIA':'🏎️ DUEL · DISTANCE','Elige la duración del duelo contra CPU1':'Choose the duel length against CPU1','CANCELAR':'CANCEL',
  'TDR WORKSHOP':'TDR WORKSHOP','1 · CONSIGUE  →  2 · FUSIONA  →  3 · GUARDA  →  4 · EQUIPA':'1 · COLLECT  →  2 · COMBINE  →  3 · STORE  →  4 · EQUIP',
  '← GARAGE':'← GARAGE','1 · ALMACÉN':'1 · STORAGE','MATERIALES':'MATERIALS','PIEZAS':'PARTS','NUEVA':'NEW','EQUIPADA':'EQUIPPED','EQUIPAR':'EQUIP',
  '2 · BANCO DE FUSIÓN':'2 · CRAFTING BENCH','RESULTADO  →  —':'RESULT  →  —','FABRICAR PIEZA':'CRAFT PART','SELECCIONA UNA RECETA':'SELECT A RECIPE','EJEMPLOS':'EXAMPLES',
  '▶ DUPLICAR ÚLTIMO BOTÍN':'▶ DOUBLE LAST LOOT','3 · COCHE / MONTAJE':'3 · CAR / LOADOUT','SIN PIEZA EQUIPADA':'NO PART EQUIPPED','FLUJO':'FLOW','Selecciona':'Select',
  'DUPLICAR BOTÍN':'DOUBLE LOOT','Botín duplicado':'Loot doubled','Ya reclamado':'Already claimed','Selecciona dos materiales':'Select two materials',
  'MOTOR':'ENGINE','FRENOS':'BRAKES','RUEDAS':'TIRES','NEUMÁTICOS':'TIRES','SUSPENSIÓN':'SUSPENSION','CAJA':'GEARBOX','TRANSMISIÓN':'TRANSMISSION',
  'VUELTA':'LAP','VUELTAS':'LAPS','VUELTAS LIMPIAS':'CLEAN LAPS','TIEMPO':'TIME','MEJOR VUELTA':'BEST LAP','POSICIÓN':'POSITION','VELOCIDAD MÁXIMA':'TOP SPEED',
  'PAUSA':'PAUSE','PAUSADO':'PAUSED','REANUDAR':'RESUME','REINICIAR':'RESTART','SALIR':'EXIT','RESULTADOS':'RESULTS','CONTINUAR':'CONTINUE','SIGUIENTE':'NEXT',
  'CARRERA':'RACE','CONTRARRELOJ':'TIME ATTACK','FANTASMA':'GHOST','SUPERVIVENCIA':'SURVIVAL','DUELO':'DUEL','ÁREA DE PRUEBAS':'PRACTICE AREA','PRÁCTICA':'PRACTICE',
  'CLASIFICACIÓN':'STANDINGS','PENALIZACIÓN':'PENALTY','PENALIZACIONES':'PENALTIES','META':'FINISH','SALIDA':'START','RÉCORD':'RECORD','NUEVO RÉCORD':'NEW RECORD',
  'INVENTARIO':'INVENTORY','TIENDA':'STORE','CONFIGURACIÓN':'SETTINGS','FÁBRICA':'FACTORY','CIRCUITOS':'TRACKS','MONEDAS':'COINS','PREMIO':'REWARD','RECLAMAR':'CLAIM',
  'CERRAR':'CLOSE','ACEPTAR':'ACCEPT','GUARDAR':'SAVE','RESTABLECER':'RESET','APLICAR':'APPLY','ACTIVADO':'ON','DESACTIVADO':'OFF','SÍ':'YES','NO':'NO'
}));

const EN_PHRASES = [
  ['Todo lo que fabricas aparece aquí, en la pestaña PIEZAS.','Everything you craft appears here under PARTS.'],
  ['Toca dos materiales del almacén.\nSi existe receta, verás el resultado antes de fabricar.','Tap two materials from storage.\nIf a recipe exists, you will see the result before crafting.'],
  ['Las piezas fabricadas se equipan desde ALMACÉN → PIEZAS.','Crafted parts are equipped from STORAGE → PARTS.'],
  ['AÚN NO HAS FABRICADO PIEZAS\n\nFusiona materiales en el banco central.','YOU HAVE NOT CRAFTED ANY PARTS YET\n\nCombine materials at the central bench.'],
  ['FABRICAR → se guarda en PIEZAS → pulsa EQUIPAR → aparece aquí','CRAFT → stored in PARTS → tap EQUIP → appears here'],
  ['Disco + ◆ Compuesto → Pastilla','Disc + ◆ Compound → Brake Pad'],
  ['Goma + ◆ Compuesto → Neumático','Rubber + ◆ Compound → Tire'],
  ['Muelle + ⬡ Aleación → Suspensión','Spring + ⬡ Alloy → Suspension'],
  ['Engranaje + ⬡ Aleación → Caja','Gear + ⬡ Alloy → Gearbox'],
  ['Disco','Disc'],['Compuesto','Compound'],['Goma','Rubber'],['Neumático','Tire'],['Muelle','Spring'],['Aleación','Alloy'],['Engranaje','Gear'],['Caja','Gearbox'],['Chatarra','Scrap'],['Electrónica','Electronics']
];

function translateString(input){
  if(getLanguage()!=='en')return input;
  let s=String(input??'');
  if(EN_EXACT.has(s))return EN_EXACT.get(s);

  if(/^\d+ VUELTAS$/.test(s))return s.replace('VUELTAS','LAPS');
  if(/^\d+ sectores$/i.test(s))return s.replace(/sectores/i,'sectors');
  if(/^Coche:\s*/i.test(s))return s.replace(/^Coche:/i,'Car:');
  if(/^Circuito:\s*/i.test(s))return s.replace(/^Circuito:/i,'Track:');
  if(/^FABRICADO · /i.test(s))s=s.replace(/^FABRICADO/i,'CRAFTED').replace(/ · guardado en PIEZAS$/i,' · stored in PARTS').replace(/ · guardado en MATERIALES$/i,' · stored in MATERIALS');
  if(/^EVOLUCIÓN · /i.test(s))s=s.replace(/^EVOLUCIÓN/i,'UPGRADE');
  if(/ equipada en /i.test(s))s=s.replace(/ equipada en /i,' equipped in ');

  const lineReplacements=[
    [/\bVEL PUNTA\b/g,'TOP SPEED'],[/\bACELERACIÓN\b/g,'ACCELERATION'],[/\bFRENADA\b/g,'BRAKING'],
    [/\bVUELTAS LIMPIAS\b/g,'CLEAN LAPS'],[/\bVUELTAS\b/g,'LAPS'],[/\bVUELTA\b/g,'LAP'],[/\bSECTORES\b/g,'SECTORS'],[/\bsectores\b/g,'sectors'],
    [/\bLONGITUD\b/g,'LENGTH'],[/\bSUPERFICIE\b/g,'SURFACE'],[/\bANCHO\b/g,'WIDTH'],[/\bTIERRA\b/g,'DIRT'],[/\bASFALTO\b/g,'ASPHALT'],
    [/\bSELECCIONAR\b/g,'SELECT'],[/\bSELECCIONADO\b/g,'SELECTED'],[/\bSELECCIONADA\b/g,'SELECTED'],[/\bVOLVER\b/g,'BACK'],[/\bCANCELAR\b/g,'CANCEL'],
    [/\bMATERIALES\b/g,'MATERIALS'],[/\bPIEZAS\b/g,'PARTS'],[/\bEQUIPAR\b/g,'EQUIP'],[/\bEQUIPADA\b/g,'EQUIPPED'],[/\bRESULTADO\b/g,'RESULT'],
    [/\bMONEDAS\b/g,'COINS'],[/\bPREMIO\b/g,'REWARD'],[/\bPROGRESO\b/g,'PROGRESS'],[/\bCIRCUITOS\b/g,'TRACKS'],
    [/\bFRENOS\b/g,'BRAKES'],[/\bRUEDAS\b/g,'TIRES'],[/\bSUSPENSIÓN\b/g,'SUSPENSION'],[/\bCAJA\b/g,'GEARBOX'],[/\bMOTOR\b/g,'ENGINE']
  ];
  for(const [from,to] of EN_PHRASES)s=s.split(from).join(to);
  for(const [re,to] of lineReplacements)s=s.replace(re,to);

  s=s.replace(/\b(Frenos|Neumático|Suspensión|Caja|Motor) Street\b/g,m=>m.replace('Frenos','Brakes').replace('Neumático','Tire').replace('Suspensión','Suspension').replace('Caja','Gearbox').replace('Motor','Engine'));
  s=s.replace(/\b(Frenos|Neumático|Suspensión|Caja|Motor) Sport\b/g,m=>m.replace('Frenos','Brakes').replace('Neumático','Tire').replace('Suspensión','Suspension').replace('Caja','Gearbox').replace('Motor','Engine'));
  s=s.replace(/\b(Frenos|Neumático|Suspensión|Caja|Motor) Racing\b/g,m=>m.replace('Frenos','Brakes').replace('Neumático','Tire').replace('Suspensión','Suspension').replace('Caja','Gearbox').replace('Motor','Engine'));
  s=s.replace(/\b(Frenos|Neumático|Suspensión|Caja|Motor) Prototype\b/g,m=>m.replace('Frenos','Brakes').replace('Neumático','Tire').replace('Suspensión','Suspension').replace('Caja','Gearbox').replace('Motor','Engine'));
  return s;
}

export function localizeLegacyText(value){
  if(Array.isArray(value))return value.map(localizeLegacyText);
  if(value==null)return value;
  return translateString(value);
}
