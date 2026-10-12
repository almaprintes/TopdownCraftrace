# Fuente editable — Karting Tenerife

Esta carpeta guarda el **proyecto fuente definitivo de Track Studio** para sustituir el Karting Tenerife antiguo, manteniendo el ID del circuito `karting-tenerife`.

## Archivo que debe subir el propietario

`Karting_Tenerife_final.tdrtrack`

El paquete `.tdrtrack` de Track Studio (modo imagen) incluye el trazado editable y la imagen maestra. **Sube el archivo completo sin descomprimirlo ni convertirlo a JSON.**

## Alcance de la futura integración

- Reemplazar únicamente el circuito oficial `karting-tenerife`, nunca otro circuito.
- Extraer/convertir el trazado oficial a `../track.json` respetando sus coordenadas y líneas de salida/meta y checkpoints.
- Integrar la imagen maestra en los recursos visuales del circuito, sin alterar su proporción ni las físicas generales de los coches.
- Sincronizar el fondo y las dimensiones del mundo en la carrera y en Environment Studio.
- Revisar y retirar o migrar decoración, barreras y capas de belleza antiguas que ya no correspondan con el nuevo mapa.
- Mantener el archivo fuente de Track Studio en esta carpeta para futuras ediciones.
- Comprobar en DEV el trazado, spawn, vueltas, físicas, edición y rendimiento móvil antes de considerarlo integrado.

**ATENCIÓN:** la mera subida del `.tdrtrack` aquí **no activa el circuito nuevo en el juego** ni importa automáticamente sus datos a Environment Studio. Los archivos `../track.json` y `../karting-tenerife.environment.json` siguen siendo los oficiales hasta realizar la integración explícita.

## Rama

Única rama de desarrollo y publicación DEV: `main`. No modificar la versión pública de Google Play ni crear APK para la preparación de esta fuente.
