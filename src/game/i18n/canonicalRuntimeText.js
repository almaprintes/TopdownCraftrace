import { getLanguage } from './index.js';

const PROPER_NAMES=new Set(['CIRCUITO ATLÁNTICO','KARTING TENERIFE','KARTING CANARIAS','RAVEN HOLLOW','SANTA CRUZ','SWITCHBACK PARK','TECHNICAL RIDGE','CHICANE VALE','BAKU','IMOLA','MONTE CARLO','MIAMI','HÉLIX SPARK']);

const EXACT=new Map(Object.entries({
'GARAJE':'GARAGE','← GARAJE':'← GARAGE','COLECCIÓN':'COLLECTION','JUGADOR':'PLAYER','PILOTO':'DRIVER','COCHE':'CAR','COCHE ACTUAL':'CURRENT CAR','CIRCUITO':'TRACK','RIVAL':'RIVAL','CPU':'CPU','VOLVER':'BACK','← VOLVER':'← BACK','CERRAR':'CLOSE','CANCELAR':'CANCEL','ACEPTAR':'ACCEPT','CONTINUAR':'CONTINUE','SIGUIENTE':'NEXT','SALIR':'EXIT','SALIR AL MENÚ':'EXIT TO MENU','SELECCIONAR':'SELECT','SELECCIONAR CIRCUITO':'SELECT TRACK','SELECCIONADO':'SELECTED','SELECCIONADA':'SELECTED','EDITAR':'EDIT','GUARDAR':'SAVE','GUARDADO ✓':'SAVED ✓','RESTABLECER':'RESET','APLICAR':'APPLY','ACTIVADO':'ON','DESACTIVADO':'OFF','SÍ':'YES','NO':'NO',
'COMÚN':'COMMON','POCO COMÚN':'UNCOMMON','RARO':'RARE','ÉPICO':'EPIC','LEGENDARIO':'LEGENDARY','MAESTRÍA':'MASTERY','SIN NIVEL':'UNRANKED','POTENCIA':'POWER','RENDIMIENTO':'PERFORMANCE','VELOCIDAD':'SPEED','ACELERACIÓN':'ACCELERATION','FRENADA':'BRAKING','AGARRE':'GRIP','CONTROL':'CONTROL','GIRO':'TURNING','ESTABILIDAD':'STABILITY','DISTANCIA':'DISTANCE','PUNTA':'TOP SPEED','VEL PUNTA':'TOP SPEED','VELOCIDAD MEDIA':'AVERAGE SPEED','Velocidad media':'Average speed','VUELTA MEDIA':'AVERAGE LAP','Vuelta media':'Average lap',
'VUELTA':'LAP','VUELTAS':'LAPS','VUELTAS LIMPIAS':'CLEAN LAPS','TIEMPO':'TIME','MEJOR':'BEST','MEJOR VUELTA':'BEST LAP','POSICIÓN':'POSITION','TOTAL':'TOTAL','SECTOR':'SECTOR','SECTORES':'SECTORS','DIFERENCIA':'GAP','RÉCORD':'RECORD','ÚLTIMA VUELTA':'LAST LAP','VUELTA ACTUAL':'CURRENT LAP','RESULTADOS':'RESULTS','INFORME':'REPORT','RECOMPENSA':'REWARD','RECOMPENSAS':'REWARDS','BOTÍN':'LOOT','MONEDAS':'COINS','TIERRA':'DIRT','ASFALTO':'ASPHALT','LONGITUD':'LENGTH','SUPERFICIE':'SURFACE','CIRCUITO SELECCIONADO':'SELECTED TRACK',
'INVENTARIO':'INVENTORY','TIENDA':'STORE','CONFIGURACIÓN':'SETTINGS','FÁBRICA':'FACTORY','FABRICACIÓN':'CRAFTING','FABRICACIÓN DIRECTA':'DIRECT CRAFTING','ELIGE · REVISA · FABRICA':'CHOOSE · REVIEW · CRAFT','CIRCUITOS':'TRACKS','MATERIALES':'MATERIALS','PIEZA':'PART','PIEZAS':'PARTS','SIN EQUIPAR':'NOT EQUIPPED','EQUIPAR':'EQUIP','INSTALAR':'INSTALL','DESINSTALAR':'UNINSTALL','FABRICAR':'CRAFT','LISTO':'READY','CHATARRA':'SCRAP','Chatarra':'Scrap','ALEACIÓN':'ALLOY','Aleación':'Alloy','COMPUESTO':'COMPOUND','Compuesto':'Compound','GOMA':'RUBBER','Goma':'Rubber','ELECTRÓNICA':'ELECTRONICS','Electrónica':'Electronics','DISCO':'DISC','Disco':'Disc','MUELLE':'SPRING','Muelle':'Spring','ENGRANAJE':'GEAR','Engranaje':'Gear','CAJA':'GEARBOX','Caja':'Gearbox','NEUMÁTICO':'TIRE','Neumático':'Tire','MOTOR':'ENGINE','FRENOS':'BRAKES','RUEDAS':'TIRES','NEUMÁTICOS':'TIRES','SUSPENSIÓN':'SUSPENSION','TRANSMISIÓN':'TRANSMISSION',
'LAPS DE TESTERS':'TESTER LAPS','PEGA AQUÍ EL CÓDIGO TDRLAP1':'PASTE THE TDRLAP1 CODE HERE','Pega aquí el código TDRLAP1':'Paste the TDRLAP1 code here','IMPORTAR LAP':'IMPORT LAP','RECIBIDA':'RECEIVED','RECIBIDO':'RECEIVED',
'INFORME DE SESIÓN':'SESSION REPORT','SESIÓN EN PAUSA':'SESSION PAUSED','PAUSA':'PAUSE','REANUDAR':'RESUME','REINICIAR':'RESTART','MENÚ':'MENU','MENÚ DE CARRERA':'RACE MENU','Menú de carrera':'Race menu','CLASIFICACIÓN':'STANDINGS','SESIÓN FINALIZADA':'SESSION COMPLETE','VER RESULTADOS':'VIEW RESULTS','VER INFORME':'VIEW REPORT','CAPTURA MUNDO':'WORLD CAPTURE','CAPTURA TÉCNICA':'TECHNICAL CAPTURE','FINALIZAR SESIÓN':'END SESSION','ABANDONAR SESIÓN':'ABANDON SESSION','Las capturas se realizan con la pausa cerrada y el HUD oculto.':'Captures are taken with the pause menu closed and the HUD hidden.','EXPORTAR':'EXPORT',
'ARRANCAR MOTOR':'START ENGINE','MOTOR ARRANCADO':'ENGINE STARTED','ARRANCAR ENGINE':'START ENGINE','ENGINE ARRANCADO':'ENGINE STARTED','LAP RÁPIDA':'FASTEST LAP','VUELTA RÁPIDA':'FASTEST LAP','MEJOR DE LA SESIÓN':'SESSION BEST','TRAZADA':'RACING LINE','ANÁLISIS':'ANALYSIS','ANÁLISIS TRAZADA':'RACING LINE ANALYSIS','RITMO':'PACE','MUNDO':'WORLD','ESPAÑA':'SPAIN','CANARIAS':'CANARY ISLANDS','AMIGOS':'FRIENDS',
'CONFIGURACIÓN 2.0':'SETTINGS','Guardado automático ✓':'Autosaved ✓','CONTROLES':'CONTROLS','VÍDEO':'VIDEO','AUDIO':'AUDIO','IDIOMA':'LANGUAGE','MODO DE DIRECCIÓN':'STEERING MODE','SENSIBILIDAD':'SENSITIVITY','MODO ZURDO':'LEFT-HANDED MODE','INVERTIR DIRECCIÓN':'INVERT STEERING','VOLANTE':'WHEEL','PALANCA':'STICK','MANDO':'GAMEPAD','BOTONES':'BUTTONS','GAS':'THROTTLE','Gas':'Throttle','FRENO':'BRAKE','Freno':'Brake','FRENO DE MANO':'HANDBRAKE','VISTA LIMPIA':'CLEAN VIEW','MODO SILENCIO':'MUTE','Apaga todo el audio.':'Mutes all audio.','VOLUMEN GENERAL':'MASTER VOLUME','EFECTOS':'EFFECTS','IMPACTOS':'IMPACTS','Elige el control principal para conducir.':'Choose your primary steering control.','DISPOSICIÓN EN PANTALLA':'ON-SCREEN LAYOUT','Coloca y escala tus controles con precisión. Cada modo y cada mano conservan su propia distribución.':'Position and scale your controls precisely. Each mode and handedness keeps its own layout.','PERSONALIZAR CONTROLES':'CUSTOMIZE CONTROLS','Arrastrar · tamaño · zonas protegidas · prueba de alcance':'Drag · size · safe zones · reach test',
'USO DE CONTROLES':'CONTROL USAGE','Coasting':'Coasting','Frenadas':'BRAKING EVENTS','FRENADAS':'BRAKING EVENTS','BRAKING más larga':'LONGEST BRAKING','FRENADA más larga':'LONGEST BRAKING','LAPS · SECTORS':'LAPS · SECTORS','MEJOR DE LA SESIÓN':'SESSION BEST','RÉCORD DE SECTOR':'SECTOR RECORD','LECTURA DE LA TANDA':'RUN ANALYSIS','EXIT':'EXIT',
'PENDIENTE DE CONEXIÓN CON ANDROID':'PENDING ANDROID CONNECTION','Pendiente de conexión con Android':'Pending Android connection',
'SHIPATON 2026 · MODO JUECES':'SHIPATON 2026 · JUDGES MODE','SHIP-A-TON ’26 · MODO JUECES':'SHIP-A-TON ’26 · JUDGES MODE','SHIP-A-TON \'26 · MODO JUECES':'SHIP-A-TON \'26 · JUDGES MODE','MODO JUECES':'JUDGES MODE','MODO JUECES ACTIVO':'JUDGES MODE ACTIVE','MODO JUECES INACTIVO':'JUDGES MODE INACTIVE','GUÍA DEL JURADO':'JUDGES’ GUIDE','DESACTIVAR MODO JUECES':'DISABLE JUDGES MODE','ACTIVAR MODO JUECES':'ENABLE JUDGES MODE','Acceso de evaluación para ver y probar el contenido sin convertir ese acceso en progresión normal.':'Evaluation access to view and test content without turning that access into normal progression.'
}));

const REPLACEMENTS=[
[/\bARRANCAR\s+(?:MOTOR|ENGINE)\b/gi,'START ENGINE'],[/\b(?:MOTOR|ENGINE)\s+ARRANCADO\b/gi,'ENGINE STARTED'],[/\bBRAKING\s+MÁS\s+LARGA\b/gi,'LONGEST BRAKING'],[/\bFRENADA\s+MÁS\s+LARGA\b/gi,'LONGEST BRAKING'],[/\bMEJOR DE LA SESIÓN\b/gi,'SESSION BEST'],[/\bRÉCORD DE SECTOR\b/gi,'SECTOR RECORD'],[/\bLECTURA DE LA TANDA\b/gi,'RUN ANALYSIS'],[/\bUSO DE CONTROLES\b/gi,'CONTROL USAGE'],[/\bLAP RÁPIDA\b/gi,'FASTEST LAP'],[/\bVUELTA RÁPIDA\b/gi,'FASTEST LAP'],[/\bANÁLISIS TRAZADA\b/gi,'RACING LINE ANALYSIS'],[/\bANÁLISIS\b/gi,'ANALYSIS'],[/\bTRAZADA\b/gi,'RACING LINE'],[/\bRITMO\b/gi,'PACE'],[/\bMODO JUECES\b/gi,'JUDGES MODE'],[/\bMAESTRÍA\b/gi,'MASTERY'],[/\bSIN NIVEL\b/gi,'UNRANKED'],[/\bPOTENCIA\b/gi,'POWER'],[/\bRENDIMIENTO\b/gi,'PERFORMANCE'],[/\bFABRICACIÓN DIRECTA\b/gi,'DIRECT CRAFTING'],[/\bFABRICACIÓN\b/gi,'CRAFTING'],[/\bCOCHE ACTUAL\b/gi,'CURRENT CAR'],[/\bSIN EQUIPAR\b/gi,'NOT EQUIPPED'],[/\bCHATARRA\b/gi,'SCRAP'],[/\bALEACIÓN\b/gi,'ALLOY'],[/\bCOMPUESTO\b/gi,'COMPOUND'],[/\bELECTRÓNICA\b/gi,'ELECTRONICS'],[/\bNEUMÁTICOS?\b/gi,'TIRES'],[/\bMOTOR\b/gi,'ENGINE'],[/\bFRENOS\b/gi,'BRAKES'],[/\bSUSPENSIÓN\b/gi,'SUSPENSION'],[/\bTRANSMISIÓN\b/gi,'TRANSMISSION'],[/\bRECIBIDA\b/gi,'RECEIVED'],[/\bRECIBIDO\b/gi,'RECEIVED'],[/\bINFORME DE SESIÓN\b/gi,'SESSION REPORT'],[/\bVUELTAS LIMPIAS\b/gi,'CLEAN LAPS'],[/\bVUELTAS PREMIADAS\b/gi,'REWARDED LAPS'],[/\bVUELTA MEDIA\b/gi,'AVERAGE LAP'],[/\bVELOCIDAD MEDIA\b/gi,'AVERAGE SPEED'],[/\bVEL(?:OCIDAD)?\.?\s*PUNTA\b/gi,'TOP SPEED'],[/\bVUELTAS\b/gi,'LAPS'],[/\bVUELTA\b/gi,'LAP'],[/\bSECTORES\b/gi,'SECTORS'],[/\bLONGITUD\b/gi,'LENGTH'],[/\bSUPERFICIE\b/gi,'SURFACE'],[/\bASFALTO\b/gi,'ASPHALT'],[/\bTIERRA\b/gi,'DIRT'],[/\bDIRECCIÓN\b/gi,'DIRECTION'],[/\bVELOCIDAD\b/gi,'SPEED'],[/\bDISTANCIA\b/gi,'DISTANCE'],[/\bACELERACIÓN\b/gi,'ACCELERATION'],[/\bFRENADA\b/gi,'BRAKING'],[/\bAGARRE\b/gi,'GRIP'],[/\bRESULTADOS\b/gi,'RESULTS'],[/\bRECOMPENSAS\b/gi,'REWARDS'],[/\bRECOMPENSA\b/gi,'REWARD'],[/\bMONEDAS\b/gi,'COINS'],[/\bINFORME\b/gi,'REPORT']
];

function dynamicPatterns(s){
 s=s.replace(/^(\s*\d+\s+)CHATARRA(\s*→\s*\d+\s+)COMPUESTO\b/i,'$1SCRAP$2COMPOUND');
 s=s.replace(/^(\s*\d+\s+)ALEACIÓN(\s*→)/i,'$1ALLOY$2');
 s=s.replace(/\b1\s+VUELTAS\b/gi,'1 LAP');
 s=s.replace(/\b(\d+)\s+VUELTAS\b/gi,'$1 LAPS');
 s=s.replace(/\b1\s+LAPS\b/gi,'1 LAP');
 s=s.replace(/\bNIVEL\s+(\d+)\b/gi,'LEVEL $1');
 s=s.replace(/\b(\d+)\s+PIEZAS\b/gi,'$1 PARTS');
 s=s.replace(/\b(\d+)\s*\/\s*(\d+)\s*·\s*desliza por tus coches desbloqueados\b/gi,'$1 / $2 · swipe through your unlocked cars');
 s=s.replace(/Primera referencia de la tanda:\s*([^.]*)\.\s*Necesitamos más LAPS para leer la evolución del ritmo\./gi,'First reference of the run: $1. We need more laps to assess pace evolution.');
 s=s.replace(/Primera referencia de la tanda:\s*([^.]*)\.\s*Necesitamos más vueltas para leer la evolución del ritmo\./gi,'First reference of the run: $1. We need more laps to assess pace evolution.');
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
