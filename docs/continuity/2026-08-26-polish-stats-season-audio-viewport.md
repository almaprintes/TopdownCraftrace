# Continuidad — 2026-08-26 — Pulido prepublicación, estadísticas, temporada, viewport y audio

Repositorio: `almaprintes/TopdownCraftrace` · rama `main`.

## Contexto general
Sesión centrada en pulido prepublicación multidispositivo (iPhone/Android/navegadores), consistencia visual y de traducciones, estadísticas persistentes, UX del Pase de temporada, previews de circuitos, hápticos de pianos y audio.

## UI adaptable / viewport / orientación
- Se reforzó la adaptación de modales y paneles al espacio real disponible.
- Se corrigieron solapes del lobby con el header flotante en pantallas horizontales bajas.
- Se corrigió el selector de circuitos tras rotación vertical→horizontal esperando al viewport final.
- Se detectó una variante adicional al iniciar directamente en horizontal: Safari puede entregar un `visualViewport` transitorio más pequeño. Se amplió el settle de arranque y se evita aplicar offsets transitorios.
- Commit viewport directo-horizontal: `92d6a01f59eb52ade125ca610dce7f13daaa046d`.

## Lobby
- El panel de circuito sirve como acceso al selector de circuitos.
- La skin/coche central sirve como acceso al garaje.
- Se retiraron los antiguos botones inferiores de Garaje y Circuitos; el espacio se reutilizó para Estadísticas y Fábrica.
- Header y barras migran visualmente al lenguaje de panel flotante.
- El panel de Pase de temporada no debe simular un botón de reclamar: ahora muestra `PREMIO DISPONIBLE / REWARD AVAILABLE` y el panel completo abre el Pase.
- Commit indicador premio disponible: `498e9de31a06374c8393142b475ce8996136cdc7`.

## Internacionalización
Problema raíz detectado: coexistían varias capas de traducción (i18n principal + bridges legacy/DOM/Phaser), lo que podía producir textos distintos entre iPhone y Android.
Se encaminó la UI hacia un traductor canónico único y se fijó vocabulario consistente.
Los nombres propios de circuitos/coches/marcas NO deben traducirse.

## Estadísticas
Se desarrolló una pantalla de Estadísticas con persistencia por coche/circuito:
- distancia total;
- vueltas cronometradas;
- carreras;
- mejor vuelta;
- maestría por coche;
- desglose por coche → circuitos con mejores tiempos, distancia, vueltas y carreras.

Problemas solucionados durante la sesión:
- inicialmente no se persistían tiempos de contrarreloj;
- estadísticas mostraban siempre HÉLIX Spark aunque se seleccionara otro coche;
- nombres de circuito inconsistentes/traducidos;
- vueltas antiguas podían aparecer sin km porque provenían de datos previos a la telemetría de distancia; evitar inferir falsamente distancia 0 como recorrido real.

## Maestría por coche
Sistema conceptual aprobado de 9 niveles basado en kilómetros por coche.
Símbolo definitivo: llanta con evolución de radios/material:
- Bronce: 5 / 8 / 12 radios.
- Plata: 5 / 8 / 12 radios.
- Oro: 5 / 8 / 12 radios.
Fondo negro para integrarse en cualquier techo.
La insignia puede mostrarse en el techo del coche y asociarse a futuros logros/recompensas.

## Pase de temporada
Objetivos de UX:
- distinguir claramente `CONSEGUIDO`, `ETAPA ACTUAL` y etapas futuras;
- aprovechar el máximo tamaño disponible sin desbordar en dispositivos pequeños;
- scroll horizontal con desplazamiento corto y snap por etapa.

Problema diagnosticado del scroll: cada click reconstruía el DOM y el carrusel volvía visualmente a `scrollLeft=0`, por eso el recorrido parecía crecer cuanto más avanzada estaba la etapa.
Corrección: conservar/restaurar posición real antes del rerender y animar solo hasta la etapa siguiente.
Commits relevantes:
- `179dc983bed92ff7a149ad1d8c40cc1d358b7da2` — tamaño/espaciado/snap inicial.
- `545fbc1f7faa058182d172d4062b33ce537766ca` — conservación de scroll y comportamiento del pase.
- `70658b230fe23abfb1378aabcf720be011fed87d` — integración global del controlador.

## Selector y previews de circuitos
No se rehacen los circuitos de carrera ni su renderer.
Se mejoró SOLO la presentación de previews reales generadas desde la geometría del circuito:
- mayor resolución interna;
- mejor antialiasing;
- más contraste y volumen;
- terreno, asfalto/tierra, sombra, línea de meta y viñeta mejorados;
- misma geometría real y misma fuente para miniatura/hero.
Commit: `a04d79b33800b87a59bb0001cd883b90de611af7`.

## Pianos / hápticos
Se comprobó que los pianos ya podían detectarse como superficie mediante la lógica de kerb, aunque físicamente se comportaban como asfalto.
Se añadió una capa sensorial sin alterar agarre/física:
- muestreo de contacto aproximado de ruedas;
- una rueda = pulso ligero;
- dos o más = pulso más marcado;
- intensidad/cadencia ligada a velocidad;
- Android web usa `navigator.vibrate()`;
- preparado para Haptics nativo con Capacitor en el futuro.
Commits:
- `35944437ac99d828e439da135262c9293d6c6d93` — capa de hápticos de piano.
- `cba7acba3477d245afb77edd77430ce85d5587cb` — activación en carrera real.

## Audio
Se detectó fatiga del sonido procedural del motor en sesiones largas.
El motor actual usa WebAudio con tres osciladores + filtro + bus de viento.
Se suavizaron armónicos altos, tracking de tono, mezcla a velocidad sostenida y volumen general sin cambiar identidad.
Commit mezcla antifatiga: `5bf554a4c3eb94d03312fac4eae189be8794cab2`.

Problema posterior: en iPhone los sliders no parecían gobernar correctamente el audio; en Android sí.
Además se detectó que no existía control independiente de música.
Se añadió `audio.music` y slider `MÚSICA / MUSIC`; la música del menú pasa a depender de `master × music`, con mute/pause real a 0.
Commits:
- `7d45733a4ccd70ac2b5a9f1384e7f0ca87e9dcb4` — control de Música en Configuración.
- `aede2de23bdd34fb754576890b7d06670567fee8` — conexión real al reproductor del menú.

## Estado pendiente inmediato
1. Verificar en iPhone el nuevo slider Música 100→0→100 y el control General.
2. Verificar que al arrancar DIRECTAMENTE en horizontal la app ocupa correctamente todo el viewport (`92d6a01...`).
3. Confirmar que el motor vuelve a ser audible en iPhone y que `Motor 0/100` responde.
4. Seguir auditoría de textos ES/EN pantalla por pantalla.
5. Mantener criterio de publicación: no abrir nuevas reconstrucciones grandes de circuitos; priorizar consistencia, estabilidad, rendimiento y UX.

## Regla de continuidad
Antes de cualquier cambio futuro en estas áreas, comprobar el estado real de `main` y leer este archivo junto con `docs/CHATS.md`.
