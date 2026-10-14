# CONTINUIDAD PRIORITARIA — CROWN Cuper, skins y Fábrica (14/10/2026)

> **Para cualquier chat/agente nuevo:** leer este documento, `AGENTS.md`, `PROJECT_HANDOFF.md`, el código citado y el HEAD real de `main` **antes** de editar. No responder basándose solo en mensajes históricos. Actualizado tras la integración de DEV 1.2.197; verificar si existe una versión posterior.
>
> **Repositorio:** `almaprintes/TopdownCraftrace`. **Rama única:** `main`. **DEV:** https://almaprintes.github.io/TopdownCraftrace/dev/. **Google Play:** Android 1.1.188 / versionCode 8, NO publicar sin autorización.
>
> **Prioridad de producto:** Admin Hub configura recursos y geometría; el **jugador equipa la skin desde SU garaje**, nunca desde Admin Hub. Una sola identidad y un solo progreso por coche.

## 1. Decisiones del propietario — NO reinterpretar

1. **CROWN Cuper es el coche 18**, con identificador único `crown_cuper`. Posee las apariencias `original` (negra con techo blanco) y `gold` (negra con detalles/franjas doradas, premium). **No crear `crown_cuper_gold` como segundo vehículo.**
2. Todas las apariencias del Cuper comparten coche, físicas, piezas, maestría, kilómetros, estadísticas, progreso, desbloqueo base y récords. Solo varía el recurso visual equipado; un posible derecho premium se gestiona por separado.
3. **Garaje del jugador:** `PERSONALIZAR · SKINS`, selección individual persistida para ese coche y aplicable en garaje, lobby, carrera y fábrica. **Admin Hub:** añadir y **calibrar** apariencias, maestrías y, cuando se implemente, anclajes de luces. Admin Hub no altera la skin elegida por un usuario.
4. **Vista de carrera: estrictamente cenital** (morro arriba). **Vista de fábrica: tres cuartos frontal original**, exactamente la perspectiva derecha de las referencias/montajes suministrados por el propietario. **PROHIBIDO reemplazar por un perfil lateral duro**, reconstrucciones de stock, montajes con fondo o una imagen que represente otro coche.
5. Si la skin `gold` está equipada, la fábrica enseña Gold. **Fallback automático**: variante seleccionada → vista de fábrica original → recurso cenital original como último recurso transitorio. No dejar imágenes rotas.
6. **Calibración por skin** porque futuras imágenes pueden venir desplazadas o giradas: traslación X/Y (1 píxel por toque y pulsación mantenida), escala, rotación; un ajuste separado para cenital y fábrica 3/4. Los datos oficiales se exportan a JSON. Todo debe ser escalable a skins futuras de **los 18 coches**.
7. **Nunca cambiar físicas, hitboxes o récords para corregir un problema gráfico.** El Cuper utiliza actualmente parámetros del CROWN Axis **solo como base provisional**, pendientes de aprobación de conducción propia.
8. **No confundir generación, extracción y conversión:** si se solicita convertir una imagen ya aprobada a WebP, procesar el archivo exacto mediante PNG→WebP (Pillow/otro conversor), conservar canal alfa, resolución y encuadre. NO generar otra imagen ni inventar enlaces de descarga. Los renders de perfil lateral y los recortes con fondo que se mostraron en conversaciones anteriores fueron rechazados.

## 2. Inventario exacto de archivos (comprobado en el árbol de main)

| Uso | Ruta del repositorio | Estado |
|---|---|---|
| Cuper Original, sprite cenital | `public/assets/skins/skin_crown_cuper_original.webp` | **Existe**; 512 × 768, WebP con alfa |
| Cuper Gold, sprite cenital | `public/assets/skins/skin_crown_cuper_gold.webp` | **Existe**; 512 × 768, WebP con alfa |
| Alias históricos de los dos cenitales | `public/assets/skins/crown_cuper_original.webp`, `public/assets/skins/crown_cuper_gold.webp` | Existen y comparten hash Git con los anteriores; no duplicar otro coche |
| Fábrica Original, perspectiva tres cuartos | `public/assets/cars/workshop/mini_cooper_black_white.webp` | **Existe**; 1448 × 1086, WebP con alfa |
| Fábrica Gold, perspectiva tres cuartos | `public/assets/cars/workshop/mini_cooper_black_gold.webp` | **Existe**; 1448 × 1086, WebP con alfa |
| Geometría oficial por skin | `src/game/skins/skinGeometry.json` | Esquema v1; `cars: {}` hasta importar calibraciones |
| Calibraciones oficiales de maestría | `src/game/stats/masteryRoofCalibration.json` | 17 coches previos; Cuper pendiente de calibración específica |

**Atención:** la nota histórica de DEV 1.2.196 mencionaba `crown_cuper.webp` y `crown_cuper_gold.webp` dentro de `public/assets/cars/workshop/`. **Esos nombres se sustituyeron en DEV 1.2.197** por `mini_cooper_black_white.webp` y `mini_cooper_black_gold.webp`. **La fuente de verdad es el catálogo actual** en `src/game/skins/carSkins.js`, no una descripción vieja.

La existencia y estructura de los archivos en Git **no equivale a que el propietario haya aprobado todos los detalles visuales tras verlos en iPhone**. Verificar resultado real en Fábrica y coherencia geométrica antes de darlos como cerrados.

## 3. Código fuente y responsabilidades (no crear rutas paralelas)

| Módulo | Responsabilidad |
|---|---|
| `src/game/cars/carSpecs.js` | `crown_cuper`: **una sola entrada**; estadísticas y física provisional de Crown Axis |
| `src/game/skins/carSkins.js` | Catálogo `CAR_SKIN_CATALOG`, selección `getEquippedCarSkin`, `equipCarSkin`, persistencia local `tdr2:equippedSkins:v1`, validación de disponibilidad/premium |
| `src/game/skins/cuperAssetsStatus.json` + `scripts/detect-cuper-assets.mjs` | Puerta de seguridad: durante build, comprobar ambos WebP cenitales **512×768 con alfa** y generar `published:true` en workspace si pasan |
| `src/game/scenes/GarageLazyCardsScene.js` | **Selector del jugador** Original/Gold, tarjetas y previsualización |
| `src/game/scenes/GarageScene.js`, `src/game/scenes/MenuScene.js`, `src/game/scenes/MenuCarPreviewFixScene.js` | Integración con vistas/precarga del garaje y menú |
| `src/game/scenes/RaceScene.js` | Textura equipada para el sprite de carrera, sin cambiar identidad ni físicas |
| `src/game/ui/LobbyDomUi.js` | Presentación de la skin equipada en lobby |
| `src/game/skins/skinGeometry.js` + `src/game/skins/skinGeometry.json` | Normalización, aplicación y exportación de ajustes cosméticos; separa `original`/`gold` de `factory_original`/`factory_gold` |
| `src/game/ui/AdminSkinGeometryCalibration.js` | **Editor del propietario**: coche, skin, vista cenital/fábrica, referencia superpuesta, 1px, mantener pulsado, escala, giro, JSON |
| `src/game/scenes/CarEditorScene.js` | Entrada Admin Hub `SKINS / APARIENCIA` y herramienta `MAESTRÍA / TECHO` |
| `src/game/skins/workshopCarArt.js` | Resolvedor por skin equipada y fallback de fábrica; `factorySkinGeometryId`, `workshopCarPlacement` |
| `src/game/ui/WorkshopMobileDom.js` | Vista de fábrica DOM; fallback `img.onerror`, lectura de skin |
| `src/game/scenes/UpgradeWorkshopPremiumV3Scene.js` | Render Phaser de fábrica; fallback, anclajes por skin, texturas distintas por skin |
| `src/game/scenes/UpgradeWorkshopCarUnlockScene.js` | Catálogo de coches permitidos en fábrica, filtrado de assets incompletos |
| `src/game/ui/masteryHoldRepeat.js` | Controles de calibración táctiles con autorepetición y protección de iPhone |

**Clave:** el `src/game/skins/cuperAssetsStatus.json` versionado puede contener `{"published":false}` por diseño. No deducir que la DEV publicada oculta el Cuper solo por ese archivo: `scripts/detect-cuper-assets.mjs` lo **reescribe durante CI antes de build**. Comprobar su ejecución, los assets, el bundle resultante y el comportamiento de DEV.

**Premium actual:** `gold` puede equiparse en DEV para pruebas mediante `dev:true`; en producción `skinIsUnlocked` exige autorización y **la monetización/desbloqueo definitivo aún no se ha integrado ni aprobado**. No marcar Gold como comprada en producción por mera selección local.

## 4. Proceso de producción de imágenes aprobado

1. **Partir de los recursos exactos del propietario**. Para Fábrica, la **imagen de la derecha** de los montajes suministrados representa el 3/4 correcto. Para Carrera, se usa un sprite 100 % cenital, morro arriba. No mezclar, no redibujar innecesariamente, no cambiar decoración de techo o detalles.
2. **Una misma geometría por coche** es el ideal; si Original y Gold no encajan, ajustar cada skin desde Admin Hub sin alterar el original ni la física.
3. **Canal alfa real:** el fondo debe ser transparente en los datos de la imagen, no cuadrícula pintada, ni fondo negro/blanco. Conservar detalles claros (techo blanco, llantas, cristales, reflejos) y la silueta entera.
4. **Conversión técnica**, cuando ya existen PNG definitivos: abrir PNG original y guardar WebP RGBA sin pérdidas; validar ancho, alto, modo/alfa y transparencia en bordes. **Nunca usar generación de IA para una petición de mera conversión.**
5. **Si se piden enlaces:** crear físicamente los archivos en `/mnt/data` en la sesión activa y verificar su existencia. Entregar enlaces `sandbox:/mnt/data/archivo.webp` **solo** después de confirmar su ruta. En conversaciones anteriores se entregaron enlaces truncados y se mezclaron imágenes incorrectas: **no repetir**.
6. **Nombres que espera el runtime**: los cuatro recursos oficiales del inventario anterior. Tras incorporar/cambiar binarios, comprobar que GitHub contiene realmente cada blob y que Build/Deploy pasan en el **HEAD exacto**.
7. **Control visual:** revisar en iPhone tras publicar que vista original y Gold corresponden al modelo, y que cada vista de fábrica mantiene la perspectiva tres cuartos. No declararlas aprobadas solo por pasar tests de cabecera WebP.

## 5. Datos, pruebas y publicación

- **Una sola progresión:** guardar coche bajo `crown_cuper`; guardar la preferencia de apariencia en `tdr2:equippedSkins:v1` (objeto por coche), no en el ID de coche.
- **Geometría por apariencia:** `src/game/skins/skinGeometry.json`, esquema `1`, `units: "car_short_axis_ratio"`. Claves cenital `original`, `gold`; fábrica `factory_original`, `factory_gold`. Calibraciones del editor son borradores locales hasta que el propietario exporte el JSON y se integre en el repo.
- **Maestrías:** siguen ancladas a identidad de coche; el sistema permite calibración geométrica según skin cuando haga falta. El Cuper todavía requiere revisión y exportación de su maestría.
- **Luces delanteras y freno:** la idea de **editor de anclajes por coche/skin** y faro blanco de halo corto está acordada conceptualmente, **pero NO confundirla con una implementación terminada**; revisar código antes de prometerlo.
- **Pruebas específicas:** `scripts/cuper-skins-smoke.mjs`, `scripts/cuper-workshop-skin-smoke.mjs`, `scripts/detect-cuper-assets.mjs` y las smoke del editor/maestrías. La prueba de taller comprueba nombres, 1448×1086 con alfa, fallback y ubicación por skin; la de cenital, 512×768 con alfa.
- **GitHub Actions:** `.github/workflows/pages.yml`. Solo anunciar «DEV lista» si **Build + Deploy = completed/success** para el SHA actual de `main`. Si falla un test, leer el log, corregir el test/código realmente obsoleto y revalidar. No bloquear por jobs Android omitidos en cambios PWA-only.
- **Release:** no generar APK/AAB ni tocar Google Play Android 1.1.188 sin orden expresa del propietario. No crear ramas nuevas ni trabajar sobre dev-first-update.

## 6. Estado y siguiente paso recomendado para otro chat

Última funcionalidad identificada al redactar: **DEV 1.2.197**, que conecta los dos WebP de fábrica 3/4 ya existentes, la calibración `factory_*` y las skins del jugador. **Verificar HEAD y Actions de nuevo antes de responder**: las versiones pueden avanzar mientras esta nota se actualiza.

1. Comprobar Build + Deploy de la última iteración y probar en teléfono: garaje → equipar Original/Gold → lobby → carrera → fábrica; verificar que solo cambió el aspecto y la perspectiva 3/4.
2. Recibir y publicar ajustes calibrados desde Admin Hub; inspeccionar si posición/tamaño de Fábrica y cenital son correctos para cada skin.
3. Resolver desbloqueo real de Gold por entitlement, solo cuando el propietario defina cómo se obtiene y autorice su integración.
4. Ampliar el mismo catálogo y el mismo flujo a skins de otros coches; no copiar todo el coche para cada skin.
5. Abordar posteriormente la calibración de luces de freno y delanteras con halo blanco corto; mantenerla separada de física y progreso.

**Nota de continuidad:** esta documentación sustituye cualquier indicación anterior de crear una vista lateral ortográfica o de usar `crown_cuper*.webp` como nombre de asset de fábrica. La autoridad para rutas es **el código de `src/game/skins/carSkins.js`** y los binarios confirmados en el árbol Git.
