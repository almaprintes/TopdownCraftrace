# Resultados reales: siluetas alfa de 19 skins y los tres kartings

**CI comprobado:** [run 39062892786](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39062892786), commit de herramienta `68f4ba8c`. Artefacto descargable allí: `TDR-car-alpha-kartings-audit` con INFORME.md y alpha-kartings.json. Script y test: `scripts/audit-car-alpha-kartings.mjs`, `scripts/audit-car-alpha-kartings-smoke.mjs`. Build + Deploy correctos. Solo lectura.

## Corrección imprescindible respecto al primer informe

| Vehículo | Ancho nominal de la imagen | Ancho visible (bbox alfa ≥16) | Bbox fuente | Comentario |
|---|---:|---:|---:|---|
| HÉLIX Spark | 32,40 px | **31,13 px** | 246×486 de 256×512 | Referencia normal |
| CROWN Cuper original | 47,52 px | **34,71 px** | 374×690 de 512×768 | Margen lateral transparente |
| CROWN Cuper Gold | 47,52 px | **34,71 px** | 374×686 de 512×768 | Misma anchura visible |
| FORGE Colossus | 46,98 px | **45,51 px** | 248×469 de 256×512 | Vehículo pesado |

**El Cuper no mide lo mismo que el Colossus**: 47,52 px era el rectángulo completo, con padding. Su ancho alfa estimado es 34,71 px, aproximadamente **11,5 % más que Spark**, no +46,7 %. Por tanto, la prioridad inicial de redimensionar Cuper queda descartada salvo nueva prueba visual.

Otros coches que requieren inspección, no corrección automática: **HÉLIX Vortex** ancho alfa 220/256 (~86 %) y visible 32,86 px, **VELOCE Juanicar** 1448/1620 (~89 %) y visible 36,39 px, **FORGE Anvil** bbox 249×299 de 256×512; la caja longitudinal mide solo ~58 % de la altura del WebP. Estos casos pueden ser decisiones artísticas o composición de texturas.

## Los tres kartings con el mismo Spark y Cuper

| Circuito | Anchura asfalto mediana (Bézier) | Spark: % de carretera | Cuper: % de carretera | Escala del mundo |
|---|---:|---:|---:|---:|
| Karting Tenerife | 167,90 px | **18,54 %** | **20,67 %** | 1,0 |
| Karting Américas | 210,03 px | **14,82 %** | **16,53 %** | 1,0 |
| Karting Canarias | 304,67 px | **10,22 %** | **11,39 %** | 2,5 |

El Spark en Canarias representa ~**55,1 % de su proporción de Tenerife**. Este resultado justifica medir las anchuras físicas originales, no cambiar directamente el escalado: Canarias usa una transformación ×2,5 de coordenadas que también afecta a geometría de trazado y datos de juego.

## Qué debemos hacer a continuación

1. Mantener las dos skins del Cuper sin cambios: su anchura visible es coherente y consistente entre variantes.
2. Calibrar la referencia física real de los tres kartings sobre sus fotografías maestras y archivos Track Studio, sin asumir que todos han de tener idéntico ancho de asfalto.
3. Comparar visualmente Vortex, Juanicar y Anvil, especialmente alfa longitudinal de Anvil y distintas proporciones de fuente.
4. Solo después decidir ajustes cosméticos separados de colisión, por circuito/vehículo y con compatibilidad de récords y fantasmas.

**Limitaciones:** el rectángulo alfa incluye sombras/antialiasing, no equivale a la anchura física; el cálculo utiliza la skin oficial, no la equipada por usuario. Los anchos Bézier provienen de cortes y pueden ser ambiguos en horquillas; resultados estáticos no prueban nada sobre FPS o calentamiento.

**Ningún tamaño, fotografía, escala de colisión, cámara, audio, circuito, culling ni Google Play se ha modificado.** La DEV permanece 1.2.263.
