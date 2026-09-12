# TopdownCraftrace — PROJECT HANDOFF

> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Fuente oficial: `almaprintes/TopdownCraftrace`. Desarrollo normal en `main`; beta pública estable en `beta-1.0`.

## ESTADO OPERATIVO — 12/09/2026

### Reglas obligatorias

- Trabajar SOLO sobre `main` para desarrollo.
- NO tocar `beta-1.0` sin autorización explícita del propietario. Es la beta pública/final 1.0 congelada.
- NO reutilizar `beta-0.0.3` ni mezclar código/assets desde ramas antiguas, recovery, lab, preview, feat, fix, tmp o backup.
- `/dev` y `/dev-live` salen de `main`; `/` sale de `beta-1.0` mediante `.github/workflows/pages.yml`.
- Antes de cambios de despliegue leer `AGENTS.md` y `.github/workflows/pages.yml`.
- Cada cambio visible de DEV debe incrementar el marcador de versión y la verificación del workflow.
- No afirmar que un deploy está listo hasta comprobar GitHub Actions.
- No tocar DELTA, minimapa, física, pedales u otras capas estables al corregir una UI concreta salvo necesidad demostrada.

### Publicación de la beta 1.0 y plataformas

La beta pública 1.0 fue separada del desarrollo mediante la rama `beta-1.0`. `main` continúa como línea DEV independiente. Google Play Console tiene la app **Top Down RACE: CraftRace** en prueba cerrada. La prueba cerrada y el proceso de testers forman parte del camino a producción; no confundir el build DEV web con la beta de Play.

Integraciones preparadas durante esta fase:

- AdMob: apps Android/iOS creadas en la cuenta AlmaPrint; rewarded en integración/prueba.
- RevenueCat: clave pública SDK de Google Play configurada y vinculación Play Console ↔ RevenueCat realizada para la app.
- Android: keystore release local creada; Java/OpenJDK 17 preparado para build.
- Soporte web: `topdownrace.almaprint.es`.
- Shipaton 2026 sigue siendo objetivo de publicación/presentación.

### DELTA — congelado

El sistema DELTA funciona y se considera estable. No modificar salvo bug concreto reportado.

- Referencia local por sesión.
- V1 crea referencia; V2 compara inmediatamente contra V1.
- Una vuelta más rápida pasa a ser la siguiente referencia.
- El cruce del seam de progreso no se trata como meta falsa.
- DEV 1.0.22 compensó el tiempo de pausa para que no entre en delta/cronometraje.
- DEV 1.0.23 conserva panel DELTA abierto/cerrado al pausar/reanudar desde el control propio.
- DEV 1.0.24 añadió variación determinista/local del texto de informe de sesión, sin IA/backend.
- IA generativa para informes queda aplazada.

### Controles de dirección — DOM

Tras varios intentos con objetos Phaser afectados por el zoom/cámara, los botones IZQUIERDA/DERECHA se migraron a DOM fijo.

Principio vigente: los controles de pantalla que deban permanecer absolutamente inmóviles no deben compensar cada frame `getWorldPoint()` + `1/zoom` si pueden vivir en DOM.

Los botones DOM conservan:

- posiciones de `readControlLayout().layout.left/right`;
- separación mínima y clamping ya aprobados;
- semántica `this.touch.buttonSteer = -1 / 1 / 0`;
- interacción táctil y estado pulsado;
- compatibilidad con layout zurdo mediante los puntos semánticos existentes.

No tocar gas/freno/freno de mano ni física al trabajar en estos botones.

### Texto de diagnóstico — eliminado

El texto de diagnóstico provenía del `RaceScene.js` base (`_diagText` / `_diag`). Para impedir que reaparezca por callbacks tardíos se añadió `src/game/scenes/RaceNoDiagScene.js`, que neutraliza `_diag`, destruye `_diagText` y elimina firmas de diagnóstico en `postupdate`.

Debe permanecer eliminado tanto en iOS como Android. Si vuelve a aparecer, investigar el origen antes de añadir más texto/debug visible.

### Minimapa — DOM/SVG estático

DEV 1.0.34 migró el minimapa visible fuera de la cámara Phaser mediante `src/game/scenes/RaceStaticMinimapScene.js`.

Motivo: el sistema anterior intentaba fijarlo con `getWorldPoint()` y escala inversa `1/zoom`, produciendo un pequeño movimiento o “respiración” sincronizado con el zoom dinámico.

Estado actual:

- trazado, meta y marcador se presentan en SVG/DOM fijo;
- el marcador sigue leyendo posición/orientación real del coche;
- el panel ya no debe moverse con el zoom de la cámara;
- no rehacer este cambio volviendo a compensación Phaser salvo decisión explícita.

### Panel FANTASMA / RÉCORD CARGADO — DEV 1.0.35

Último cambio implementado y desplegado con éxito: **DEV 1.0.35**.

Archivo: `src/game/scenes/RaceStaticGhostStatusScene.js`.

Problema observado en dispositivo: los textos `👻 FANTASMA` y `RÉCORD CARGADO` permanecían correctamente colocados, pero los rectángulos/cajas Phaser se desplazaban milimétricamente con la cámara, igual que ocurría con el minimapa.

Solución implementada:

- wrapper sobre `RaceStaticMinimapScene`;
- localiza las etiquetas existentes del panel fantasma y usa su geometría como ancla inicial;
- retira visualmente el chrome/objetos Phaser del panel;
- crea un panel fijo DOM `#tdr-static-ghost-status` con tres filas, borde y fondo;
- presenta también las etiquetas en el DOM para que caja y texto compartan exactamente el mismo sistema de coordenadas;
- posición CSS calculada a partir del `getBoundingClientRect()` del canvas y dimensiones lógicas Phaser;
- sincronización en `postupdate`, resize y `tdr:viewportchange`;
- se oculta durante el informe de sesión y se elimina en shutdown.

`src/game/game.js` ya encadena `RaceStaticGhostStatusScene.js` como capa actual de carrera.

Workflow `.github/workflows/pages.yml` verifica la presencia de `RaceNoDiagScene.js`, `RaceStaticMinimapScene.js` y `RaceStaticGhostStatusScene.js`, y el marcador visible **DEV 1.0.35**.

Deploy confirmado: GitHub Actions run `34680958381`, commit `cb3927e654166833a24d245a5eabd45e5bd5216e`, conclusión `success` (12/09/2026).

**Pendiente inmediato:** validar DEV 1.0.35 en dispositivo real. Comprobar especialmente que las cajas `FANTASMA / RÉCORD CARGADO` no se desplazan al acelerar/frenar mientras cambia el zoom y que no se ha alterado el resto del HUD.

### Historial reciente útil

- DEV 1.0.24: informe de sesión con wording local variable; DELTA estable.
- DEV 1.0.25–1.0.27: intentos fallidos de estabilizar controles; no reutilizar esas aproximaciones.
- DEV 1.0.28: restauración segura del sistema anterior de dirección.
- DEV 1.0.29–1.0.31: investigación del acoplamiento a cámara; se confirma que `getWorldPoint()` + `1/zoom` deja micro-movimiento.
- DEV 1.0.32: dirección migrada a DOM fijo.
- DEV 1.0.33: capa robusta para eliminar diagnóstico.
- DEV 1.0.34: minimapa migrado a DOM/SVG fijo.
- DEV 1.0.35: panel de estado fantasma migrado a DOM fijo.

### Criterio técnico aprendido

En iOS la `uiCam` está desactivada por estabilidad y gran parte del HUD histórico se renderiza mediante la cámara principal. Los elementos Phaser que se intentan mantener fijos compensando scroll/zoom pueden “respirar” milimétricamente. Para HUD puramente de pantalla que necesite inmovilidad absoluta, preferir DOM fijo bien anclado al canvas, manteniendo en Phaser únicamente aquello que realmente necesite coordenadas del mundo.

No migrar masivamente el HUD por sistema: hacerlo elemento a elemento cuando exista un problema real y conservar intacta la lógica estable.

## Estado histórico anterior

Las decisiones previas de fabricación, inventario, tienda, economía, IA de Supervivencia, assets, garaje, pistas y demás trabajo anterior a la beta siguen disponibles en el historial Git y en `docs/`. Este handoff prioriza desde ahora el estado operativo posterior a la publicación de beta 1.0 para evitar que un chat nuevo parta de información obsoleta.
