# Circuito Atlántico — fotografía Track Studio 2026

Este directorio espera **un solo archivo binario**, subido por el propietario:

`trackstudio-image-1792228071935.tdrtrack`

El asistente comprobó el archivo entregado el 17/10/2026:
- Tamaño: 4.037.619 bytes.
- SHA-256: `92863db4589e6d603d7c766f1432e04aef04a772d6a4d6b89604df1c843d4a85`.
- Foto WebP incluida: **4344×3258** (4.008.750 bytes), sha256 `5e55c32f7c8e4ce6b982b6eefcc089c24e096f5b7704af9e9f443b5aacded9f9`.
- Centro de pista: **394 puntos**, bordes Bézier: **14+14 nodos**, ancho 305.
- Una línea de salida (se usa como META de circuito cerrado) y **dos checkpoints**, sin necesidad de redibujar.

## Cómo activarlo

1. Abrir [esta carpeta de GitHub](https://github.com/almaprintes/TopdownCraftrace/tree/main/src/game/tracks/library/track01/source).
2. Pulsar **Add file → Upload files** y subir `trackstudio-image-1792228071935.tdrtrack` sin renombrarlo. Confirmar directamente en `main`.
3. GitHub Actions ejecutará `scripts/install-circuito-atlantico-source.mjs` para publicar el circuito y la fotografía. Se generan seis mosaicos WebP 1448×1629 optimizados para móviles y se actualiza automáticamente la miniatura del selector a partir de esa misma imagen.

**Importante:** hasta recibir exactamente ese archivo, el circuito Atlántico actual y su selector permanecen intactos. No se reemplaza el original `.tdrtrack`, ni se recalculan las formas de los bordes. El instalador rechaza una fuente con SHA diferente. No se generan anuncios, APK ni versión de Google Play.
