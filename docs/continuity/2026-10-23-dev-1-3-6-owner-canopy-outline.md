# DEV 1.3.6 — Copa de Canarias perfilada por el propietario

Fecha 23/10/2026 · Rama única main · PWA DEV, sin APK/AAB ni cambio en Google Play.

El propietario envió `karting-canarias-4096.environment(1).json` exportado de Environment Studio: esquema v8, tres zonas `photo-canopy`. Una zona nueva de 76 vértices (`canopy-1792752734143-2`, en la recta izquierda superior, imagen 4096 × 6144) está cuidadosamente dibujada. Se validó geometría simple y ausencia de autointersecciones.

Se ha sustituido **solamente** el polígono preliminar `canarias-left-straight-canopy-1` (9 nodos) por los 76 puntos **exactos, sin redondearlos**. Se conserva el ID canónico `canarias-left-straight-canopy-1` para evitar duplicados, y se conservan intactas `canarias-left-straight-canopy-2` (8 puntos) y `canarias-before-finish-canopy` (7 puntos). El environment continúa en **versión 7** por compatibilidad con las pruebas owner-authored (el export del Studio traía 8), sin perder ningún campo `canopyZones`. Conserva las cinco líneas Bézier de colisión, la zona sólida, la foto, la meta y el resto del JSON.

`scripts/environment-canopy-occlusion-smoke.mjs` comprueba ahora que siguen presentes 76/8/7 puntos y el motor de máscaras. La web se identifica como DEV 1.3.6. Las tres máscaras actúan igual en Canarias normal e inverso y reutilizan los mismos tiles fotográficos, con opacidad 0.93.

**Pendiente** validación visual real: pasar bajo la primera copa, comprobar recorte exacto, solapamiento y FPS iPhone/Android. El trazado del propietario está integrado en GitHub, no hace falta volver a importar ese JSON. Se puede continuar con las otras dos copas, exportar el JSON y sustituirlas con la misma precaución, sin tocar colisiones ni rankings.
