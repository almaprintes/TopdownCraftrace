# TrackStudio Image Mode — Fase A (DEV 1.2.98)
Fecha: 10/10/2026. Rama de desarrollo: `main`.

## Alcance implementado
- Botón MAP en TrackStudio, abre PNG/JPEG/WebP como nuevo proyecto.
- La imagen es el lienzo nativo en coordenadas de mundo (origen 0,0, 1 px = 1 unidad); cámara, zoom y panorámica preservan la geometría.
- La imagen no se transforma como la guía flotante IMG. Se divide en tiles de editor de 2048 px, para admitir imágenes mayores que el límite usual de una textura móvil.
- Los puntos de centerline, meta y checkpoints siguen las coordenadas originales.
- Imagen binaria persistida en IndexedDB; datos de edición pequeños y recuperación en localStorage.
- Guardar con lienzo de imagen crea paquete portable `.tdrtrack` que incluye imagen original + proyecto editable + exportación geométrica, sin codificar el archivo completo como cadena en localStorage.
- Importar ese paquete desde Abrir -> Importar JSON/.tdrtrack restaura ambos.
- Abrir circuitos antiguos sin imagen mantiene el modo previo.

## Restricciones de la fase A
- Por seguridad de memoria en móviles: imagen máxima 8192 px por lado y 32 megapíxeles; una carga superior se rechaza. Importar imágenes de muchas decenas de megapíxeles es una tarea futura separada.
- TrackStudio muestra una capa de trazado translúcida sobre la foto para ajustar el eje.
- La geometría de ancho por nodo, bordes independientes, conversión en forma y el uso de la foto durante la carrera quedan expresamente para B/C. Guardar la geometría en A NO implica que el runtime pueda utilizar todavía el fondo.
- Los archivos `.tdrtrack` son paquetes binarios propios (cabecera, JSON, bytes de imagen); no ZIP. El navegador requiere descarga explícita para llevarlo a otro dispositivo.
- Si se borra IndexedDB o los datos del navegador, la recuperación local puede perder la foto. Conservar siempre el archivo `.tdrtrack` descargado.

## Prueba manual en iPhone PWA
1. Entrar en TrackStudio -> MAP, elegir fotografía aérea PNG/JPEG/WebP.
2. Comprobar tamaño de mundo y foto completa al centrar la vista; hacer zoom/pan y añadir nodos en curvas conocidas.
3. Guardar `.tdrtrack`; salir de TrackStudio y reabrir el proyecto local.
4. Verificar superposición exacta entre foto y centerline en varios extremos del circuito.
5. Importar el `.tdrtrack` descargado y verificar que funciona también tras cerrar la PWA.
6. Confirmar que el modo original IMG y la importación de circuitos JSON siguen funcionando.
7. No anunciar compatibilidad Android ni publicar en Google Play sin pruebas reales adicionales.

## Fuente única GitHub Pages
La fase A consolida Pages desde `main`, evitando compilar la antigua `beta-1.0`. En la raíz se presenta un acceso informativo a la versión pública Android 1.1.188, con la PWA DEV aislada en /dev. Eliminar físicamente ramas históricas después de verificación del workflow.
