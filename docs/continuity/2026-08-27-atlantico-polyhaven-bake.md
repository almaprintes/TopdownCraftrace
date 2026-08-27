# Continuidad — 2026-08-27 — Atlántico, Poly Haven y bake de terreno

## Objetivo
Mejorar la calidad visual de las superficies de los circuitos (asfalto, hierba y tierra) usando materiales Poly Haven, manteniendo rendimiento móvil alto y presets gráficos simples para el usuario.

## Decisión arquitectónica DEFINITIVA
No usar TileSprites/chunks visuales como arquitectura final del terreno. Los chunks pueden seguir existiendo para geometría, lógica, física, detección y herramientas, pero NO deben ser la representación visual final de carrera.

El terreno estático debe hornearse offline y mostrarse en runtime como un máximo de 4 superficies grandes por circuito. Para Atlántico (track01), mundo 2430x2000, son 4 cuadrantes de aproximadamente 1215x1000.

Ventajas verificadas en iPhone real:
- pantalla de carga de Atlántico ~1 segundo;
- render del terreno alrededor de 0.6–0.8 ms en las capturas de prueba;
- Ultra observado alrededor de 52–58 FPS según zona/momento;
- se evita mantener decenas de GameObjects, máscaras y chunks visuales;
- se evita descargar materiales Poly Haven vivos cuando existe Beauty Layer;
- la apariencia final queda incluida en los WebP horneados y será la misma al empaquetar la app.

Principio: Poly Haven es fuente de trabajo/bake, no dependencia de runtime del jugador.

## Loader/runtime
Cuando track01 dispone de Beauty Layer, la cadena de carga evita descargar las texturas vivas grass/off/asphalt y el piloto PBR correspondiente. El runtime usa las cuatro beauty tiles y destruye/reemplaza el terreno visual legado. La lógica del circuito permanece separada.

## Materiales elegidos para el piloto Atlántico
- Asfalto: Poly Haven `asphalt_02`, fuente 2K `asphalt_02_diff_2k.jpg`.
- Hierba: Poly Haven `sparse_grass`, fuente 2K `sparse_grass_diff_2k.jpg`.
- Tierra/offroad: Poly Haven `rocky_trail_02`, fuente 2K `rocky_trail_02_diff_2k.jpg`.

La hierba fue aprobada visualmente y no debe tocarse sin motivo. La tierra gustó, aunque anteriormente se pidió oscurecerla para integrarla mejor con la hierba; el bake actual usa brightness 0.78 para outer/offroad.

## Escala y error descubierto
Durante las pruebas se intentó cambiar `tileScaleX/tileScaleY` del asfalto por chunk. No funcionaba porque el asfalto visible se creaba como `Image` con `setDisplaySize`, no como TileSprite. Además, la textura 2K completa ya se comprimía implícitamente dentro de cada chunk. El experimento de convertir chunks a TileSprite sirvió para diagnosticar el problema, pero NO debe recuperarse como arquitectura final.

La escala visual se fija ahora durante el bake. En el baker de Atlántico:
- roadCell: 205 px de mundo;
- roadMacroGrid: 4;
- macro del asfalto: 820x820 px de mundo;
- hierba: 1126 px de mundo;
- tierra: 983 px de mundo.

Cambiar de 1K/2K/4K no debe cambiar la escala física aparente; la resolución de fuente y la escala física son conceptos separados.

## Evolución del asfalto
### v8 anti-repeat
Se creó una macrotextura 4x4 del mismo `asphalt_02`, alternando base/flip/flop/flipflop/180 grados. Esto aumentó el periodo de repetición, pero NO resolvió el problema perceptivo: las grietas individuales largas seguían siendo demasiado reconocibles.

### v9 softcracks
Se intentó atenuar aproximadamente un 78% la presencia de las grietas grandes mediante blur + parte del original. En iPhone real las grietas continuaban dominando visualmente y aparecían líneas largas casi paralelas en la pista. Conclusión: bajar opacidad/contraste no basta.

### v10 clean asphalt — EN CURSO
Decisión actual: eliminar las grietas largas de la textura base y reconstruir solo microdetalle/grano del asfalto. No añadir todavía grietas decorativas independientes. Primero evaluar un asfalto limpio.

Implementación en `scripts/bake-atlantico-beauty.mjs`:
- conserva `asphalt_02` como fuente;
- genera componente de baja frecuencia con blur fuerte para tono/iluminación;
- extrae microdetalle mediante diferencia respecto a un blur pequeño;
- recompone microdetalle sobre la base limpia;
- mantiene macro 4x4 anti-repetición;
- no cambia hierba, tierra, geometría ni runtime;
- revisión de assets: `atlantico-polyhaven-v10-clean-asphalt`;
- cache bust: `?v=atlantico-v10`.

Commit del baker v10: `cfaaf38bed57b776300e63bd1e55e3c9bd23616f`.

El usuario pidió que se le avise cuando bake + publicación en Pages estén realmente listos antes de probar.

## Rendimiento observado
Capturas de iPhone en Ultra tras adoptar las cuatro superficies grandes:
- ejemplo v8: 58 FPS instantáneo, L2 53 FPS, RENDER ~0.8/3.0 ms;
- ejemplo v9: 52 FPS instantáneo, L2 52 FPS, RENDER ~0.6/1.0 ms;
- los tests ALL / NO UI / NO OVERLAY / NO TRACK CHUNKS rondaban ~0.6–0.8 ms en esas capturas.

Conclusión: el terreno horneado ya no parece ser el cuello de botella principal. Después de cerrar visualmente Atlántico, investigar picos de CPU/OTHER/UPDATE y fluidez, sin volver a chunks visuales.

## Presets gráficos acordados
La dirección UX es sustituir ajustes gráficos técnicos individuales por cuatro presets automáticos:
- Rendimiento
- Medio
- Alta calidad
- Ultra

El usuario no debe tener que actuar como ingeniero gráfico. La resolución/materiales y efectos internos se deciden por preset. La arquitectura de bake debe poder generar las variantes necesarias sin cambiar la escala física de las superficies.

## Pipeline para producción
Objetivo final:
1. editar circuito/materiales fuente;
2. ejecutar baker offline;
3. generar máximo 4 superficies finales por circuito (y, si procede más adelante, mapas auxiliares optimizados);
4. validar que el bake está actualizado;
5. empaquetar Android/iOS con esos assets;
6. el dispositivo del jugador solo carga/renderiza resultados ya horneados.

Ideal futuro: hacer que el build falle si un circuito requiere Beauty Layer y su bake está ausente/desactualizado.

## Próximo paso
Esperar a que el workflow del v10 termine, publique los cuatro WebP en main y GitHub Pages despliegue esa revisión. Probar Atlántico en Ultra en iPhone real. Evaluar exclusivamente:
1. si desaparecieron las grietas repetitivas;
2. si el micrograno sigue pareciendo asfalto y no una mancha gris;
3. FPS/fluidez y ausencia de regresiones.

Si el asfalto limpio funciona, congelar visualmente las tres superficies de Atlántico y pasar a optimizar los picos de CPU/OTHER/UPDATE antes de extender el pipeline al resto de circuitos.
