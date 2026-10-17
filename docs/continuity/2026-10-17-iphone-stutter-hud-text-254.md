# DEV 1.2.254 — iPhone: evitar re-rasterización del HUD en cada frame

Reproducción real del propietario: DEV 1.2.253, Karting Tenerife, tironazos enormes desde el primer momento. Las optimizaciones estáticas 1.2.252-253 no resolvieron la regresión. No atribuir la causa definitiva a las fotografías.

## Evidencia inspeccionada
RaceCompetitionHudScene.update ejecutaba _syncCompetitionHud cada frame. setSectorState usaba setColor y setShadow 3 veces, sin comprobar cambios, generando repintado del Phaser.Text y potencialmente subidas de textura por frame. _setCompetitionDelta también aplicaba setColor en cada frame incluso con Δ --.-- constante.
RaceStyledHudScene.update ejecutaba _syncRaceInfoHudV2 cada frame y volvía a llamar setColor para la superficie aunque seguía mostrando exactamente el mismo estado.

## Corrección
Los estilos de sector se aplican solamente cuando cambia su estado (idle, active, done), sin alterar sus colores, sombras ni leyendas. DELTA actualiza texto o color solamente cuando cambia. Surface HUD cambia color exclusivamente al cambiar el tipo de suelo. El velocímetro y cronómetro mantienen la actualización que necesitan.
Se agrega scripts/ios-hud-text-raster-budget-smoke.mjs a prebuild y versionado DEV 1.2.254 en index.html. Sin modificar fotos, coches, física, trazados, cámara, controles, colisiones, APK/AAB, ni Google Play.

## Evidencia pendiente
Build y deploy verifican integridad de software, no FPS. Probar Tenerife 1.2.254 con FPS desactivado y después con monitor FPS activado, tras recargar la PWA. Comparar desde arranque limpio y carrera consecutiva. Si persiste, medir actualización/render/RAF en dispositivo antes de otro ajuste visual o de resolución.
