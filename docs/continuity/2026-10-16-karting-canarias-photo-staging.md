# Karting Canarias — nueva fotografía 2048×3072 (DEV 1.2.241, 16/10/2026)

La fotografía estilizada final aportada por el propietario fue recibida como `upscalemedia-transformed (2).png` (2048×3072). Se convirtió a WebP calidad 86 y se partió en una cuadrícula 2×2 de 1024×1536 píxeles. Todo se añade a `public/assets/tracks/karting-canarias/`, conservando el maestro `karting-canarias-new.webp`. `photo-staging.json` registra rutas, dimensiones, hashes SHA256 y posiciones, y evita confundir las imágenes nuevas con el bake `beauty/` actual.

**Imagen incorporada al repositorio, aún NO activada en carrera.** El circuito actual `src/game/tracks/library/karting-canarias/track.json` usa geometría 2000×4300, una centerline y decoraciones del entorno histórico. Activar la nueva foto 2048×3072 sin regenerar límites introduciría carretera/colisiones desalineadas.

Se probó un primer trazado visual sobre el nuevo asfalto: la centerline puede cerrarse sin autointersecciones, pero los bordes físicos interpolados se solapan en horquillas estrechas. **No publicar automáticamente una geometría aproximada.** La fuente visual es una recreación IA inspirada en el circuito real: su topología y proporciones no son necesariamente idénticas a la pista histórica.

Próximo paso antes de activar:
- Autorizar/ajustar visualmente los dos bordes en Track Studio sobre la fotografía nueva, en coordenadas exactas 2048×3072, cerrando una ruta sin autointersecciones y sin atajos.
- Definir salida/meta y checkpoints sin alterar el sentido de conducción, comprobar la carretera y el radio del coche en los puntos estrechos y horquillas.
- Migrar o regenerar las colisiones y decoraciones anteriores (`karting-canarias.environment.json` y `KartingCanariasDividerLayer.js` usan 2000×4300 y no deben heredarse sin transformación).
- Instalar como `image-native` con las cuatro texturas publicadas y verificar las pruebas visuales, rendimiento iPhone/Android, cronómetro, y CI Build + Deploy del HEAD exacto en main.

El proceso de staging no cambia físicas, circuito jugable actual, assets beauty, ni versión Google Play. `scripts/karting-canarias-photo-staging-smoke.mjs` verifica bytes/píxeles de la fotografía y deja claro que las dimensiones del circuito todavía no han cambiado.


## 16/10/2026 — nuevo .tdrtrack del propietario (DEV 1.2.242)

Archivo recibido: `trackstudio-image-1792189935586.tdrtrack`; cabecera estándar `TDR-IMAGE-PROJECT-V1`. SHA-256 original: `b7635ba709e8af0f4634ad5b54374ba064bd620c585cf0499a4223381878d297`.

En `src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json` se han conservado **los bytes JSON originales del paquete**, sin alterar el dibujo. El componente de imagen de ese mismo paquete corresponde byte a byte con `public/assets/tracks/karting-canarias/karting-canarias-new.webp` (SHA-256 `4472ddf772300318555aad8814ff47da70a759879cca68e66a9f0ca72cac72d2`); por tanto el paquete completo puede regenerarse sin almacenar dos veces el WebP. El smoke `scripts/karting-canarias-owner-project-smoke.mjs` reconstruye cabecera + JSON + imagen y verifica el SHA-256 exacto de la exportación original.

Datos del nuevo dibujo: **2048×3072**, `trackWidth=105`, **506 puntos centerline**, **18 nodos Bézier por borde**, modalidad cerrada `raceType=circuit`. Su línea central pasa por la banda física del borrador en todas las muestras verificadas, y coincide visualmente con la carretera de la imagen.

**Incompleto:** `gameTrack.finishLine=null`, `startLine=null`, `checkpoints=[]` y el borde Bézier `leftEdge` presenta autointersecciones en los tramos de control 10 y 13, alrededor de X≈995/Y≈1669. No atribuirle una meta autorada ni sectores inexistentes, y no corregir esos controles a ojo. El archivo está **archivado como fuente de Track Studio, no publicado como pista jugable**. La pista 2000×4300 existente continúa activa y su geometría no cambia.

Siguiente acción del propietario en Track Studio: importar su mismo `.tdrtrack`, situar la **META** y dos **checkpoints CP1/CP2** de acuerdo con el sentido de giro, corregir el pequeño solapamiento del borde interior en la horquilla/zona central y exportar la versión completa. Con ese fichero se reemplaza el borrador, se valida la topología, se instala imagen nativa, y se retiran/aislan las decoraciones y colisiones antiguas de 2000×4300. **No sustituir únicamente `track.json` ni heredar `karting-canarias.environment.json`**.
