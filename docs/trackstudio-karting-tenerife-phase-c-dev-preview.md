# TDR DEV 1.2.106 — Karting Tenerife: prueba de conducción de TrackStudio (fase C)

## Archivo del usuario
- Archivo recibido: `Karting-Tenerife- nuevo.tdrtrack`. Cabecera anidada dos niveles; imagen original PNG verificada y recuperada.
- Imagen máster 1672 × 941 (4.184.055 bytes), 30 nodos centerline, bordes independientes 30 y 31 nodos, meta y dos checkpoints, circuito cerrado, parrilla desactivada.
- El circuito guardado del usuario es la fuente de verdad. Ninguna coordenada de imagen, línea central, meta, checkpoint o contorno se modifica al preparar la prueba.

## Instalación desde el propio editor
1. Abrir la DEV y TrackStudio.
2. Cargar el paquete `.tdrtrack` (o su variante reparada).
3. Pulsar **▶ PROBAR JUEGO** (barra flotante sobre el lienzo). La app valida la forma, imagen y meta; almacena una referencia a la imagen original en IndexedDB y copia pequeña de geometría en localStorage.
4. Se abre la escena `race` con slug reservado `karting-tenerife-studio`. El circuito habitual `karting-tenerife` de la DEV se conserva sin cambios; nunca confundir sus registros/tiempos con los de la prueba.
5. En carrera se carga directamente el PNG desde IndexedDB; sólo cuando se descodifica se retira el suelo procedural. No hay nueva red, GitHub asset, CDN ni SDK.

## Lógica
- La física `TRACK` consulta el XOR de los interiores de los dos bordes Bézier cerrados: banda de asfalto auténtica, incluso cuando un lado tiene 31 nodos y el otro 30.
- Tabla de intersecciones por fila para responder en O(log n) por punto, sin procesamiento de 800+ vértices cada frame.
- Fuera de la banda, pero dentro de la imagen: `GRASS`, transitable con penalización; fuera de la imagen: `OFF`.
- La salida usa el primer punto de la centerline y su rumbo; no genera parrilla. La meta y checkpoints usan las puertas del archivo.
- Coche reducido al 65 % para probar el circuito estrecho.
- La clave separada `karting-tenerife-studio` impide reutilizar accidentalmente la clasificación histórica de Karting Tenerife.

## Limitaciones que hay que probar en iPhone
- Se instala sólo en el dispositivo/navegador donde se importa el proyecto. Para convertirlo en circuito DEV disponible a todos falta alojar la imagen maestra como asset versionado en el repositorio (y aceptar visualmente el resultado).
- Se mantiene el render antiguo si falta/corrompe la imagen local; el programa no debe bloquearse.
- Comprobar rumbo de salida, dirección de carrera, cruces de sectores, apariciones de decoración heredada, superficies y tamaño visual del coche.
- Después de verificar el recorrido jugable, preparar la publicación del asset y la sustitución canónica en una entrega distinta; **NO** tocar Play Store 1.1.188.
- No modificar los datos guardados de TrackStudio ni publicar tiempos de pruebas con el slug histórico.
