# Marcas efímeras de neumático — 2026-08-24

## Objetivo

Premiar visualmente a los dispositivos con margen de GPU/CPU sin aumentar la carga del perfil seguro.

## Implementación

Se añade `RaceTransientTireMarksScene.js` sobre `RaceSafeModeRuntimeScene.js`.

### Dispositivos normales

- Muestreo aproximado cada 58 ms.
- Se calcula la velocidad lateral real del coche a partir de `body.velocity` y del heading físico.
- En asfalto solo aparecen marcas cuando existe deslizamiento lateral significativo.
- Fuera de pista aparecen marcas más claras/terrosas, diferenciando la banda de hierba cuando está disponible.
- Las marcas se dibujan desde las dos ruedas traseras y enlazan muestras consecutivas para formar trazos naturales.
- Cada marca dura aproximadamente 0,8–1,15 s y se desvanece suavemente.
- Límite duro de 56 segmentos vivos para impedir crecimiento ilimitado de objetos.
- Solo afecta por ahora al coche del jugador.

### Modo seguro

El sistema queda completamente desactivado cuando `window.__tdrIosSafeMode === true`.

## Seguridad de gameplay

No se modifican físicas, grip, drift, velocidades, IA, cronometraje, superficies ni colisiones. El sistema únicamente lee velocidad/posición y crea Graphics efímeros.

## Integración

- Commit de escena: `015d0ae9f961a8ad1c7500e815e82e96895b8d74`
- Activación en `game.js`: `14d90980288eaa2f251f3d427a9e9262bb18adf5`

## Próxima validación

Probar en dispositivo normal:

1. curva limpia sin deriva: no debería dejar rastro;
2. corrección lateral / derrape: dos marcas traseras breves y progresivas;
3. salida a grass/off: rastro terroso más suave;
4. comprobar FMAX y ausencia de acumulación tras varias vueltas.

Si la estética y coste son buenos, valorar una segunda fase para IA con densidad reducida.
