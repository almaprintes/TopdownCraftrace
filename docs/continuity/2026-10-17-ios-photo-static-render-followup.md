# DEV 1.2.253 — superficies heredadas y diagnóstico redundante

Base: main DEV 1.2.252. Cambio exclusivo de DEV/PWA; sin Android ni Google Play, sin alteración de fotografía original, física, trazados, controles, coches o checkpoints.

## Problema comprobado en el código
Las clases RaceSemiSimScene, RaceSurfaceRefineScene, RaceSurfaceEnvironmentScene, RaceSurfaceGrassBladeScene, RaceSurfaceMaterialBlendScene y RaceMaterialScene ejecutaban Graphics estáticos para marcas de frenada, desgaste y hierba desde centerline también en image-native. Los WebP ya contienen ese arte. RaceSurfaceLongitudinalScene evitaba su propia capa, pero no el trabajo ejecutado por super.create.
Las seis clases siguen ejecutando super.create y se saltan solo su decoración redundante con isImageNativeTrackScene. Los circuitos clásicos quedan intactos. RaceMaterialScene.preload deja de solicitar materiales no utilizados en foto según el registro de pistas. El montaje fotográfico limpia defensivamente los restos de los tres Graphics heredados.

## Monitor FPS
Activar Mostrar FPS ya no activa las pruebas experimentales A/B que ocultan HUD, overlays o chunks y cambian la visibilidad en cada frame. Requieren además localStorage.setItem('tdr2:renderIsolation','1') antes de entrar a carrera. El modo A/B actualiza su panel cada 750ms; el monitor FPS convencional se mantiene.

## Comprobación
scripts/ios-photo-procedural-overhead-smoke.mjs queda integrado en npm run prebuild para asegurar las protecciones y el opt-in. Build y Deploy no demuestran la fluidez del iPhone: es obligatoria prueba real a temperatura normal, carrera fría y transición Tenerife → Atlántico → Tenerife, 10 minutos continuos, con Mostrar FPS activado e inactivo, y verificación visual de foto.
Si persisten tirones, medir tiempos de frame WebKit/Phaser, memoria GPU y temperatura antes de realizar nuevas reducciones de calidad.
