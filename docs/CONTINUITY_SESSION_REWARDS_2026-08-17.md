# Top Down RACE — continuidad de sesión y recompensas (17/08/2026)

Este documento complementa `PROJECT_HANDOFF.md` y el README. El código actual de `main` tiene prioridad.

## Flujo de final de sesión

- La escena activa de carrera se carga desde `RaceSessionFinalPolishScene.js`.
- Los cofres no interrumpen la conducción: se acumulan durante la tanda y se presentan al finalizar sesión.
- El jugador finaliza de forma controlada desde Pausa → `FINALIZAR SESIÓN`.
- El cierre muestra primero recompensas/cofre y después el informe de sesión.
- `ABANDONAR SESIÓN` sigue siendo una salida distinta, sin representar el cierre normal de la tanda.

## Cofre por categoría

La presentación usa un solo cofre según las vueltas premiadas de la sesión:

- 5–9 vueltas → cofre 5
- 10–14 → cofre 10
- 15–19 → cofre 15
- etc., en escalones de 5.

Esto NO cambia el balance: el botín real sigue siendo el concedido por `garageStore.js`; solo se consolida la presentación visual.

## Materiales

El catálogo tiene ocho materiales: Chatarra, Aleación, Goma, Compuesto, Disco metálico, Muelle, Engranaje y Electrónica. Los siete primeros forman el pool común y Electrónica es un drop especial. La pantalla final muestra siempre los ocho; los no obtenidos aparecen atenuados con ×0 para evitar la falsa impresión de que falta un material del sistema.

## Penalización antiatajo

La penalización antiatajo de +2.000 s ya modifica el tiempo real de vuelta mediante `lapStart`. `RaceSessionFinalPolishScene.js` añade además una marca por número de vuelta para que el informe indique explícitamente `+2.000 s` en la vuelta penalizada, sin volver a sumar la penalización.

## UI final de recompensas

La ventana final se compactó para paisaje móvil: cofre más pequeño, rejilla 4×2 de materiales, metadatos compactos y botón `VER INFORME` dentro del alto visible. Mientras está abierta se mantiene el bloqueo de input de carrera implantado por `RaceSessionRewardsScene.js`.

## Nombre de circuito

El circuito de karting principal se presenta en la UI y en el informe como `CIRCUITO ATLÁNTICO`. La clave/slug interna no cambia para preservar persistencia, récords y compatibilidad.
