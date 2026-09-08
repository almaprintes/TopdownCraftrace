# 2026-09-08 — Supervivencia: periplo de depuración y decisión de retirarla de 1.0

## Contexto

Durante la preparación de Top Down RACE para 1.0 se trabajó intensamente sobre el modo Supervivencia. La intención era corregir varios problemas de colisiones, cronometraje, informe final y comportamiento de la IA sin alterar el resto del juego.

La experiencia de esta sesión dejó una conclusión clara: Supervivencia no debe seguir entrando en la ruta crítica de 1.0. El modo se conserva en código para retomarlo más adelante, pero debe quedar oculto de toda navegación visible para que ningún jugador pueda acceder a él por accidente en la versión 1.0.

Esta decisión no implica borrar el modo ni descartar el trabajo existente. Implica congelarlo y sacarlo del alcance del jugador hasta una actualización posterior.

## Reglas de trabajo reafirmadas

- Trabajar únicamente sobre `main`.
- No modificar `beta-0.0.3` sin autorización explícita.
- Beta 003 puede leerse como referencia de comportamiento estable.
- No mezclar código o assets desde ramas antiguas auxiliares.
- Los cambios deben ser quirúrgicos y de una sola finalidad.
- Si algo funciona, no se toca.
- Antes de cambios de despliegue se revisan `AGENTS.md` y `.github/workflows/pages.yml`.
- `/dev` sale de `main`; la beta pública sigue saliendo de `beta-0.0.3`.

## 1. Colisiones entre coches

El usuario detectó que las colisiones contra vehículos IA eran visualmente falsas e injustas:

- los sprites no llegaban a solaparse ni un píxel antes de reaccionar;
- el jugador se frenaba bruscamente;
- la IA continuaba prácticamente sin penalización.

Se comprobó que la respuesta de contacto estaba sesgada contra el jugador. Se hicieron dos iteraciones:

### DEV LIII

Objetivo:
- permitir aproximadamente 10–15 px de solapamiento visual;
- separar 50/50;
- transferir parte del impacto a la IA.

Resultado real:
- demasiado permisivo;
- el jugador podía atravesar rivales.

### DEV LIV

Objetivo:
- reducir solapamiento a ~5–8 px;
- endurecer la separación;
- conservar el reparto 50/50 y evitar el antiguo frenazo extremo.

Conclusión:
- este frente quedó secundario porque el problema mayor pasó a ser la integridad de Supervivencia.

## 2. Fallo de tiempos al terminar automáticamente

Síntoma inicial:

- si el jugador cerraba/finalizaba manualmente la sesión, las vueltas aparecían en el informe;
- si Supervivencia terminaba sola por victoria o eliminación, el informe mostraba `0 vueltas` y `No hay vueltas cronometradas`.

Se confirmó en al menos:

- Circuito Atlántico;
- Santa Cruz.

Por tanto no era un problema específico de geometría de una pista.

Regla importante que se fijó durante la investigación:

> No tocar meta, checkpoints ni geometría para arreglar este problema.

La carrera sí estaba detectando rondas y determinando ganador/eliminados. El fallo estaba en el flujo de cierre/informe.

## 3. Parches de preservación que empeoraron el estado

Se intentaron varias capas de preservación de tiempos, principalmente alrededor de:

- `src/game/scenes/RaceTrackSessionIntegrityScene.js`;
- `_survivalAuthoritativePlayerTimes()`;
- `ttHistory`;
- `_sessionLapBaseline`;
- `_survivalPlayer._survivalLapTimesMs`;
- `_survivalPlayerLapTimes`.

### DEV LV

Se añadió una copia de respaldo de tiempos autoritarios para intentar evitar que el cierre automático vaciara el informe.

Resultado:
- no solucionó el problema.

### DEV LVI

Se detectó que otra capa posterior reconstruía/pisaba de nuevo las fuentes de datos del informe. Se intentó inyectar los tiempos preservados en las estructuras que esa capa consumía.

Resultado:
- seguía sin resolver de forma fiable el cierre automático.

### DEV LVII

Se añadió más lógica para:

- congelar tiempos antes de `_finishSurvival()`;
- forzar temporalmente `_sessionLapBaseline = 0` durante el informe;
- preservar sectores existentes en la tabla F1.

Resultado observado:

- al perder en ronda 3/5 aparecieron 2 vueltas;
- al ganar en ronda 5/5 aparecieron 4 vueltas;
- la V1 podía aparecer sin sectores;
- la última vuelta también podía quedar incompleta en sectores.

La observación importante fue que el número de vueltas del informe quedaba una detrás de las rondas, pero esto NO significaba que el primer paso por meta debiera contarse como vuelta.

## 4. Aclaración crucial sobre salida y primera vuelta

Se corrigió una interpretación equivocada durante la depuración.

En Supervivencia:

- la parrilla parte antes de haber completado una vuelta;
- el primer paso por meta tras la salida NO es una vuelta completa;
- ese paso debe servir para armar el sistema de vuelta;
- desde ese momento CP1/CP2/CP3 pertenecen a la primera vuelta real;
- el siguiente paso por meta debe cerrar V1.

El usuario recordó además que, históricamente, cuando perdía en la primera vuelta, el informe sí mostraba correctamente los sectores y el tiempo final de esa vuelta.

Por tanto, el concepto de armado inicial era correcto y no debía eliminarse.

## 5. Evidencia de contaminación entre sesiones

La prueba más grave ocurrió al perder en ronda 1/5 y recibir un informe con 5 vueltas completas, incluyendo tiempos y sectores de vueltas que no podían pertenecer a esa carrera.

Esto demostró que los parches de preservación estaban mezclando datos de sesiones anteriores.

Causa identificada:

- `RaceTrackSessionIntegrityScene` capturaba `ttHistory` como respaldo;
- `ttHistory` puede contener historial persistente del circuito o datos reconstruidos de sesiones anteriores;
- esa información fue confundida con vueltas de la sesión actual;
- cerrar incluso la aplicación no garantizaba limpiar la fuente persistente.

Conclusión:

> Un informe de Supervivencia solo puede usar vueltas generadas después de comenzar ESA sesión. Nunca debe rescatar indiscriminadamente `ttHistory` global/persistente.

Esta fue la señal definitiva de que la estrategia de añadir capas sobre capas había empeorado el sistema.

## 6. Beta 003 como referencia estable

El usuario indicó que en `beta-0.0.3` Supervivencia funciona correctamente:

- sectores de la primera vuelta correctos;
- cinco tiempos al completar cinco vueltas;
- cierre de sesión consistente.

Se comparó `beta-0.0.3` con `main` y se comprobó que el desarrollo había acumulado capas adicionales alrededor del modo.

Se usó Beta 003 únicamente como referencia de lectura, sin modificarla.

En DEV LVIII se restauró desde Beta 003 el comportamiento de:

- `src/game/scenes/RaceSurvivalHardLapCapScene.js`;
- `src/game/scenes/RaceF1SessionReportScene.js`;
- carga de la escena de carrera desde `RaceExperienceScene.js`, evitando la capa añadida `RaceTrackSessionIntegrityScene.js` en la ruta activa.

Commits relevantes de esa recuperación:

- `a065eb6eec0f10004aaa4b303f444b48ac8f87fc`
- `b706d4a3a9efb58532914eedeca9214acf883455`
- `d4d536b2bcbd332ae73a9afcd02c94177ab097da`
- marcador LVIII: `1cbe60f6ee4a9d7e108e849874bd72f20f26cc3e`

Principio aprendido:

> Cuando existe una referencia estable que ya resuelve el comportamiento deseado, comparar contra ella antes de inventar una nueva capa de compatibilidad.

## 7. Parrilla e IA: Colossus vs Photon

Después de recuperar la ruta de Beta 003 se detectó otro problema:

- FORGE Colossus, pese a ser un vehículo pesado y poco ágil, tendía a comportarse como una de las IA más rápidas;
- VELOCE Photon, uno de los coches más rápidos del catálogo, aparecía detrás y era eliminado pronto.

Archivo implicado:

`src/game/modes/survival/survivalRoster.js`

Problema detectado:

- la fórmula `survivalCarScore()` daba demasiado peso a atributos secundarios para definir rendimiento de Supervivencia;
- la escalera de habilidad de CPU se asignaba antes de ordenar correctamente los coches por rendimiento;
- esto podía hacer que un coche lento recibiera un target pace alto y uno rápido un target pace bajo.

### DEV LVIX

Se ajustó únicamente el roster/ritmo de Supervivencia:

- mayor peso de velocidad y aceleración;
- ordenar los coches por rendimiento antes de asignar la escalera de IA;
- mantener la parrilla de lento a rápido;
- no tocar física, tiempos, sectores, colisiones ni cierre.

Commit funcional:

`800e83eca9f54ceef8e3f8ba1c16593b51d4b11d`

Marcador LVIX:

`fe2ca82cb84d8c956dada373317cdd4fa60310f3`

## 8. Decisión final para 1.0

El usuario tomó la decisión de producto:

> Supervivencia NO saldrá en la versión 1.0.

Razón:

- seguir dedicando tiempo al modo está retrasando la publicación;
- el modo ha demostrado tener demasiadas interdependencias frágiles;
- la prioridad de 1.0 es publicar una experiencia estable;
- Supervivencia puede volver en una actualización futura cuando haya tiempo para rehacerla/probarla con calma.

### Qué significa exactamente

Para 1.0:

- NO borrar código de Supervivencia;
- NO seguir refactorizando internamente el modo ahora;
- NO mostrar Supervivencia en ningún menú visible;
- NO permitir acceso accidental desde lobby, selector de modo u otros accesos públicos;
- conservar el código y assets necesarios para retomarlo más adelante;
- documentarlo como feature pospuesta, no eliminada.

### Estado de implementación de esta decisión

En el momento de escribir este documento, la decisión está tomada y documentada, pero el trabajo de ocultar todos los accesos visibles a Supervivencia debe verificarse/terminarse como una misión separada y quirúrgica.

No considerar Supervivencia retirada de 1.0 hasta comprobar que:

1. no aparece en el lobby;
2. no aparece en selectores de modo;
3. no existe un botón visible que la lance;
4. ningún flujo normal la selecciona por defecto;
5. los modos que sí salen en 1.0 siguen funcionando igual.

## 9. Lecciones operativas de esta sesión

1. No encadenar parches sobre fuentes de estado globales como `ttHistory` sin demostrar primero el ciclo de vida exacto.
2. Separar claramente historial persistente de circuito y datos de sesión actual.
3. No modificar geometría de pista para corregir informes o persistencia de tiempos.
4. No asumir que `rondas` y `vueltas cronometradas` significan lo mismo en Supervivencia.
5. El primer paso por meta después de la parrilla arma el sistema; no cuenta como vuelta completa.
6. Si una versión estable ya funciona, usarla como referencia antes de reconstruir la lógica.
7. Cada cambio debe tener una sola finalidad y una sola subida DEV.
8. Si una feature secundaria amenaza la fecha de publicación, es válido retirarla temporalmente de la superficie pública y recuperarla en una actualización posterior.

## 10. Estado recomendado al retomar Supervivencia después de 1.0

Cuando se vuelva a trabajar el modo:

- partir de la semántica comprobada de Beta 003;
- crear una fuente de datos estrictamente de sesión para vueltas/sectores;
- no depender de `ttHistory` persistente para reconstruir la carrera actual;
- añadir pruebas explícitas para:
  - perder en ronda 1;
  - perder en ronda 3;
  - ganar en ronda 5;
  - cerrar manualmente;
  - iniciar una nueva carrera sin heredar tiempos;
  - reiniciar la app y comprobar que no se importan vueltas viejas;
- comprobar sectores de V1 y de la última vuelta;
- verificar orden/ritmo de IA con extremos del catálogo (Colossus y Photon);
- revisar colisiones de coches en una misión separada de la lógica de tiempos.

## Estado al cierre de este documento

- Rama de trabajo: `main`.
- Beta estable: `beta-0.0.3`, solo referencia de lectura.
- DEV visible más reciente de este periplo: `DEV 0.0.4 · LVIX`.
- Supervivencia: feature pospuesta para después de 1.0.
- Próxima misión de producto: ocultar completamente Supervivencia de la navegación pública sin borrar ni modificar su lógica interna.
