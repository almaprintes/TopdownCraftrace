import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/game/dev/iosRaceFrameDiagnostics.js',import.meta.url),'utf8');
const names=[
'ACTIVAR LÍMITE 60 FPS','DESACTIVAR LÍMITE 60 FPS',
'ACTIVAR NITIDEZ REDUCIDA','DESACTIVAR NITIDEZ REDUCIDA',
'ACTIVAR BUCLE ALTERNATIVO','DESACTIVAR BUCLE ALTERNATIVO',
'ACTIVAR PRUEBA WEBGL SYNC','DESACTIVAR PRUEBA WEBGL SYNC',
'OCULTAR INDICADORES (HUD)','MOSTRAR INDICADORES (HUD)',
'OCULTAR FOTO DEL CIRCUITO','MOSTRAR FOTO DEL CIRCUITO',
'SILENCIAR MOTOR','ACTIVAR SONIDO MOTOR',
'ACTIVAR TEXTOS HTML','ACTIVAR TEXTOS PHASER',
'REINICIAR MEDICIÓN','COPIAR INFORME',
'CONTAR DIBUJOS (90 FOTOGRAMAS)'
];
for(const label of names)assert.ok(source.includes(label),label+' missing');
assert.match(source,/fpsConfig\.fpsTrialMode==='CAP_60'/);
assert.match(source,/state\.hudOff\?'MOSTRAR INDICADORES/);
assert.match(source,/state\.photoOff\?'MOSTRAR FOTO/);
assert.match(source,/limit===0\?' \(0 = sin tope adicional\)'/);
assert.match(source,/LÍMITE EXTRA 60 FPS:/);
assert.match(source,/NITIDEZ: \$\{resText\}/);
assert.match(source,/Los botones indican QUÉ HARÁN al tocarlos/);
assert.match(source,/panel\.appendChild\(help\)/);
assert.doesNotMatch(source,/control\('PROBAR FPS 60/);
assert.doesNotMatch(source,/control\('RES 1\.0/);
console.log('PASS: iPhone diagnostic action labels, on-screen explanation and correct state readouts');
