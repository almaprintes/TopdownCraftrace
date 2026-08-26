import { getLanguage } from './index.js';

// Compatibility layer for UI that has not yet been migrated to t('key').
// IMPORTANT: this is the ONLY place where rendered Spanish text may be mapped
// to English. DOM, Phaser and legacy bridges all delegate here, so a phrase can
// no longer receive different translations depending on device/render path.

const PROPER_NAMES=new Set([
  'CIRCUITO ATLÁNTICO','KARTING TENERIFE','KARTING CANARIAS','RAVEN HOLLOW','SANTA CRUZ',
  'SWITCHBACK PARK','TECHNICAL RIDGE','CHICANE VALE','BAKU','IMOLA','MONTE CARLO'
]);

const EXACT=new Map(Object.entries({
  // Navigation / common
  'GARAJE':'GARAGE','COLECCIÓN':'COLLECTION','JUGADOR':'PLAYER','PLAYER':'PLAYER','PILOTO':'DRIVER','COCHE':'CAR','CIRCUITO':'TRACK','RIVAL':'RIVAL','CPU':'CPU',
  'VOLVER':'BACK','← VOLVER':'← BACK','CERRAR':'CLOSE','CANCELAR':'CANCEL','← CANCELAR':'← CANCEL','ACEPTAR':'ACCEPT','CONTINUAR':'CONTINUE','SIGUIENTE':'NEXT','SALIR':'EXIT','SALIR AL MENÚ':'EXIT TO MENU',
  'SELECCIONAR':'SELECT','SELECCIONADO':'SELECTED','SELECCIONADA':'SELECTED','EDITAR':'EDIT','GUARDAR':'SAVE','GUARDADO ✓':'SAVED ✓','RESTABLECER':'RESET','APLICAR':'APPLY','ACTIVADO':'ON','DESACTIVADO':'OFF','SÍ':'YES','NO':'NO',
  // Rarity
  'COMÚN':'COMMON','POCO COMÚN':'UNCOMMON','RARO':'RARE','ÉPICO':'EPIC','LEGENDARIO':'LEGENDARY',
  // Vehicle / track stats
  'FICHA':'SPECS','Coche no encontrado':'Car not found','VEL PUNTA':'TOP SPEED','VEL. MÁX.':'TOP SPEED','VELOCIDAD MÁXIMA':'TOP SPEED','VELOCIDAD':'SPEED','ACELERACIÓN':'ACCELERATION','FRENADA':'BRAKING','AGARRE':'GRIP','CONTROL':'CONTROL','GIRO':'TURNING','ESTABILIDAD':'STABILITY',
  'EDITAR COCHE':'EDIT CAR','VER FICHA':'VIEW SPECS','TUNEAR':'TUNE','PROBAR':'TEST','LONGITUD':'LENGTH','SECTORES':'SECTORS','SUPERFICIE':'SURFACE','ANCHO':'WIDTH','ASFALTO':'ASPHALT','TIERRA':'DIRT','HORARIO':'CLOCKWISE','ANTIHORARIO':'COUNTERCLOCKWISE',
  // Game modes / race
  'ELIGE MODO DE JUEGO':'CHOOSE GAME MODE','Desliza el carrusel o usa las flechas':'Swipe the carousel or use the arrows','ÚLTIMO USADO':'LAST USED','🏎️ DUELO · DISTANCIA':'🏎️ DUEL · DISTANCE','Elige la duración del duelo contra CPU1':'Choose the duel length against CPU1',
  'CONTRARRELOJ':'TIME ATTACK','FANTASMA':'GHOST','SUPERVIVENCIA':'SURVIVAL','DUELO':'DUEL','ÁREA DE PRUEBAS':'PRACTICE AREA','PRÁCTICA':'PRACTICE','CARRERA':'RACE',
  'VUELTA':'LAP','VUELTAS':'LAPS','VUELTAS LIMPIAS':'CLEAN LAPS','TIEMPO':'TIME','MEJOR':'BEST','MEJOR VUELTA':'BEST LAP','POSICIÓN':'POSITION','TOTAL':'TOTAL','SECTOR':'SECTOR','DIFERENCIA':'GAP','DELTA':'DELTA','RÉCORD':'RECORD','NUEVO RÉCORD':'NEW RECORD','RÉCORD PERSONAL':'PERSONAL BEST','MEJOR PERSONAL':'PERSONAL BEST','ÚLTIMA VUELTA':'LAST LAP','VUELTA ACTUAL':'CURRENT LAP',
  'PAUSA':'PAUSE','Pausa':'Pause','PAUSADO':'PAUSED','REANUDAR':'RESUME','REINICIAR':'RESTART','MENÚ':'MENU','MENU':'MENU','CLASIFICACIÓN':'STANDINGS','PENALIZACIÓN':'PENALTY','PENALIZACIONES':'PENALTIES','META':'FINISH','SALIDA':'START',
  'RONDA':'ROUND','RONDAS':'ROUNDS','ELIMINADO':'ELIMINATED','CAMPEÓN':'CHAMPION','GANADOR':'WINNER','DERROTA':'DEFEAT','VICTORIA':'VICTORY','SIGUIENTE RONDA':'NEXT ROUND',
  'SESIÓN EN PAUSA':'SESSION PAUSED','Menú de carrera':'Race menu','CAPTURA MUNDO':'WORLD CAPTURE','CAPTURA TÉCNICA':'TECHNICAL CAPTURE','MAPA TÉCNICO':'TECHNICAL MAP','MAPA PNG':'MAP PNG','FIN DE SESIÓN · INFORME':'END SESSION · REPORT','La captura se realiza con la pausa cerrada y el HUD oculto.':'The capture is taken with the pause menu closed and the HUD hidden.',
  'Aún no hay vueltas completas en esta sesión.':'No completed laps in this session yet.','Vueltas · Sectores':'Laps · Sectors','VUELTAS · SECTORES':'LAPS · SECTORS','MEJOR DE LA SESIÓN':'SESSION BEST','RÉCORD DE SECTOR':'SECTOR RECORD','MEJOR SESIÓN':'SESSION BEST','RÉCORD SECTOR':'SECTOR RECORD','No hay vueltas cronometradas.':'No timed laps.',
  'SESIÓN FINALIZADA':'SESSION COMPLETE','BOTÍN DE LA SESIÓN':'SESSION LOOT','Todo lo conseguido durante la tanda se entrega junto.':'Everything earned during the stint is delivered together.','TOCA PARA ABRIR':'TAP TO OPEN','8 MATERIALES · RECOMPENSAS TOTALES':'8 MATERIALS · TOTAL REWARDS','VER RESULTADOS':'VIEW RESULTS','VER INFORME':'VIEW REPORT','INFO DE SESIÓN · SUPERVIVENCIA':'SESSION INFO · SURVIVAL','resultado':'result','1º / CAMPEÓN':'1ST / CHAMPION','MEDIA':'AVERAGE','PEOR':'WORST','COCHES INICIALES':'STARTING CARS','VOLVER AL RESULTADO':'BACK TO RESULT',
  // Store / inventory / workshop
  'INVENTARIO':'INVENTORY','TIENDA':'STORE','CONFIGURACIÓN':'SETTINGS','FÁBRICA':'FACTORY','CIRCUITOS':'TRACKS','MONEDAS':'COINS','PREMIO':'REWARD','RECLAMAR':'CLAIM','RESULTADOS':'RESULTS','INFORME':'REPORT','RECOMPENSA':'REWARD','RECOMPENSAS':'REWARDS','BOTÍN':'LOOT','NIVEL':'LEVEL',
  'MATERIALES':'MATERIALS','PIEZA':'PART','PIEZAS':'PARTS','DESINSTALAR':'UNINSTALL','INSTALAR':'INSTALL','COMPRAR':'BUY','VENDER':'SELL','EN PROPIEDAD':'OWNED','MONEDAS INSUFICIENTES':'NOT ENOUGH COINS','BLOQUEADO':'LOCKED','DESBLOQUEADO':'UNLOCKED','PRÓXIMAMENTE':'COMING SOON',
  'TDR WORKSHOP':'TDR WORKSHOP','1 · CONSIGUE  →  2 · FUSIONA  →  3 · GUARDA  →  4 · EQUIPA':'1 · COLLECT  →  2 · COMBINE  →  3 · STORE  →  4 · EQUIP','1 · ALMACÉN':'1 · STORAGE','2 · BANCO DE FUSIÓN':'2 · CRAFTING BENCH','3 · COCHE / MONTAJE':'3 · CAR / LOADOUT','FABRICAR PIEZA':'CRAFT PART','SELECCIONA UNA RECETA':'SELECT A RECIPE','EJEMPLOS':'EXAMPLES','DUPLICAR BOTÍN':'DOUBLE LOOT','▶ DUPLICAR ÚLTIMO BOTÍN':'▶ DOUBLE LAST LOOT','SIN PIEZA EQUIPADA':'NO PART EQUIPPED','EQUIPAR':'EQUIP','EQUIPADA':'EQUIPPED','NUEVA':'NEW','ALMACÉN':'STORAGE','BANCO DE FUSIÓN':'CRAFTING BENCH','FABRICAR':'CRAFT','FUSIONAR':'COMBINE','RECETA':'RECIPE','RECETAS':'RECIPES',
  'Todo lo que fabricas aparece aquí, en la pestaña PIEZAS.':'Everything you craft appears here under PARTS.','Las piezas fabricadas se equipan desde ALMACÉN → PIEZAS.':'Crafted parts are equipped from STORAGE → PARTS.','AÚN NO HAS FABRICADO PIEZAS\n\nFusiona materiales en el banco central.':'YOU HAVE NOT CRAFTED ANY PARTS YET\n\nCombine materials at the central bench.','Selecciona dos materiales':'Select two materials','Botín duplicado':'Loot doubled','Ya reclamado':'Already claimed',
  // Families / parts
  'MOTOR':'ENGINE','FRENOS':'BRAKES','RUEDAS':'TIRES','NEUMÁTICOS':'TIRES','SUSPENSIÓN':'SUSPENSION','CAJA':'GEARBOX','TRANSMISIÓN':'TRANSMISSION','POTENCIA':'POWER','PESO':'WEIGHT','DURABILIDAD':'DURABILITY','RAREZA':'RARITY','CATEGORÍA':'CATEGORY','MARCA':'BRAND','MODELO':'MODEL','PRECIO':'PRICE','COSTE':'COST',
  'Disco':'Disc','Compuesto':'Compound','Goma':'Rubber','Neumático':'Tire','Muelle':'Spring','Aleación':'Alloy','Engranaje':'Gear','Caja':'Gearbox','Chatarra':'Scrap','Electrónica':'Electronics',
  // Settings
  'CONFIGURACIÓN 2.0':'SETTINGS','Guardado automático ✓':'Autosaved ✓','CONTROLES':'CONTROLS','VÍDEO':'VIDEO','AUDIO':'AUDIO','IDIOMA':'LANGUAGE',
  'MODO DE DIRECCIÓN':'STEERING MODE','Elige el control principal para conducir.':'Choose your primary driving control.','◉ PALANCA':'◉ STICK','◀ ▶ BOTONES':'◀ ▶ BUTTONS','◉ VOLANTE':'◉ WHEEL','🎮 MANDO':'🎮 GAMEPAD','DISPOSICIÓN EN PANTALLA':'ON-SCREEN LAYOUT','Coloca y escala tus controles con precisión. Cada modo y cada mano conservan su propia distribución.':'Position and scale your controls precisely. Each mode and handedness keeps its own layout.','✥ PERSONALIZAR CONTROLES':'✥ CUSTOMIZE CONTROLS','PERSONALIZAR CONTROLES':'CUSTOMIZE CONTROLS','Arrastrar · tamaño · zonas protegidas · prueba de alcance':'Drag · size · protected zones · reach test',
  'MODO ZURDO':'LEFT-HANDED MODE','Intercambia dirección y pedales de lado.':'Moves steering and pedals to the opposite side.','La calibración se guarda por separado':'Calibration is saved separately.','INVERTIR DIRECCIÓN':'INVERT STEERING','Invierte izquierda y derecha.':'Swaps left and right.','SENSIBILIDAD':'SENSITIVITY','Respuesta de la dirección táctil.':'Touch steering response.',
  'FPS OBJETIVO':'TARGET FPS','Se aplica al reiniciar el motor gráfico.':'Applied after restarting the graphics engine.','CALIDAD':'QUALITY','Perfil general de render.':'Overall rendering profile.','BAJA':'LOW','MEDIA':'MEDIUM','ALTA':'HIGH','MOSTRAR FPS':'SHOW FPS','Contador de rendimiento durante la carrera.':'Performance counter during races.','PARTÍCULAS':'PARTICLES','Efectos secundarios de carrera.':'Secondary race effects.','ESCALA DE RENDER':'RENDER SCALE','Ahorro reduce carga; Nítida aumenta definición.':'Eco reduces load; Sharp increases definition.','AHORRO':'ECO','NÍTIDA':'SHARP','APLICAR Y REINICIAR':'APPLY AND RESTART','MODO SILENCIO':'MUTE','Apaga todo el audio.':'Mutes all audio.','VOLUMEN GENERAL':'MASTER VOLUME','EFECTOS':'EFFECTS','IMPACTOS':'IMPACTS','PERFIL DE MOTOR':'ENGINE PROFILE','POR COCHE':'PER CAR',
  'HUD VUELTA/POSICIÓN':'LAP / POSITION HUD','HUD VUELTA / POSICIÓN':'LAP / POSITION HUD','MINIMAPA / FANTASMA':'MINIMAP / GHOST','MENSAJES':'MESSAGES','IZQUIERDA':'LEFT','DERECHA':'RIGHT','VOLANTE':'WHEEL','PALANCA':'STICK','MANDO':'GAMEPAD','BOTONES':'BUTTONS','GAS':'THROTTLE','FRENO':'BRAKE','FRENO DE MANO':'HANDBRAKE','VISTA LIMPIA':'CLEAN VIEW'
}));

const SAFE_REPLACEMENTS=[
  [/\bVUELTAS LIMPIAS\b/g,'CLEAN LAPS'],[/\bVUELTAS PREMIADAS\b/g,'REWARDED LAPS'],[/\bVUELTAS\b/g,'LAPS'],[/\bSECTORES\b/g,'SECTORS'],[/\bLONGITUD\b/g,'LENGTH'],[/\bSUPERFICIE\b/g,'SURFACE'],[/\bDIRECCIÓN\b/g,'DIRECTION'],[/\bVELOCIDAD\b/g,'SPEED'],[/\bACELERACIÓN\b/g,'ACCELERATION'],[/\bFRENADA\b/g,'BRAKING'],[/\bAGARRE\b/g,'GRIP'],[/\bRESULTADOS\b/g,'RESULTS'],[/\bRECOMPENSAS\b/g,'REWARDS'],[/\bRECOMPENSA\b/g,'REWARD'],[/\bMONEDAS\b/g,'COINS']
];

export function canonicalRuntimeText(value){
  if(value==null||getLanguage()!=='en')return value;
  if(Array.isArray(value))return value.map(canonicalRuntimeText);
  let s=String(value);
  const trimmed=s.trim();
  if(PROPER_NAMES.has(trimmed))return s;
  if(EXACT.has(trimmed)){
    const at=s.indexOf(trimmed);
    return s.slice(0,at)+EXACT.get(trimmed)+s.slice(at+trimmed.length);
  }
  if(/^\d+ VUELTAS$/i.test(trimmed))return trimmed.replace(/VUELTAS/i,'LAPS');
  if(/^COFRE DE (\d+) VUELTAS$/i.test(trimmed))return trimmed.replace(/^COFRE DE (\d+) VUELTAS$/i,'$1-LAP CHEST');
  if(/^NIVEL (\d+)$/i.test(trimmed))return trimmed.replace(/^NIVEL/i,'LEVEL');
  if(/^\d+ PIEZAS$/i.test(trimmed))return trimmed.replace(/PIEZAS/i,'PARTS');
  if(/^🏁 \d+ VUELTAS PREMIADAS$/i.test(trimmed))return trimmed.replace(/VUELTAS PREMIADAS/i,'REWARDED LAPS');
  if(/^▣ COFRE \d+$/i.test(trimmed))return trimmed.replace(/COFRE/i,'CHEST');
  if(/^Coche:\s*/i.test(trimmed))return s.replace(/^Coche:/i,'Car:');
  if(/^Circuito:\s*/i.test(trimmed))return s.replace(/^Circuito:/i,'Track:');
  for(const [re,to] of SAFE_REPLACEMENTS)s=s.replace(re,to);
  return s;
}

export function localizeDomTree(node){
  if(getLanguage()!=='en'||!node)return;
  if(node.nodeType===Node.TEXT_NODE){
    const old=node.nodeValue;if(old?.trim()){const next=canonicalRuntimeText(old);if(next!==old)node.nodeValue=next;}return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  for(const attr of ['aria-label','title','placeholder']){const old=node.getAttribute?.(attr);if(old){const next=canonicalRuntimeText(old);if(next!==old)node.setAttribute(attr,next);}}
  for(const child of [...node.childNodes])localizeDomTree(child);
}
