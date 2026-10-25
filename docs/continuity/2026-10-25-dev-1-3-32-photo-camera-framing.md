# DEV 1.3.32 — Encuadre fotográfico: primera corrección controlada

Fecha: 25 de octubre de 2026 · Top Down RACE · rama main.

Queja de varios jugadores: los circuitos parecen ampliados/pixelados frente a una referencia de asfalto cenital con bordillos y fisuras muy definidos. El usuario sospecha de excesivo zoom para mostrar el coche grande. Se auditaron la cámara, la resolución de texturas y el framebuffer.

**Hallazgos verificados:**
- `RaceScene` base define 0.75–1.50, pero la subclase efectiva `RaceWideCameraPreviewScene` pisa esos límites a **0.62–1.06**. Por tanto, el máximo efectivo NO era 1.50.
- En iPhone las texturas WebP de fotos se preparan/descodifican al **65 % de cada dimensión**, y se amplían a las coordenadas de pista originales mediante escala. La carga GPU se reduce aprox. 58 %; esto difumina detalles al hacer zoom.
- El framebuffer iPhone compacto en calidad Alta limita la resolución a 1; Ultra permite 1.5. Aumentar ambas cosas sin medir memoria/rendimiento puede producir tirones.

**Implementación de esta iteración:**
- **Solo en DEV + circuitos photo-native**: limitar el zoom dinámico máximo a **0.86×** en `raceCameraZoomTarget(trackKey, base, devPhotoWide)`. A alta velocidad, el mínimo efectivo 0.62 no cambia. Ajustar también la cámara al inicializar el follow.
- Otros circuitos y producción conservan comportamiento original; sin alterar geometría, anchura, carScale, HUD, colisiones, física, tiempos, WebP, memoria GPU o carga de red.
- Smoke de regresión `npm run check:photo-camera-framing` en prebuild.
- Tras comprobar visualmente en iPhone la relación coche/entorno y los FPS, evaluar segundo paso independiente: un modo de WebP al 80–85 % (solo Alta/Ultra) y el framebuffer iPhone. No activar automáticamente hasta medir.

No APK ni AAB. Sin cambio de Google Play.
