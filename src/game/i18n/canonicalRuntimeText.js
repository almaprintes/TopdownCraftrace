import { getLanguage } from './index.js';

const PROPER_NAMES=new Set(['CIRCUITO ATLÁNTICO','KARTING TENERIFE','KARTING CANARIAS','RAVEN HOLLOW','SANTA CRUZ','SWITCHBACK PARK','TECHNICAL RIDGE','CHICANE VALE','BAKU','IMOLA','MONTE CARLO']);

const EXACT=new Map(Object.entries({
'GARAJE':'GARAGE','← GARAJE':'← GARAGE','COLECCIÓN':'COLLECTION','JUGADOR':'PLAYER','PILOTO':'DRIVER','COCHE':'CAR','COCHE ACTUAL':'CURRENT CAR','CIRCUITO':'TRACK','RIVAL':'RIVAL','CPU':'CPU','VOLVER':'BACK','← VOLVER':'← BACK','CERRAR':'CLOSE','CANCELAR':'CANCEL','ACEPTAR':'ACCEPT','CONTINUAR':'CONTINUE','SIGUIENTE':'NEXT','SALIR':'EXIT','SALIR AL MENÚ':'EXIT TO MENU','SELECCIONAR':'SELECT','SELECCIONADO':'SELECTED','SELECCIONADA':'SELECTED','EDITAR':'EDIT','GUARDAR':'SAVE','GUARDADO ✓':'SAVED ✓','RESTABLECER':'RESET','APLICAR':'APPLY','ACTIVADO':'ON','DESACTIVADO':'OFF','SÍ':'YES','NO':'NO',
'COMÚN':'COMMON','POCO COMÚN':'UNCOMMON','RARO':'RARE','ÉPICO':'EPIC','LEGENDARIO':'LEGENDARY','MAESTRÍA':'MASTERY','SIN NIVEL':'UNRANKED','POTENCIA':'POWER','RENDIMIENTO':'PERFORMANCE','VELOCIDAD':'SPEED','ACELERACIÓN':'ACCELERATION','FRENADA':'BRAKING','AGARRE':'GRIP','CONTROL':'CONTROL','GIRO':'TURNING','ESTABILIDAD':'STABILITY','DISTANCIA':'DISTANCE','PUNTA':'TOP SPEED','VEL PUNTA':'TOP SPEED','VELOCIDAD MEDIA':'AVERAGE SPEED','Velocidad media':'Average speed','VUELTA MEDIA':'AVERAGE LAP','Vuelta media':'Average lap',
'VUELTA':'LAP','VUELTAS':'LAPS','VUELTAS LIMPIAS':'CLEAN LAPS','TIEMPO':'TIME','MEJOR':'BEST','MEJOR VUELTA':'BEST LAP','POSICIÓN':'POSITION','TOTAL':'TOTAL','SECTOR':'SECTOR','SECTORES':'SECTORS','DIFERENCIA':'GAP','RÉCORD':'RECORD','ÚLTIMA VUELTA':'LAST LAP','VUELTA ACTUAL':'CURRENT LAP','RESULTADOS':'RESULTS','INFORME':'REPORT','RECOMPENSA':'REWARD','RECOMPENSAS':'REWARDS','BOTÍN':'LOOT','MONEDAS':'COINS',
'INVENTARIO':'INVENTORY','TIENDA':'STORE','CONFIGURACIÓN':'SETTINGS','FÁBRICA':'FACTORY','FABRICACIÓN':'CRAFTING','FABRICACIÓN DIRECTA':'DIRECT CRAFTING','ELIGE · REVISA · FABRICA':'CHOOSE · REVIEW · CRAFT','CIRCUITOS':'TRACKS','MATERIALES':'MATERIALS','PIEZA':'PART','PIEZAS':'PARTS','SIN EQUIPAR':'NOT EQUIPPED','EQUIPAR':'EQUIP','INSTALAR':'INSTALL','DESINSTALAR':'UNINSTALL','FABRICAR':'CRAFT','LISTO':'READY','CHATARRA':'SCRAP','Chatarra':'Scrap','ALEACIÓN':'ALLOY','Aleación':'Alloy','COMPUESTO':'COMPOUND','Compuesto':'Compound','GOMA':'RUBBER','Goma':'Rubber','ELECTRÓNICA':'ELECTRONICS','Electrónica':'Electronics','DISCO':'DISC','Disco':'Disc','MUELLE':'SPRING','Muelle':'Spring','ENGRANAJE':'GEAR','Engranaje':'Gear','CAJA':'GEARBOX','Caja':'Gearbox','NEUMÁTICO':'TIRE','Neumático':'Tire','MOTOR':'ENGINE','FRENOS':'BRAKES','RUEDAS':'TIRES','NEUMÁTICOS':'TIRES','SUSPENSIÓN':'SUSPENSION','TRANSMISIÓN':'TRANSMISSION',
'LAPS DE TESTERS':'TESTER LAPS','PEGA AQUÍ EL CÓDIGO TDRLAP1':'PASTE THE TDRLAP1 CODE HERE','Pega aquí el código TDRLAP1':'Paste the TDRLAP1 code here','IMPORTAR LAP':'IMPORT LAP','RECIBIDA':'RECEIVED','RECIBIDO':'RECEIVED',
'INFORME DE SESIÓN':'SESSION REPORT','SESIÓN EN PAUSA':'SESSION PAUSED','PAUSA':'PAUSE','REANUDAR':'RESUME','REINICIAR':'RESTART','MENÚ':'MENU','CLASIFICACIÓN':'STANDINGS','SESIÓN FINALIZADA':'SESSION COMPLETE','VER RESULTADOS':'VIEW RESULTS','VER INFORME':'VIEW REPORT',
'CONFIGURACIÓN 2.0':'SETTINGS','Guardado automático ✓':'Autosaved ✓','CONTROLES':'CONTROLS','VÍDEO':'VIDEO','AUDIO':'AUDIO','IDIOMA':'LANGUAGE','MODO DE DIRECCIÓN':'STEERING MODE','SENSIBILIDAD':'SENSITIVITY','MODO ZURDO':'LEFT-HANDED MODE','INVERTIR DIRECCIÓN':'INVERT STEERING','VOLANTE':'WHEEL','PALANCA':'STICK','MANDO':'GAMEPAD','BOTONES':'BUTTONS','GAS':'THROTTLE','FRENO':'BRAKE','FRENO DE MANO':'HANDBRAKE','VISTA LIMPIA':'CLEAN VIEW',
'PENDIENTE DE CONEXIÓN CON ANDROID':'PENDING ANDROID CONNECTION','Pendiente de conexión con Android':'Pending Android connection',
'SHIPATON 2026 · MODO JUECES':'SHIPATON 2026 · JUDGES MODE','MODO JUECES ACTIVO':'JUDGES MODE ACTIVE','MODO JUECES INACTIVO':'JUDGES MODE INACTIVE','GUÍA DEL JURADO':'JUDGES’ GUIDE','DESACTIVAR MODO JUECES':'DISABLE JUDGES MODE','ACTIVAR MODO JUECES':'ENABLE JUDGES MODE','Acceso de evaluación para ver y probar el contenido sin convertir ese acceso en progresión normal.':'Evaluation access to view and test content without turning that access into normal progression.'
}));

const REPLACEMENTS=[
[/\bMAESTRÍA\b/gi,'MASTERY'],[/\bSIN NIVEL\b/gi,'UNRANKED'],[/\bPOTENCIA\b/gi,'POWER'],[/\bRENDIMIENTO\b/gi,'PERFORMANCE'],[/\bFABRICACIÓN DIRECTA\b/gi,'DIRECT CRAFTING'],[/\bFABRICACIÓN\b/gi,'CRAFTING'],[/\bCOCHE ACTUAL\b/gi,'CURRENT CAR'],[/\bSIN EQUIPAR\b/gi,'NOT EQUIPPED'],[/\bCHATARRA\b/gi,'SCRAP'],[/\bALEACIÓN\b/gi,'ALLOY'],[/\bCOMPUESTO\b/gi,'COMPOUND'],[/\bELECTRÓNICA\b/gi,'ELECTRONICS'],[/\bNEUMÁTICOS?\b/gi,'TIRES'],[/\bMOTOR\b/gi,'ENGINE'],[/\bFRENOS\b/gi,'BRAKES'],[/\bSUSPENSIÓN\b/gi,'SUSPENSION'],[/\bTRANSMISIÓN\b/gi,'TRANSMISSION'],[/\bRECIBIDA\b/gi,'RECEIVED'],[/\bRECIBIDO\b/gi,'RECEIVED'],[/\bINFORME DE SESIÓN\b/gi,'SESSION REPORT'],[/\bVUELTAS LIMPIAS\b/gi,'CLEAN LAPS'],[/\bVUELTAS PREMIADAS\b/gi,'REWARDED LAPS'],[/\bVUELTA MEDIA\b/gi,'AVERAGE LAP'],[/\bVELOCIDAD MEDIA\b/gi,'AVERAGE SPEED'],[/\bVEL(?:OCIDAD)?\.?\s*PUNTA\b/gi,'TOP SPEED'],[/\bVUELTAS\b/gi,'LAPS'],[/\bVUELTA\b/gi,'LAP'],[/\bSECTORES\b/gi,'SECTORS'],[/\bLONGITUD\b/gi,'LENGTH'],[/\bSUPERFICIE\b/gi,'SURFACE'],[/\bDIRECCIÓN\b/gi,'DIRECTION'],[/\bVELOCIDAD\b/gi,'SPEED'],[/\bDISTANCIA\b/gi,'DISTANCE'],[/\bACELERACIÓN\b/gi,'ACCELERATION'],[/\bFRENADA\b/gi,'BRAKING'],[/\bAGARRE\b/gi,'GRIP'],[/\bRESULTADOS\b/gi,'RESULTS'],[/\bRECOMPENSAS\b/gi,'REWARDS'],[/\bRECOMPENSA\b/gi,'REWARD'],[/\bMONEDAS\b/gi,'COINS'],[/\bINFORME\b/gi,'REPORT']
];

function dynamicPatterns(s){
 s=s.replace(/^(\s*\d+\s+)CHATARRA(\s*→\s*\d+\s+)COMPUESTO\b/i,'$1SCRAP$2COMPOUND');
 s=s.replace(/^(\s*\d+\s+)ALEACIÓN(\s*→)/i,'$1ALLOY$2');
 s=s.replace(/\b(\d+)\s+VUELTAS\b/gi,'$1 LAPS');
 s=s.replace(/\bNIVEL\s+(\d+)\b/gi,'LEVEL $1');
 s=s.replace(/\b(\d+)\s+PIEZAS\b/gi,'$1 PARTS');
 s=s.replace(/\b(\d+)\s*\/\s*(\d+)\s*·\s*desliza por tus coches desbloqueados\b/gi,'$1 / $2 · swipe through your unlocked cars');
 return s;
}

export function canonicalRuntimeText(value){
 if(value==null||getLanguage()!=='en')return value;
 if(Array.isArray(value))return value.map(canonicalRuntimeText);
 let s=String(value),trimmed=s.trim();
 if(PROPER_NAMES.has(trimmed))return s;
 if(EXACT.has(trimmed)){const at=s.indexOf(trimmed);return s.slice(0,at)+EXACT.get(trimmed)+s.slice(at+trimmed.length);}
 s=dynamicPatterns(s);
 for(const [re,to] of REPLACEMENTS)s=s.replace(re,to);
 return s;
}

export function localizeDomTree(node){
 if(getLanguage()!=='en'||!node)return;
 if(node.nodeType===Node.TEXT_NODE){const old=node.nodeValue;if(old?.trim()){const next=canonicalRuntimeText(old);if(next!==old)node.nodeValue=next;}return;}
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 for(const attr of ['aria-label','title','placeholder','value']){const old=node.getAttribute?.(attr);if(old){const next=canonicalRuntimeText(old);if(next!==old)node.setAttribute(attr,next);}}
 for(const child of [...node.childNodes])localizeDomTree(child);
}
