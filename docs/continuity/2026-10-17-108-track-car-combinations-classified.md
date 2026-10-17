
# TDR — Clasificación de escala: 108 combinaciones (DEV 1.2.263)

**Fecha:** 17/10/2026. **Base INALTERADA del juego:** main `f31a5a7e51f1a5c38c66436bd19300cc52180cca`, DEV 1.2.263. **Origen real:** informe `INFORME.md` + `inventory.json` creado DESPUÉS de los instaladores en [Actions run 39059517055](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39059517055), artefacto `TDR-track-car-scale-audit`. 6 circuitos × 18 coches. En el informe generado: seis perfiles de pista y dieciocho skins originales comprobados, sin faltantes; dos advertencias estructurales automáticas (Canarias mundo ×2,5 y Arafo carScale ×0,35). Este archivo es una **clasificación técnica, no un commit de calibración**.

## Resultado central

Los 108 cruces NO son 108 errores independientes: se derivan de la relación entre **18 anchos nominales de sprite**, **6 anchuras de pista muestreadas** y el multiplicador de coche de la pista. No mezclar zoom con proporcionalidad: un zoom común no cambia el cociente coche/carretera.

**Tres observaciones importantes:**

1. **Karting Canarias (P1 pista):** Spark ocupa 10,6 % del ancho mediano estimado, frente a 19,3 % en Tenerife y 15,4 % en Américas. Su carretera mediana mide 304,67 unidades mundo tras escala ×2,5. Es PRIORIDAD para verificar si la anchura física o la relación foto/geometría está sobredimensionada. No aumentar automáticamente coche o hitbox.
2. **Arafo–Los Loros (preservar):** Spark queda en 18,1 % por el `carScale=0.35`; se aproxima a Tenerife. Si se quitara ese factor, la relación se triplicaría **y cambiaría también colisión/física**, potencialmente récords y fantasmas. No tocar aún.
3. **CROWN Cuper (P1 arte):** el archivo por defecto es 512×768 (relación 2:3), mientras la mayoría de los turismos son 256×512 (1:2). Aunque `visualScale=1.10`, queda nominalmente **47,52 px de ancho vs 32,40 del Spark (+46,7 %)**, muy similar a FORGE Colossus (46,98 px). Ambos no tienen la misma longitud: hay una anomalía de **proporción del asset o padding**, NO se ha medido todavía el contorno alfa. Cuper conserva diámetro de colisión de 28 px, igual al Spark; cambiar solo artwork no debe cambiar ese radio.

## Seis circuitos: inspección comparativa

| Circuito | Mediana carretera | p10–p90 | Cortes aceptados | Mundo × | Coche × | Spark / carretera | GPU original / iOS al 65 % (MiB estimados) | Prioridad |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Circuito Atlántico | 354.0 px | 305.6–371.9 | 34/36 | 1.00 | 1.00 | 9.2 % | 53.99 / 22.81 | Vía amplia; contrastar metros reales |
| Santa Cruz | 263.4 px | 203.4–305.3 | 35/36 | 1.00 | 1.00 | 12.3 % | 54.00 / 22.80 | Vía urbana; validar anchura |
| Karting Tenerife | 167.9 px | 136.0–200.6 | 34/36 | 1.00 | 1.00 | 19.3 % | 24.01 / 10.15 | Referencia comparativa provisional |
| Karting Canarias | 304.7 px | 256.7–391.8 | 36/36 | 2.50 | 1.00 | 10.6 % | 24.00 / 10.14 | P1: mundo ×2,5; comparar kartings |
| Karting Américas | 210.0 px | 166.0–251.8 | 36/36 | 1.00 | 1.00 | 15.4 % | 37.50 / 15.84 | Referencia intermedia |
| Arafo → Los Loros | 62.8 px | 59.0–68.4 | 34/36 | 1.00 | 0.35 | 18.1 % | 24.01 / 10.15 | PRESERVAR escala ×0,35 hasta validar física |

Los circuitos urbanos/rápidos pueden tener carreteras realmente más anchas que un karting, y eso no es un error. Los valores p10/mediana/p90 son de cortes geométricos Bézier: hay ramas próximas, especialmente en curvas muy cerradas, que pueden cruzarse con la normal. No equivalen a medidas físicas certificadas. No sumar GPU de seis circuitos: se prepara **una pista por carrera** y se excluyen otros buffers/texturas/overhead. Sin *culling dinámico*.

## Tabla completa: ancho nominal de sprite / carretera por coche y pista (108 cruces)

| Vehículo | Circuito Atlántico | Santa Cruz | Karting Tenerife | Karting Canarias | Karting Américas | Arafo → Los Loros |
|---|---:|---:|---:|---:|---:|---:|
| HÉLIX Spark | 9.2 % | 12.3 % | 19.3 % | 10.6 % | 15.4 % | 18.1 % |
| HÉLIX Comet | 9.4 % | 12.7 % | 19.9 % | 11.0 % | 15.9 % | 18.6 % |
| HÉLIX Pulse | 9.3 % | 12.5 % | 19.7 % | 10.8 % | 15.7 % | 18.4 % |
| CROWN Axis | 8.4 % | 11.3 % | 17.8 % | 9.8 % | 14.2 % | 16.6 % |
| CROWN Vector | 9.5 % | 12.8 % | 20.1 % | 11.1 % | 16.0 % | 18.8 % |
| CROWN Equinox | 9.7 % | 13.0 % | 20.5 % | 11.3 % | 16.4 % | 19.1 % |
| AVENIR Gripline | 9.3 % | 12.5 % | 19.7 % | 10.8 % | 15.7 % | 18.4 % |
| AVENIR Apex | 9.4 % | 12.7 % | 19.9 % | 11.0 % | 15.9 % | 18.6 % |
| AVENIR Torque | 9.5 % | 12.8 % | 20.1 % | 11.1 % | 16.0 % | 18.8 % |
| VELOCE Flash | 9.1 % | 12.2 % | 19.1 % | 10.5 % | 15.3 % | 17.9 % |
| VELOCE Surge | 9.0 % | 12.1 % | 18.9 % | 10.4 % | 15.1 % | 17.7 % |
| VELOCE Photon | 8.9 % | 11.9 % | 18.7 % | 10.3 % | 15.0 % | 17.5 % |
| FORGE Hammer | 11.4 % | 15.4 % | 24.1 % | 13.3 % | 19.3 % | 22.6 % |
| FORGE Anvil | 12.4 % | 16.6 % | 26.1 % | 14.4 % | 20.8 % | 24.4 % |
| FORGE Colossus | 13.3 % | 17.8 % | 28.0 % | 15.4 % | 22.4 % | 26.2 % |
| HÉLIX Vortex | 10.8 % | 14.5 % | 22.8 % | 12.5 % | 18.2 % | 21.3 % |
| VELOCE Juanicar C2.20 | 11.5 % | 15.5 % | 24.2 % | 13.4 % | 19.4 % | 22.7 % |
| CROWN Cuper | 13.4 % | 18.0 % | 28.3 % | 15.6 % | 22.6 % | 26.5 % |

**Importante:** cada porcentaje estima el lado corto del sprite WebP por ajuste a caja en `RaceScene.js`, dividido por el ancho mediano Bézier del circuito. Incluye zonas transparentes en WebP si las hay; NO es la anchura de silueta ni un porcentaje de colisión real. Se excluye zoom dinámico porque transforma coche/carretera a la vez. La orientación/skins alternativas requieren medición separada.

## Clasificación priorizada

| Prioridad | Casos | Motivo y siguiente inspección |
|---|---|---|
| **P0 combinación** | **Cuper × Karting Canarias** | Coinciden un mundo escalado ×2,5 y una skin con ratio de imagen atípica. No significa que haya que agrandar algo. |
| **P1 circuito** | Los otros 17 coches × **Karting Canarias** | Establecer anchura de carretera a escala física verificable contra Tenerife y Américas; preservar fuente foto/Bézier/colisiones. |
| **P1 coche** | **Cuper × los otros 5 circuitos** | Medir caja alfa y silueta real de las skins original/gold y verificar si se está reservando demasiado ancho de sprite o si la carrocería realmente es más ancha. |
| **P2 inspección** | **Circuito Atlántico y Santa Cruz**, especialmente camiones FORGE | Comparar con anchura y tipo reales de vía, sin imponer mismo porcentaje que un karting. FORGE Hammer/Anvil/Colossus llevan factor visual 1,25/1,35/1,45 intencional por clase pesada. |
| **P3 conservar/comparar** | **Arafo, Karting Tenerife, Karting Américas** y turismos de referencia | Usarlos como controles; Arafo requiere verificar las colisiones/metros antes de editar pero su proporción visual con Spark ya es cercana al patrón Tenerife. |

Criterios P0–P3 son orden de **revisión**, NO veredicto de error. Cuper + Canarias cuenta tanto como prioridad de coche como de circuito; se enumera una sola vez como P0.

### Otras diferencias de flota

- Turismo normal: las dimensiones nominales de la mayoría son ~29,8–34,3 px de ancho; Sprite Spark 32,4 px (256×512). Vortex ~38,2 px y Juanicar ~40,7 px son modelos especiales y conviene validar su silueta. FORGE Hammer 40,5, Anvil 43,7, Colossus 47,0 px podrían estar correctamente dimensionados como vehículos pesados.
- Cuper (47,52) supera nominalmente a Colossus (46,98) en ancho de sprite, pese a usar un radio físico menor. **No deducir del bounding box WebP el contorno real**. Una corrección debe decidirse sobre la carrocería visible y la calibración de la skin, idealmente desde Admin Hub, sin alterar `collisionScale` ni los otros coches.

## Plan antes de tocar runtime

1. **Inspección sin gameplay:** obtener bounding boxes **alfa** y orientaciones de las skins oficiales y las equipables más relevantes. Verificar en particular la imagen de Cuper y la relación ancho/largo real sin inventar medidas de metros.
2. **Comparación de tres kartings:** Spark siempre idéntico, geometría del borde y anchos reales por sector de Tenerife, Canarias y Américas. Definir una referencia física de metros por unidad, no una proporción estética arbitraria.
3. **Etiquetar excepciones:** conservar per-track scale de rally, diferencias de camiones, vías urbanas anchas justificadas y preferencias por skins. Evitar cambiar `visualScale` porque por defecto influye en la colisión: usar calibración **cosmética independiente** si existe desajuste probado.
4. **Revisar impactos online:** antes de cambiar coordenadas de mundo, colisiones, distancias, puertas o sectores, planificar compatibilidad con PB/ghost/rankings. No rehacer fotos ni geometrías hasta autorizar esos cambios.
5. **Rendimiento después:** arquitectura de mosaicos estáticos *precargados*, sin introducir nuevo culling/tile streaming; calidad fotográfica y carga térmica se investigarán en un proyecto separado de escala.

## Evidencia y limitaciones

- El informe base post-installer se conserva en [artefacto GitHub Actions](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39059517055); fuente local generadora `scripts/audit-track-car-scale.mjs`.
- Los cortes geométricos tienen cobertura del 94–100 %. No describen tamaño de los obstáculos u otras superficies, ni sustituyen una validación visual y física.
- Los tamaños nominales de WebP usan ratio completo con transparencias; no se han leído las cajas alfa ni la orientación de skins equipadas.
- `skinGeometry.json` y las skins alternativas pueden alterar encuadre. Cualquier propuesta numérica posterior necesita validación gráfica.
- Ningún cambio en código de carrera, JSON de pistas, imágenes maestras, escalas físicas, texturas de prod, Google Play o datos de Supabase por esta investigación.

**Estado:** solo informe de análisis. DEV sigue 1.2.263. Historial prioritario [decisiones culling y escala](2026-10-17-track-car-scale-culling-decisions.md).
