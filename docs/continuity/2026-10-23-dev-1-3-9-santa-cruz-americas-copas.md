# DEV 1.3.9 — Copas terminadas: Santa Cruz y Karting Américas

Fecha 23/10/2026 · rama única main · web DEV, sin APK/AAB ni Play.

## Petición recibida

El propietario entregó sin instrucciones adicionales `santa-cruz.environment(6).json` y `karting-americas.environment(3).json` tras integrar anteriormente «Copas» en Canarias y Tenerife. Se interpretó la misma intención: instalar únicamente las nuevas zonas visuales que pasan delante de los coches, sin tocar geometría de carrera ni colisiones. **No cambiar el nombre «Copas».**

## Datos exactos instalados

- Santa Cruz: **11** zonas `photo-canopy` / **298** vértices; conteos por zona [26,49,48,45,20,23,18,25,19,10,15]. IDs y coordenadas decimales exactas del JSON del propietario, opacidad 0.93.
- Karting Américas: **1** zona `photo-canopy`, **85** vértices, ID `canopy-1792786601346-0`, opacidad 0.93.
- Geometrías válidas sin autointersecciones; `normalizedCanopyZones` acepta las 11 zonas de Santa Cruz dentro del mundo **3072 × 4608** y la de Américas en **2862 × 3435**.
- Ambas parejas Normal/Inverso comparten el mismo proyecto físico del environment; no alterar IDs de carrera ni récords.
- **Colisiones intactas:** Santa Cruz 4 líneas Bézier, [24,8,11,12] nodos y 0 zonas sólidas. Karting Américas 8 líneas, [16,3,4,4,4,5,9,27] nodos y 0 zonas sólidas. Los demás campos de cada JSON eran idénticos entre archivo adjunto y repo (aparte de `version` y `canopyZones`). Formato canónico de repo: versión 7.

## CRÍTICO: Santa Cruz tiene fuente de compilación que SOBREESCRIBE el environment

`scripts/install-santa-cruz-source.mjs` regenera `src/game/tracks/library/santa-cruz/track.json` y **sobrescribe** `src/game/tracks/library/santa-cruz/santa-cruz.environment.json` desde `src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json` en cada Build. Por tanto, las 11 copas se añadieron a **AMBOS** archivos, usando `source/santa-cruz-photo.environment.json` como fuente definitiva. No editar solo el archivo de destino en futuras iteraciones: se perdería durante el despliegue.

## Pruebas

`scripts/environment-canopy-occlusion-smoke.mjs` mantiene las pruebas anteriores de Canarias/Tenerife e incorpora:
- Conteo de polígonos y vértices exactos, validez de cada polígono, correspondencia de pista inversa y dimensiones.
- SHA256 exacto de `JSON.stringify(canopyZones)`:
  - Santa Cruz `4fa889cbe9d142d8c7a608f02b9d3c57273ba5a3f0f02456c794ed32e9d74539`.
  - Américas `0b2276d161b1a990e851de64a7b413c5bf147ede029c6c93bc7d2c92a8543fab`.
- Fuente = destino para las copas de Santa Cruz, instalador de foto, invariantes de 4 y 8 líneas y de 0 zonas sólidas.
- Test de máscara reciclada de fotografía, limpieza shutdown, no colisiones visuales.
- DEV `1.3.9`.

**Pendiente aceptación visual en iPhone y Android** (fotos por encima de coches, orden normal/inverso, precisión del contorno y FPS). Aunque no se crean fotos nuevas, 11 áreas en Santa Cruz podrían aumentar overdraw; verificar en móvil. Google Play 1.2.335/vc10 intacta.
