# TrackStudio — Protección de salida (DEV 1.2.99)

Rama: `main`. Cambio exclusivo del editor DEV; no altera la versión pública Android ni crea SDK/APK.

## Comportamiento

- La flecha de regreso solicita confirmación antes de salir a `admin-hub`.
- Cancelar deja el editor y su geometría intactos.
- Confirmar escribe la última recuperación automática y regresa al hub.
- Mientras TrackStudio está abierto, el botón Atrás del navegador también exige confirmación; cancelar reconstruye el estado protegido sin abandonar la PWA.
- La recarga, cierre de pestaña o salida del navegador solicita la advertencia genérica del sistema donde `beforeunload` sea compatible. Algunos navegadores iOS no la muestran; no debe considerarse una garantía.
- El editor elimina sus listeners al cerrar la escena.
- Cargar (carpeta) ofrece ahora `4 · Recuperar último trabajo automático` tras confirmar que se sustituirá el proyecto abierto. La recuperación conserva vínculos a imágenes maestras almacenadas en IndexedDB.
- El archivo `.tdrtrack` sigue siendo el respaldo transportable de un proyecto con imagen; autosave/recuperación local no lo sustituye.

## Pruebas

`node scripts/trackstudio-exit-guard-smoke.mjs` verifica confirmación, cancelación, navegación Atrás, advertencia al recargar, limpieza de listeners y ruta de restauración. La ejecución forma parte del workflow obligatorio de GitHub Pages sobre el HEAD exacto de `main`.
