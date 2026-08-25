import { getLanguage } from './index.js';

const EXACT=new Map(Object.entries({
  'CONFIGURACIÓN 2.0':'SETTINGS 2.0','Guardado automático ✓':'Autosaved ✓','CONTROLES':'CONTROLS','VÍDEO':'VIDEO','AUDIO':'AUDIO',
  'MODO DE DIRECCIÓN':'STEERING MODE','Elige el control principal para conducir.':'Choose your primary driving control.','◉ PALANCA':'◉ STICK','◀ ▶ BOTONES':'◀ ▶ BUTTONS','◉ VOLANTE':'◉ WHEEL','🎮 MANDO':'🎮 GAMEPAD',
  'DISPOSICIÓN EN PANTALLA':'ON-SCREEN LAYOUT','Coloca y escala tus controles con precisión. Cada modo y cada mano conservan su propia distribución.':'Position and scale your controls precisely. Each mode and handedness keeps its own layout.','✥ PERSONALIZAR CONTROLES':'✥ CUSTOMIZE CONTROLS','Arrastrar · tamaño · zonas protegidas · prueba de alcance':'Drag · size · protected zones · reach test',
  'MODO ZURDO':'LEFT-HANDED MODE','Intercambia dirección y pedales de lado.':'Swaps steering and pedals to the other side.','La calibración se guarda por separado':'Calibration is saved separately','INVERTIR DIRECCIÓN':'INVERT STEERING','Invierte izquierda y derecha.':'Swaps left and right.','SENSIBILIDAD':'SENSITIVITY','Respuesta de la dirección táctil.':'Touch steering response.',
  'FPS OBJETIVO':'TARGET FPS','Se aplica al reiniciar el motor gráfico.':'Applied after restarting the graphics engine.','CALIDAD':'QUALITY','Perfil general de render.':'Overall rendering profile.','BAJA':'LOW','MEDIA':'MEDIUM','ALTA':'HIGH','MOSTRAR FPS':'SHOW FPS','Contador de rendimiento durante la carrera.':'Performance counter during the race.','PARTÍCULAS':'PARTICLES','Efectos secundarios de carrera.':'Secondary race effects.','ESCALA DE RENDER':'RENDER SCALE','Ahorro reduce carga; Nítida aumenta definición.':'Eco reduces load; Sharp increases definition.','AHORRO':'ECO','NÍTIDA':'SHARP','APLICAR Y REINICIAR':'APPLY AND RESTART',
  'MODO SILENCIO':'MUTE','Apaga todo el audio.':'Turns off all audio.','VOLUMEN GENERAL':'MASTER VOLUME','EFECTOS':'EFFECTS','IMPACTOS':'IMPACTS','PERFIL DE MOTOR':'ENGINE PROFILE','POR COCHE':'PER CAR',
  'HUD VUELTA/POSICIÓN':'LAP / POSITION HUD','HUD VUELTA / POSICIÓN':'LAP / POSITION HUD','MINIMAPA / FANTASMA':'MINIMAP / GHOST','MENSAJES':'MESSAGES','← CANCELAR':'← CANCEL','PERSONALIZAR CONTROLES':'CUSTOMIZE CONTROLS','RESTABLECER':'RESET','PROBAR':'TEST','VISTA LIMPIA':'CLEAN VIEW','GUARDAR':'SAVE','EDITAR':'EDIT','GUARDADO ✓':'SAVED ✓',
  'Arrastra · toca un control para ajustar tamaño · las zonas rojas están protegidas':'Drag · tap a control to resize · red zones are protected','Arrastra cada control · toca para ajustar tamaño · las zonas rojas están reservadas al HUD':'Drag each control · tap to resize · red zones are reserved for the HUD','Vista limpia · pulsa EDITAR para seguir moviendo controles':'Clean view · tap EDIT to keep moving controls','⚠ Hay un control invadiendo una zona protegida o saliendo de pantalla':'⚠ A control overlaps a protected zone or is outside the screen','IZQUIERDA':'LEFT','DERECHA':'RIGHT','VOLANTE':'WHEEL','PALANCA':'STICK','GAS':'THROTTLE','FRENO':'BRAKE','FRENO DE MANO':'HANDBRAKE',
  'SESIÓN EN PAUSA':'SESSION PAUSED','Menú de carrera':'Race menu','CONTINUAR':'CONTINUE','CAPTURA MUNDO':'WORLD CAPTURE','CAPTURA TÉCNICA':'TECHNICAL CAPTURE','FIN DE SESIÓN · INFORME':'END SESSION · REPORT','SALIR AL MENÚ':'EXIT TO MENU','La captura se realiza con la pausa cerrada y el HUD oculto.':'The capture is taken with the pause menu closed and the HUD hidden.','Pausa':'Pause',
  'Aún no hay vueltas completas en esta sesión.':'No completed laps in this session yet.','VUELTA':'LAP','TOTAL':'TOTAL','MEJOR':'BEST','MEJOR DE LA SESIÓN':'SESSION BEST','RÉCORD DE SECTOR':'SECTOR RECORD','Vueltas · Sectores':'Laps · Sectors','VUELTAS · SECTORES':'LAPS · SECTORS','MEJOR SESIÓN':'SESSION BEST','RÉCORD SECTOR':'SECTOR RECORD','No hay vueltas cronometradas.':'No timed laps.',
  'SESIÓN FINALIZADA':'SESSION COMPLETE','BOTÍN DE LA SESIÓN':'SESSION LOOT','Todo lo conseguido durante la tanda se entrega junto.':'Everything earned during the stint is delivered together.','TOCA PARA ABRIR':'TAP TO OPEN','8 MATERIALES · RECOMPENSAS TOTALES':'8 MATERIALS · TOTAL REWARDS','VER RESULTADOS':'VIEW RESULTS','VER INFORME':'VIEW REPORT','INFO DE SESIÓN · SUPERVIVENCIA':'SESSION INFO · SURVIVAL','resultado':'result','1º / CAMPEÓN':'1ST / CHAMPION','ELIMINADO':'ELIMINATED','RONDAS':'ROUNDS','MEDIA':'AVERAGE','PEOR':'WORST','COCHES INICIALES':'STARTING CARS','VOLVER AL RESULTADO':'BACK TO RESULT',
  'INVENTARIO':'INVENTORY','MATERIALES':'MATERIALS','PIEZAS':'PARTS','DESINSTALAR':'UNINSTALL','TIENDA':'STORE','COMPRAR':'BUY','EN PROPIEDAD':'OWNED','MONEDAS INSUFICIENTES':'NOT ENOUGH COINS','CERRAR':'CLOSE',
  'TDR WORKSHOP':'TDR WORKSHOP','1 · CONSIGUE  →  2 · FUSIONA  →  3 · GUARDA  →  4 · EQUIPA':'1 · COLLECT  →  2 · COMBINE  →  3 · STORE  →  4 · EQUIP','1 · ALMACÉN':'1 · STORAGE','2 · BANCO DE FUSIÓN':'2 · CRAFTING BENCH','3 · COCHE / MONTAJE':'3 · CAR / LOADOUT','FABRICAR PIEZA':'CRAFT PART','SELECCIONA UNA RECETA':'SELECT A RECIPE','DUPLICAR BOTÍN':'DOUBLE LOOT','▶ DUPLICAR ÚLTIMO BOTÍN':'▶ DOUBLE LAST LOOT','SIN PIEZA EQUIPADA':'NO PART EQUIPPED','EQUIPAR':'EQUIP','EQUIPADA':'EQUIPPED','NUEVA':'NEW',
  'Todo lo que fabricas aparece aquí, en la pestaña PIEZAS.':'Everything you craft appears here under PARTS.','Las piezas fabricadas se equipan desde ALMACÉN → PIEZAS.':'Crafted parts are equipped from STORAGE → PARTS.','AÚN NO HAS FABRICADO PIEZAS\n\nFusiona materiales en el banco central.':'YOU HAVE NOT CRAFTED ANY PARTS YET\n\nCombine materials at the central bench.','Selecciona dos materiales':'Select two materials','Botín duplicado':'Loot doubled','Ya reclamado':'Already claimed'
}));

const REPLACEMENTS=[
  [/\bMONEDAS\b/g,'COINS'],[/\bVUELTAS LIMPIAS\b/g,'CLEAN LAPS'],[/\bVUELTAS PREMIADAS\b/g,'REWARDED LAPS'],[/\bVUELTAS\b/g,'LAPS'],[/\bSECTORES\b/g,'SECTORS'],[/\bLONGITUD\b/g,'LENGTH'],[/\bSUPERFICIE\b/g,'SURFACE'],[/\bDIRECCIÓN\b/g,'DIRECTION'],[/\bVELOCIDAD\b/g,'SPEED'],[/\bACELERACIÓN\b/g,'ACCELERATION'],[/\bFRENADA\b/g,'BRAKING'],[/\bAGARRE\b/g,'GRIP'],[/\bRESULTADOS\b/g,'RESULTS'],[/\bRECOMPENSAS\b/g,'REWARDS'],[/\bRECOMPENSA\b/g,'REWARD'],[/\bCOFRE\b/g,'CHEST'],[/\bNIVEL\b/g,'LEVEL'],[/\bPIEZAS\b/g,'ITEMS'],[/\bMATERIALES\b/g,'MATERIALS'],[/\bSELECCIONAR\b/g,'SELECT'],[/\bSELECCIONADO\b/g,'SELECTED'],[/\bVOLVER\b/g,'BACK'],[/\bCANCELAR\b/g,'CANCEL'],[/\bSALIR\b/g,'EXIT'],[/\bINFORME\b/g,'REPORT']
];

function translate(value){
  if(getLanguage()!=='en')return value;
  let s=String(value??'');
  const trimmed=s.trim();
  if(EXACT.has(trimmed)){
    const lead=s.slice(0,s.indexOf(trimmed));const tail=s.slice(s.indexOf(trimmed)+trimmed.length);
    return lead+EXACT.get(trimmed)+tail;
  }
  if(/^COFRE DE \d+ VUELTAS$/i.test(trimmed))return trimmed.replace(/^COFRE DE (\d+) VUELTAS$/i,'$1-LAP CHEST');
  if(/^NIVEL \d+$/i.test(trimmed))return trimmed.replace(/^NIVEL/i,'LEVEL');
  if(/^\d+ PIEZAS$/i.test(trimmed))return trimmed.replace(/PIEZAS/i,'ITEMS');
  if(/^🏁 \d+ VUELTAS PREMIADAS$/i.test(trimmed))return trimmed.replace(/VUELTAS PREMIADAS/i,'REWARDED LAPS');
  if(/^▣ COFRE \d+$/i.test(trimmed))return trimmed.replace(/COFRE/i,'CHEST');
  for(const [re,to] of REPLACEMENTS)s=s.replace(re,to);
  return s;
}

function visit(node){
  if(getLanguage()!=='en'||!node)return;
  if(node.nodeType===Node.TEXT_NODE){const old=node.nodeValue;if(old?.trim()){const next=translate(old);if(next!==old)node.nodeValue=next;}return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  for(const attr of ['aria-label','title','placeholder']){const old=node.getAttribute?.(attr);if(old){const next=translate(old);if(next!==old)node.setAttribute(attr,next);}}
  for(const child of [...node.childNodes])visit(child);
}

export function installDomUiEnglishBridge(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||document.__tdrDomEnglishBridge)return;
  document.__tdrDomEnglishBridge=true;
  visit(document.body);
  const obs=new MutationObserver(records=>{if(getLanguage()!=='en')return;for(const r of records){if(r.type==='characterData')visit(r.target);for(const n of r.addedNodes||[])visit(n);}});
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('tdr2:language-change',()=>{if(getLanguage()==='en')visit(document.body);});
}
