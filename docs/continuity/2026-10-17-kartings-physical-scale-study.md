# Escala física original: Tenerife, Américas y Canarias

**17/10/2026. Revisión estática; sin cambios de runtime.** Fuente: el inventario post-instaladores del workflow 39062892786 y documentos de continuidad.

## Hallazgo principal

El multiplicador ×2,5 de Karting Canarias fue una **decisión expresa de jugabilidad**, NO un bug. El trazado nuevo exportado desde Track Studio medía ~6.531 px de recorrido, frente a ~14.736 px del trazado histórico de Canarias. El propietario pidió ampliar el nuevo, cuyo coche parecía demasiado grande y daba vueltas demasiado cortas. La DEV 1.2.246 elevó el nuevo trazado a ~16.328 px.

- La foto y geometría original de Canarias siguen en 2048×3072 px, con anchura de vía nominal 105 px.
- El juego transforma a mundo de 5120×7680, anchura nominal 262,5 px, y aplica ×2,5 también a puertas, curvas Bézier, colisiones de Environment Studio y posición de salida.
- El coche y su radio de colisión NO se escalan; se perdió el zoom especial 0,84 porque ya no se necesitaba.
- Esta transformación no aumenta resolución real de la fotografía ni le da escala geográfica. La foto de Canarias es una **recreación artística IA inspirada en la pista**, no una ortofoto calibrada. Fuente: docs/continuity/2026-10-16-karting-canarias-photo-active.md y docs/continuity/2026-10-16-karting-canarias-photo-staging.md.

## Geometría contrastada desde el post-build

| Circuito | Foto px | Factor mundo | Longitud centro en foto px | Longitud centro en mundo px | Carretera mediana en foto px | Carretera mediana en mundo px | Spark / carretera |
|---|---:|---:|---:|---:|---:|---:|---:|
| Tenerife | 3344×1882 | 1 | 14.674,29 | 14.674,29 | 167,90 | 167,90 | 18,54 % |
| Américas | 2862×3435 | 1 | 14.443,68 | 14.443,68 | 210,03 | 210,03 | 14,82 % |
| Canarias | 2048×3072 | 2,5 | 6.531,02 | 16.327,55 | 121,87 | 304,67 | 10,22 % |

Anchos por cortes normales entre bordes Bézier; pueden ser ambiguos en horquillas. El zoom de cámara amplía coche y carretera juntos y NO modifica esos porcentajes. Las proporciones geométricas internas ancho/longitud son Tenerife 1,14 %, Américas 1,45 %, Canarias 1,87 %: caminos y geometrías distintos, no corregir simplemente igualando fotos en píxeles.

## Conversión de metros que utiliza el juego frente a la realidad

La constante global en src/game/cars/speedUnits.js es METERS_PER_PX=0.185/3.6, es decir, **0,05138889 m por píxel del mundo**; no hay escala GPS por circuito.

Los operadores anuncian: **Karting Club Tenerife 1.200 m senior y 8 m de ancho** (https://www.kartingtenerife.com/nuestros-circuitos/), **Karting Las Américas 857 m** (https://www.kartingamericas.com/en/home-english/). Turismo de Tenerife también ha publicado 1.000 m para la pista senior de Tenerife: hay variación documental. Sobre **Karting Canarias / La Esperanza**, OnPole (https://onpole.io/circuitos/en/karting-canarias) indica **440 m** y Motorlap (https://www.motorlap.com/tracks/1856) **500 m**; un documento histórico menciona **420 m**. No hemos confirmado una longitud oficial del operador ni que la reconstrucción artística corresponda exactamente al mismo layout.

| Circuito | Distancia del juego | Referencia externa | Factor métrico hipotético referencia/juego | Anchura mediana extrapolada si coincide el trazado |
|---|---:|---:|---:|---:|
| Tenerife | 754,10 m | 1.200 m (operador) | ×1,591 | 13,73 m |
| Américas | 742,24 m | 857 m (operador) | ×1,155 | 12,46 m |
| Canarias | 839,05 m | 440 m (OnPole, no oficial) | ×0,524 | 8,21 m |

**Estos factores son comparaciones matemáticas, NO multiplicadores para aplicar a la pista.** Por ejemplo, Canarias a 440 m supondría una transformación de la foto de ~×1,31 en vez de ×2,5 con la misma conversión global, alterando deliberadamente la sensación de conducción que ya fue aprobada. La correspondencia real de las tres fotografías con el layout oficial aún no está validada.

## Decisión para la homogeneización

1. **No modificar por ahora** el ×2,5 Canarias, el tamaño de los coches, el código de cámara, las colisiones ni la foto.
2. Elegir explícitamente criterio **arcade y comparabilidad de coches** o **metros reales y layouts verificables**. No existe una única escala física del juego que se pueda probar con las fotos actuales sin contrastar referencias conocidas.
3. Para calibración métrica real: identificar en cada fuente fotográfica la recta principal y al menos 5 secciones cuya geometría corresponda al circuito físico, medir distancias fiables y comprobar si la recreación IA de Canarias encaja.
4. Si se decide cambiar coordenadas, incluir start/meta/checkpoints, física, kilómetros y odómetro, colisiones de barreras/zonas, IA, fantasmas, récords locales/online y migración o cambio de versión de circuitos. No hacerlo en un ajuste cosmético.
5. Rendimiento iPhone y pixelación de WebP 65 % son investigación INDEPENDIENTE; no volver a culling dinámico, ya fallido por tirones en iOS.

**Fuentes internas:** scripts/audit-track-car-scale.mjs, src/game/tracks/kartingCanariasWorldScale.js, src/game/cars/speedUnits.js, docs/continuity/2026-10-16-karting-canarias-photo-active.md, docs/continuity/2026-10-17-actual-alpha-kartings-results.md, y artifact TDR-track-car-scale-audit en https://github.com/almaprintes/TopdownCraftrace/actions/runs/39062892786.

**Solo documentación: DEV sigue 1.2.263, sin cambios físicos, gráficos o Google Play.**