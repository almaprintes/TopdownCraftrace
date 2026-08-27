# Pipeline oficial de implantación visual de circuitos

Este documento fija el procedimiento obligatorio para implantar o rehacer visualmente cualquier circuito de Top Down RACE. El patrón de referencia es **Circuito Atlántico**. Karting Tenerife debe seguir exactamente el mismo método y los siguientes circuitos deben reutilizar este pipeline sin crear variantes ad hoc.

## Objetivo

Cada circuito se construye visualmente a partir de **tres superficies aprobadas explícitamente**:

1. `road` — asfalto o superficie principal de rodadura.
2. `shoulder` — hierba, grava u hombro inmediato de pista.
3. `outer` — terreno exterior.

No existe un material global obligatorio para todos los circuitos. Se pueden repetir materiales entre circuitos cuando tenga sentido, pero cada circuito debe declarar su combinación de forma explícita.

## Regla principal

El jugador **no renderiza TileSprites ni compone cientos de chunks de terreno en tiempo real**. Las tres superficies se combinan offline y se hornean en **cuatro grandes tiles WebP** que cubren el mundo completo del circuito.

Esto es el patrón aprobado en Atlántico y debe mantenerse por rendimiento, estabilidad y consistencia visual en iPhone y Android.

## Procedimiento obligatorio

### 1. Elegir y aprobar las tres superficies

Antes de tocar el circuito se decide expresamente:

- material de pista;
- material de hombro;
- material exterior.

No se hace bake definitivo con materiales provisionales.

### 2. Conservar la fuente original

Si el material se recibe en 1K / 2K / 4K, esas versiones son **fuentes de trabajo**, no recursos de runtime.

Para el bake normal se utiliza el mapa `diffuse/albedo` de **2K** salvo que exista una razón visual concreta para otra resolución. Los mapas normal, roughness, displacement y los archivos `.blend` no se cargan durante una carrera.

El objetivo es que la apariencia sea la misma en todos los dispositivos; los presets gráficos no deben sustituir una textura por otra con aspecto diferente.

### 3. Calibrar escala física

Nunca se usa la escala por defecto del archivo descargado.

Cada superficie se calibra visualmente contra:

- tamaño aparente del coche;
- anchura de pista;
- zoom dinámico de cámara;
- repetición perceptible del patrón;
- riesgo de moaré.

La configuración resultante queda fijada por circuito. Atlántico es la referencia de tamaño visual, no una plantilla numérica que se copie automáticamente.

### 4. Construir la geometría desde el trazado real

El baker usa `TrackBuilder` y el `track.json` del circuito para obtener:

- ribbon de asfalto;
- hombros;
- terreno exterior;
- dimensiones reales del mundo.

No se redibuja el circuito manualmente para el bake.

### 5. Componer offline

Las superficies se aplican en coordenadas de mundo y se rasterizan offline.

Orden visual:

1. exterior;
2. hombro;
3. pista.

Pianos y props permanecen fuera del beauty layer salvo decisión explícita posterior.

### 6. Dividir en cuatro grandes superficies

El mundo completo se divide en cuatro cuadrantes:

- superior izquierdo;
- superior derecho;
- inferior izquierdo;
- inferior derecho.

Cada cuadrante genera un WebP independiente. No aumentar el número de tiles salvo evidencia de que un circuito concreto supera límites de textura del dispositivo.

### 7. Generar preview y manifest

Cada bake debe producir:

- `<track>-beauty-preview.webp`;
- `<track>-beauty-0.webp`;
- `<track>-beauty-1.webp`;
- `<track>-beauty-2.webp`;
- `<track>-beauty-3.webp`;
- `manifest.json`.

El manifest debe registrar como mínimo:

- revisión del bake;
- dimensiones del mundo;
- tres superficies utilizadas;
- escala física de cada superficie;
- geometría base;
- coordenadas de los cuatro tiles.

### 8. Publicar de forma AISLADA por circuito

**Nunca se ejecuta `bake -- all` para implantar o ajustar un circuito individual.**

Cada workflow de implantación debe hornear solo la pista que se está trabajando. Ejemplo:

`npm run bake:track -- karting-tenerife`

El workflow solo puede reemplazar los assets de `public/assets/tracks/<track>/beauty/` correspondientes a ese circuito.

Después de publicar esos assets se ejecuta `scripts/build-track-beauty-catalog.mjs`. Ese script reconstruye `trackBeautyLayers.generated.js` leyendo **todos los manifests ya publicados**, de modo que actualizar Tenerife no borra ni regenera Atlántico.

Como salvaguarda, el workflow debe verificar que los circuitos previamente congelados siguen presentes en el catálogo antes de hacer commit.

### 9. Runtime

El runtime solo consume los cuatro WebP publicados y el catálogo generado. No debe depender de Poly Haven, ZIPs del usuario ni fuentes externas durante la carrera.

### 10. Validar en dispositivo real

No se considera aprobado por ver correctamente el preview.

Validación mínima:

- Android de gama media;
- iPhone;
- cámara lenta y rápida;
- zonas con mayor repetición visible;
- costuras entre los cuatro tiles;
- escala del grano respecto al coche;
- moaré;
- FPS y tirones.

### 11. Congelar el circuito

Cuando el usuario lo aprueba:

- se marca la revisión como aprobada;
- no se modifica automáticamente al trabajar en otro circuito;
- reutilizar un material en otro circuito no implica cambiar escala, brillo o configuración del circuito ya aprobado.

## Parámetros que SÍ pueden variar por circuito

- los tres materiales;
- escala física de cada material;
- brillo o corrección ligera de exposición;
- calidad WebP si existe una necesidad concreta;
- previewWidth;
- revisión del bake.

## Parámetros que NO deben cambiar sin una razón técnica demostrable

- cuatro grandes beauty tiles;
- bake offline;
- geometría tomada del `track.json`;
- separación entre beauty layer, pianos y props;
- runtime sin dependencia de las fuentes originales;
- validación en móvil antes de congelar;
- aislamiento del bake por circuito.

## Circuito Atlántico

Circuito patrón ya aprobado. **No debe modificarse al implantar otros circuitos.**

Sus materiales, WebP publicados, manifest y escalas permanecen congelados hasta que el usuario pida explícitamente revisarlo.

## Karting Tenerife

Primer circuito que replica formalmente este pipeline tras Atlántico.

Materiales seleccionados por el usuario:

- `road`: Clean Asphalt (`clean_asphalt_diff_2k.jpg` para el bake offline);
- `shoulder`: Grass Medium 01 (`grass_medium_01_diff_2k.jpg`, variante normal, no `dry`);
- `outer`: la misma tierra aprobada de Atlántico (`rocky_trail_02`, con brillo y escala aprobados).

Primera calibración de prueba:

- Clean Asphalt: ~225 px de repetición física;
- Grass Medium 01: ~574 px;
- tierra: ~983 px, idéntica escala física a Atlántico.

Estas dos primeras escalas se validan visualmente en Karting Tenerife antes de congelar la revisión. Compartir la tierra de Atlántico no obliga a reutilizar automáticamente ninguna otra superficie.

Workflow dedicado: `.github/workflows/bake-karting-tenerife.yml`. Debe hornear **solo** `karting-tenerife`, publicar solo esa carpeta, reconstruir el catálogo desde los manifests existentes y comprobar que `track01` sigue presente.

## Regla para futuros circuitos

Para añadir otro circuito:

1. elegir tres superficies;
2. declarar su configuración explícita;
3. calibrar escalas;
4. crear/usar un bake aislado para esa pista;
5. publicar solo sus cuatro tiles + preview + manifest;
6. reconstruir el catálogo desde todos los manifests publicados;
7. validar en móvil;
8. congelar.

Si para un nuevo circuito parece necesario crear otro pipeline, primero hay que demostrar por qué este no sirve. La excepción debe ser técnica, no por comodidad.
