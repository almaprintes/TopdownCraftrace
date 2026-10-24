# 7 PICOS — subir fuente original de TrackStudio

**Solo falta subir UN archivo binario a esta misma carpeta:**

`7-picos.tdrtrack`

Usa el archivo más reciente de TrackStudio (26 nodos Bézier, 730 puntos de
centerline, una línea de SALIDA y **dos checkpoints**), no la primera versión
sin líneas ni checkpoints. Renómbralo a `7-picos.tdrtrack` al subirlo.

SHA-256 del archivo correcto:
`270261f98c716a4c1b55a4e6184527c4347f140fc40f2d4af0c262f356f794cb`

### Cómo subirlo

1. En GitHub, abre esta carpeta en la rama `main`.
2. Pulsa **Add file → Upload files** (Añadir archivo → Subir archivos).
3. Selecciona el `.tdrtrack` correcto y confirma **Commit changes** en `main`.
4. La siguiente compilación web/DEV ejecutará `install-siete-picos-source.mjs`.

El instalador valida el archivo, extrae la foto PNG incrustada y genera:

- `src/game/tracks/library/siete-picos/track.json` (geometría y gates de juego).
- `public/assets/tracks/siete-picos/7-picos.webp` (foto aérea WebP).
- `public/assets/tracks/siete-picos/7-picos-ios.webp` (versión de menor memoria en iPhone).

La fotografía se cargará en Environment Studio automáticamente desde el
registro del circuito `7 PICOS`. Su proyecto inicial editable se encuentra en
`../siete-picos.environment.json` y está vacío de colisiones y Copas.

**El circuito permanece oculto del selector de carreras** hasta completar
colisiones y revisión; el editor sí podrá abrirlo. No genera APK ni AAB.
Si no se sube el archivo, el instalador no hace cambios en el juego.