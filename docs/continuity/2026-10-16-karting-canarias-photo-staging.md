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
