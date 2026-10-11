# TrackStudio — recuperación de paquete anidado y apertura por contenido · DEV 1.2.105

Fecha: 11/10/2026. Fuente única de desarrollo: `main`.

## Caso real confirmado
Archivo `trackstudio-image-1791679093621.tdrtrack` adjuntado por el usuario: el cuerpo que debería ser PNG empezaba por `TDR-IMAGE-PROJECT-V1`, es decir, un paquete antiguo de 4.214.714 bytes, dentro del paquete nuevo de 4.265.437 bytes. El JSON exterior estaba intacto y preservaba los 30 nodos Bézier y los bordes editables. La imagen PNG original también estaba intacta, en el paquete interior. Los tamaños no coincidían y la importación reportaba de forma equívoca `❌ JSON no válido`.

Se reconstruyó sin tocar geometría el archivo portable `trackstudio-ultimo-proyecto-recuperado.tdrtrack`, con la imagen PNG original y exactamente el JSON exterior.

## Corrección técnica
- `src/game/studio/imageCanvasProject.js`: identificar cabecera por contenido, desempaquetar recursivamente paquetes de imagen anidados (máximo cinco niveles), contrastar tamaño original y validar firma PNG/JPEG/WebP.
- `installImageMode.js`: guardar en IndexedDB siempre los bytes reales de la imagen, reparar imágenes locales anidadas antes de una nueva exportación.
- `TrackStudioScene.js`: reconocer paquetes por cabecera incluso si el nombre termina en `.json`, en vez de guiarse exclusivamente por el nombre; mensajes de error específicos, no un engañoso `JSON no válido`.
- El JSON exterior siempre es la fuente de verdad para los nodos y la pista editada: no se sustituye por el proyecto antiguo que pudiera aparecer dentro de la imagen.
- Mantener compatible la importación de JSON auténtico y los `.tdrtrack` anteriores con imagen directa.

## Pruebas
`scripts/trackstudio-image-mode-smoke.mjs`: roundtrip de imagen válida, fichero con paquete anidado, conservación de geometría exterior, reconocimiento de cabecera, comprobación de tamaños, rechazos explícitos de binarios corruptos. GitHub Pages requiere Build y Deploy SUCCESS del commit exacto de `main`.

La Play Store pública 1.1.188 y los artefactos Android no se alteran.
