# Track Studio — MAP · Taller de escala (DEV 1.3.64)

El botón **MAP** conserva la importación inicial de fotografía. Cuando ya hay un mapa cargado abre un taller de escala.

## Operaciones

- **Sustituir foto:** elige una imagen de igual encuadre. Si conserva la resolución, solo cambia la fotografía. Si cambia la resolución, se transforman los píxeles del lienzo, nodos de la centerline, tiradores Bézier, anchuras globales y por nodo, ambos bordes ajustados, salida, meta, checkpoints y coordenadas de guía, sin recalcular ni aplanar los trazados.
- **Ampliar todo ×2, ×2.5, ×3:** genera una nueva imagen ampliada por interpolación de alta calidad y ajusta las geometrías a la nueva resolución. No se escala el coche ni la cámara ni sus físicas.
- **Factor personalizado:** admite factores entre 1.01 y 4.00; redondea las dimensiones de salida a píxeles enteros y calcula las proporciones exactas de coordenadas.
- **Exportar foto:** descarga la imagen maestra en PNG, JPEG o WebP, conservando su resolución actual.
- **Nuevo mapa:** crea un proyecto vacío como la acción MAP original.

**Límites:** 8192 px máximos por lado, 32 megapíxeles por imagen. Para reemplazos de fotografía, los encuadres y proporciones deben coincidir (tolerancia de aspecto 0,5 %). El editor rechaza proyectos que superen el límite antes de alterar el trabajo actual.

### Seguridad

- Los bytes de la imagen nueva se almacenan en IndexedDB **antes** de transformar el circuito.
- El proyecto anterior se conserva en el historial de deshacer y los bytes del archivo anterior se conservan para volver a él.
- Un fallo en la sustitución recupera la geometría original.
- La fotografía y el mundo se guardan con dimensiones idénticas 1:1.
- **Guardar** exporta un paquete `.tdrtrack` autocontenido; hazlo antes de cambios importantes.
- Las regiones de Environment Studio que estén guardadas en un archivo de entorno separado no se transforman automáticamente; deberán editarse de manera independiente antes de publicar el circuito definitivo.
- La ampliación de una fotografía pequeña por interpolación aumenta su resolución en píxeles, pero **no crea nuevos detalles ópticos**. Para máxima nitidez, utiliza **Sustituir foto** con una fuente realmente más detallada.

### Verificación

`npm run check:trackstudio-image-scale` comprueba coordenadas, tamaños, bordes, Bézier, metas y checkpoints, direcciones de normales, inmutabilidad del original, dimensiones límite, proporciones incompatibles y el acceso a las operaciones desde MAP.
