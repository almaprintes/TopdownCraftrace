# DEV 1.3.26 — 7 Picos sustituido íntegramente

25/10/2026 · rama main · solo DEV.

El propietario sustituyó `src/game/tracks/library/siete-picos/source/7-picos.tdrtrack` por
un archivo nuevo de 1.922.462 bytes, SHA-256
`380fb298bd42ae035599894f3ad75a3393421709881e8b3133223a81a26bfc80`.
Este archivo incrusta una fotografía **WebP 4344×3258**, trazado cerrado con
**32 nodos Bézier, 898 puntos**, meta y 2 checkpoints.

El instalador valida exclusivamente la fuente nueva, registra mundo 4344×3258,
anchura original y `imageNative.worldScale` omitido (1:1). Se elimina la
antigua ampliación artificial ×2,5, su helper y el validador especial.
Se extrae la foto original como 7-picos.webp y se generan seis bloques
1448×1629 + versiones iPhone compactas al 65%, sin conservar la vieja
textura iOS de una sola pieza.

El `siete-picos.environment.json` oficial está **vacío**: no transportar
barreras, líneas decorativas ni Copas de la fotografía/tipología anterior.
Se importará un nuevo entorno exclusivamente tras pintarlo en Environment Studio.

El selector de Environment Studio sigue mostrando 7 PICOS en primer lugar;
se puede conducir en DEV para QA, pero permanece fuera de Google Play.
No generar APK/AAB.

La versión anterior puede quedar en el historial de Git o en borradores
locales (acción CARGAR); los archivos activos y assets recién desplegados
solo corresponden al nuevo proyecto.
