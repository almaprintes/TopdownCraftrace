# Top Down RACE — continuidad de sesión y recompensas (17/08/2026)

Este documento complementa `PROJECT_HANDOFF.md` y el README. El código actual de `main` tiene prioridad.

## Flujo de final de sesión

- La escena activa de carrera se carga desde `RacePenaltyReportFixScene.js`, que hereda del flujo de recompensas y presentación final.
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

La penalización antiatajo es de +2.000 s. `RacePenaltyReportFixScene.js` la asocia a la vuelta concreta del histórico y persiste `rawLapMs`, `penaltyMs` y `penalized`. Para el informe y para reconciliar la mejor vuelta se usa el tiempo efectivo `rawLapMs + penaltyMs`. Por tanto una vuelta sancionada no puede figurar como récord usando su tiempo bruto. El informe muestra además `+2.000 s` junto a la vuelta penalizada.

## UI final de recompensas

La ventana final está compactada para paisaje móvil: cofre más pequeño, rejilla 4×2 de materiales, metadatos compactos y botón `VER INFORME` dentro del alto visible. Mientras está abierta se mantiene el bloqueo de input de carrera implantado por `RaceSessionRewardsScene.js`.

## Nombre de circuito

El circuito importado principal tiene clave interna `track01` y nombre público `CIRCUITO ATLÁNTICO`. El `track.json` histórico aún contiene el nombre de importación, pero `trackPublicNames.js` centraliza el nombre público al arrancar el juego para que selector de circuitos, tarjeta del menú, carrera e informe compartan el mismo nombre sin tocar geometría ni cambiar la clave persistente. `karting-tenerife` conserva su nombre `KARTING TENERIFE`.

## Selector de circuitos y previews premium

- La lista centra automáticamente el circuito preseleccionado para facilitar avanzar y retroceder de uno en uno.
- `TrackGarageCleanTypographyScene.js` genera ahora previews premium directamente desde la geometría real de cada circuito.
- Existen dos niveles de render independientes: miniatura (`thumb`) y panel grande (`hero`). No deben volver a compartir una única textura cacheada, porque el sistema anterior podía reutilizar una miniatura de baja resolución en el panel grande y estirarla.
- El render premium tiene prioridad sobre las previews oficiales/legacy dentro del selector; estas quedan como fallback si no puede generarse la preview geométrica.
- Asfalto: fondo de césped con gradiente, sombra/arcén, borde claro, asfalto interior y línea de salida a cuadros. Tierra/grava mantiene tratamiento propio.
- Resoluciones internas actuales: 640×560 para miniaturas y 1280×760 para hero. La UI las reduce al tamaño visible para ganar nitidez en iPhone horizontal sin alterar la geometría del circuito.
