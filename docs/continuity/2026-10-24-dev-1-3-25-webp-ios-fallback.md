# DEV 1.3.25 — Arreglo conversor WebP en iPhone

Captura del propietario: `IMG_7161.png`, el conversor de DEV 1.3.24 detecta que iOS Safari no permite exportar `image/webp` mediante Canvas y muestra error en vez de convertir. Además el modal ocupa un contenedor transformado y se recorta su parte superior en pantalla apaisada.

## Corrección
- Mantener Canvas/HTMLImageElement para decodificar y escalar PNG/JPEG; si se genera WebP nativo auténtico usarlo.
- Si toDataURL WebP no está disponible o toBlob vuelve PNG, pasar RGBA por `postMessage` con transferencia a Web Worker. Codificar con libwebp compilada en WASM (`@jsquash/webp@1.5.0`, incluido con dependencia npm y lockfile); validar cabecera RIFF/WEBP antes de presentar resultado. Worker finaliza por conversión para liberar memoria. No se suben fotos a servidores externos. Carga bajo demanda y solo DEV/Admin Hub.
- Se conserva calidad 50–95, alfa, dimensiones y máximo 16MP en móvil, 32MP escritorio; se procesa un archivo cada vez.
- Superposición de herramienta ahora en body con `position:fixed`, fondo opaco y `safe-area-inset` para que el título/acciones no queden cortados por los márgenes escalados del contenedor del juego.
- Revisión `scripts/admin-webp-converter-smoke.mjs`; probar físicamente en iPhone iOS 26. No APK/AAB ni cambios de Android público.

Nota: WebAssembly no es el ejecutable Sharp Node: usa la librería libwebp y produce WebP genuino con parámetros similares, pero el peso puede variar.

### Integración Vite
Se requiere `worker.format='es'` tanto para build como para serve, porque libwebp usa imports de variantes SIMD/fallback. Vite por defecto usa IIFE y arroja `Invalid value iife for worker.format` al dividir los módulos. Sin efecto en las carreras (el worker es lazy ADMIN).
