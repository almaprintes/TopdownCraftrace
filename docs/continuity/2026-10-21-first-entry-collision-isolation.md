# Continuidad 21/10/2026 — colisiones erróneas solo al entrar por primera vez

## Incidencia

El propietario informó: «Hay algunos circuitos que de primera carga se hacen un lío con las colisiones y aparecen colisiones donde no deberían. Al reiniciarlo se queda todo bien». No indicó circuito específico ni plataforma concreta. Este síntoma apuntaba a estado reutilizado en la escena.

## Hallazgo reproducible a nivel código

Phaser reutiliza la instancia `RaceScene`. La propiedad `scene.trackKey` se establece en `RaceScene.init(data)` al entrar. No obstante, `scene.track` no se sustituye por el trazado actual hasta el `RaceScene.create()` base. El envoltorio de `installRaceEnvironmentRuntime` invoca `envFor(this)` durante **preload** y nuevamente **antes de llamar al create base**.

Antes de DEV 1.2.333, `envFor` calculaba `rebuiltCanarias` a partir de `scene.trackKey`, pero TAMBIÉN de `scene.track.id`, `scene.track.meta.id` y `scene.track.trackId`. Si el jugador había visitado Canarias 4096 antes de pasar a otra pista, el objeto `scene.track` podía conservar el identificador de Canarias, activando `createTrackEnvironment('karting-canarias-4096')` sin que esa fuera la pista activa. Al reiniciar el circuito, `scene.track` ya se refería a la pista actual y el mapa de barreras coincidía de nuevo.

Este error era transversal a circuitos normales e inversos. No requiere asumir que el JSON del usuario esté mal ni cambiar sus colisiones.

## Solución integrada en main · DEV 1.2.333

- `src/game/scenes/raceEnvironmentRuntime.js` — `envFor(scene)` resuelve Environment Studio desde el **trackKey activo**. Prohibido inferir obstáculos desde `scene.track` o su metadata potencialmente residual.
- El circuito nuevo `karting-canarias-4096` y su `-inverso` siguen utilizando **su propio JSON 4096** cuando se seleccionan de verdad. La pista retirada `karting-canarias-narrow70` conserva la excepción explícita de usar el original Canarias con su escala correcta; `karting-canarias` legado mantiene su propio entorno y factor 2.5.
- Los demás circuitos (Tenerife, Américas, Santa Cruz, Atlántico, Arafo-Los Loros) mantienen idénticas geometrías y archivos de Environment Studio. Las variantes inversas comparten solamente la física del circuito correspondiente, con identidad competitiva independiente.
- `scripts/environment-first-entry-isolation-smoke.mjs` — simula la misma RaceScene con `trackKey` nuevo y `scene.track` antiguo, comparando colisiones en **primera entrada** y **reinicio**, para circuitos principales e inversos. También bloquea la herencia de proyectos de entorno en imports y previews.
- `scripts/karting-canarias-owner-project-smoke.mjs` y `scripts/owner-five-environments-smoke.mjs` — abandonan la aserción antigua que legitimaba `rebuiltCanarias` en datos previos; ahora exigen la selección por el `trackKey` en curso.
- `index.html`: DEV 1.2.333; `.github/workflows/pages.yml` ejecuta el nuevo smoke.

## Verificación

La prueba del caso reproducido indicó `PASS: first-load/restart collision geometry identical for normal/inverse circuits, independent of previous scene track; no borrowed 4096 barriers`. Workflow Build/Deploy del código anterior a la documentación: https://github.com/almaprintes/TopdownCraftrace/actions/runs/39622380369 (verde). El commit de documentación confirma el mismo código en el despliegue final.

**Pendiente:** confirmar en móvil entrando en Canarias 4096 y pasando a Tenerife/Américas/Santa Cruz, en ambos sentidos, sin reiniciar la aplicación; hacerlo también con Atlántico Inverso, y verificar límites físicos después de varios cambios de circuito. La incidencia solo se puede marcar cerrada tras esa prueba en hardware.

**Alcance:** sin cambios a línea de meta, checkpoints, física del coche, formato de Environment Studio, datos de usuario, Supabase o firmas Android. **No APK/AAB**; última QA 1.2.328, última Play 1.1.188 (vc8).
