# Arafo–Los Loros — control del acelerador y velocidad en tramo (DEV 1.2.247)

**Motivo:** el propietario observó que, al tocar brevemente el acelerador en Arafo–Los Loros, los coches atravesaban varias horquillas de golpe. El tramo está dibujado a 1882×3344, con una carretera de unos 40 px, 2241 nodos y 9.209 px de recorrido en el mundo del juego. Los vehículos normales tienen velocidades máximas que pueden superar 460–640 unidades/segundo, según modelo y tuneo. El pedal táctil en el bucle `RaceScene.update()` funciona como botón digital (`t.throttle>0.5`), no como lectura analógica de presión.

## Implementación

En `src/game/tracks/arafoRallyDrivePace.js` existe un único perfil **exact-id**, solo `rally-arafo-los-loros`:
- Aceleración de motor durante la carrera: **28 %** del empuje calculado para el coche (mantiene diferencias entre modelos y mejoras). Su aplicación comienza al **25 % de ese empuje de rally** y progresa linealmente al 100 % durante **0,75 segundos** de pulsación continua. Al soltar el gas o frenar, la rampa se reinicia. Se mide por `dt` real y es independiente de 30/60 FPS.
- Velocidad máxima hacia delante: **30 %** del límite propio de cada coche; marcha atrás 60 %.
- Fuerza de frenada al pulsar: 115 % de la del coche. Dirección, agarre, radio, daños y propiedades del vehículo no cambian.

El lugar correcto de integración es el bucle de físicas en `src/game/scenes/RaceScene.js`, **después de leer los parámetros de `this.carParams` y antes de procesar tipos de superficie, curva de aceleración y límite de velocidad**. Así se modifica exclusivamente la respuesta en un frame de este tramo y no `CAR_SPECS`, `resolveCarParams`, el garaje, la fábrica ni otros circuitos. No interpretar la pulsación como analógica: la progresividad es temporal, no por presión.

No se modifica la foto, tamaño del coche (`carScale:0.35`), centro de pista, meta, checkpoints, colisiones de Environment Studio ni la escala 1:1 de Arafo. Tampoco se toca el Karting Canarias ×2,5 de la DEV anterior.

## Validación y siguientes pruebas

`scripts/arafo-rally-drive-pace-smoke.mjs` comprueba el identificador exacto, los multiplicadores, el arranque suave, el reinicio al soltar, un resultado equivalente a 30/60 FPS, los valores originales de los coches intactos, el tramo A→B y la integración de la carrera. Se ejecuta tanto en `package.json/prebuild` como en GitHub Pages.

**Cifras iniciales para prueba real, no calibración definitiva.** El usuario debe conducir una horquilla con gas corto, mantenerlo en recta, soltar y frenar. Si se queda demasiado lento, ajustar solamente constantes de `ARAFO_RALLY_PACE` (por ejemplo `forwardSpeed` de 0.30 a 0.35) con nueva DEV y Actions verde. No subir el multiplicador global de coches ni generar APK/Google Play sin autorización expresa.
