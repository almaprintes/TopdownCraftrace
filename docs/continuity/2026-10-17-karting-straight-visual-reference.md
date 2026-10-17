# Top Down RACE — Referencia geométrica visual de tres kartings

**17/10/2026 · SOLO INVESTIGACIÓN · PWA DEV 1.2.263 SIN CAMBIOS.** Resultado obtenido del artefacto POST-INSTALADORES [GitHub Actions 39062892786](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39062892786). 36 cortes Bézier por circuito; silueta alfa de Spark original **31,13 unidades mundo de ancho**.

## Comparación directa en rectas candidatas

| Circuito | Rectas seleccionadas | Anchura asfalto | Ocupación del mismo Spark | Densidad WebP iPhone / unidad mundo |
|---|---:|---:|---:|---:|
| karting-tenerife | 2 | 150–170 px | 18.4–20.7 % | 0.65 texeles |
| karting-americas | 4 | 147–210 px | 14.8–21.2 % | 0.65 texeles |
| karting-canarias | 3 | 251–314 px | 9.9–12.4 % | 0.26 texeles |

El contraste es robusto en las muestras seleccionadas: **Américas tiene zonas estrechas comparables a Tenerife** (Spark ~19–21 %), mientras que **las tres rectas seleccionadas de Canarias mantienen una relación carretera/coche mucho más grande** (Spark ~10–12 %). La amplitud de Canarias puede responder en parte a la decisión explícita de ampliar el mundo ×2,5 para mejorar duración y sensación de carrera. **No revertirlo por defecto**.

## Coordenadas para revisión de cada recta en Track Studio

| Circuito | % recorrido | Punto foto original (X, Y) | Asfalto mundo | Spark ocupa | Margen idealizado por lado | Cambio dirección vecina |
|---|---:|---|---:|---:|---:|---:|
| karting-tenerife | 73.6% | (1007.3, 1219.9) | 150.1 px | 20.7% | 59.5 px | 0.3° |
| karting-tenerife | 93.1% | (1942.7, 1598.3) | 169.5 px | 18.4% | 69.2 px | 2.1° |
| karting-americas | 6.9% | (786.7, 1673.6) | 209.8 px | 14.8% | 89.3 px | 0.2° |
| karting-americas | 26.4% | (920.6, 1484.4) | 187.7 px | 16.6% | 78.3 px | 0.2° |
| karting-americas | 48.6% | (1275.9, 1092.3) | 160.3 px | 19.4% | 64.6 px | 1.2° |
| karting-americas | 62.5% | (1543.2, 1009.1) | 146.7 px | 21.2% | 57.8 px | 1.8° |
| karting-canarias | 4.2% | (1362.6, 1577.2) | 251.1 px | 12.4% | 110.0 px | 0.5° |
| karting-canarias | 37.5% | (744.7, 1035.5) | 261.8 px | 11.9% | 115.3 px | 0.1° |
| karting-canarias | 62.5% | (1153.3, 934.2) | 314.1 px | 9.9% | 141.5 px | 0.2° |

## Método y confianza

- Fuente exacta: `inventory.json` generado **después de los instaladores oficiales**, más `alpha-kartings.json` para la anchura real del Spark (WebP transparente, umbral alfa 16/255). No utilizar los `track.json` versionados de Tenerife/Américas como equivalentes a los servidos: algunos son obsoletos o inexistentes antes del build.
- Para cada una de las 36 estaciones de la vuelta, comparar vectores hacia la estación anterior y siguiente. Aceptar **cambio de dirección ≤8°**, desviación del punto respecto a la cuerda vecina **≤16 % de la anchura de asfalto** y variación de anchura de las tres estaciones **≤40 %**. Preferir los puntos con mejor continuidad y exigir **≥12 % de separación de vuelta** entre candidatos seleccionados.
- Se seleccionaron **2 rectas en Tenerife (confianza baja por el muestreo limitado)**, **4 en Américas** y **3 en Canarias**. La separación entre muestras es ~400–450 unidades mundo: una curva corta entre dos muestras puede no detectarse. Por tanto, son **candidatos geométricos**, no rectas visualmente certificadas.
- El valor «margen por lado» es **solo una simulación SIMÉTRICA**: `(ancho total - 31,13)/2`. El inventario original registra ancho total, pero no exporta por separado distancias a cada límite. No afirmar que ambos lados sean iguales ni que haya despeje real frente a neumáticos, pianos, colisiones u obstáculos.
- Los puntos están expresados en coordenadas de la **foto maestra**. Canarias usa foto 2048×3072 y mundo ×2,5; sus coordenadas se obtuvieron dividiendo el punto del mundo entre 2,5. El zoom de cámara NO cambia porcentaje coche/carretera.

## Referencia de diseño provisional

**Mantener Spark igual en todos los kartings y usarlo como patrón de comparación**, no como una nueva escala física que se imponga. Primero comprobar sobre las fotos las coordenadas seleccionadas (si hay boxes, accesos o ramales, descartar y tomar otra recta). Después validar anchura izquierda y derecha mediante intersecciones individuales con ambos bordes Bézier en el resultado POST-installer.

No introducir por ahora un «porcentaje ideal» único: Américas muestra cambios internos reales del ~15 al ~21 % y Tenerife tiene solo dos rectas confirmadas por este muestreo. Si se decide modificar Canarias, antes definir compatibilidad de colisiones, geometría, gates, kilometraje, vueltas, fantasmas y clasificaciones. El ×2,5 fue una decisión de jugabilidad, no un error accidental.

## Calidad visual y siguiente fase de rendimiento

A resolución compacta del iPhone, las variantes WebP tienen **0,65 texeles de foto por unidad mundo en Tenerife y Américas**, frente a **0,26 en Canarias**: el mundo ampliado y las imágenes reducidas pueden agravar la pixelación. Eso **no identifica por sí solo el origen de los tirones ni el calentamiento**. La arquitectura de mosaicos estáticos debe mantenerse mientras se estudia rendimiento, sin reintroducir culling dinámico ya descartado históricamente.

**Estado:** informe numérico y candidatos para validación visual; ningún coche, fotografía, circuito ni dato de jugador modificado.
