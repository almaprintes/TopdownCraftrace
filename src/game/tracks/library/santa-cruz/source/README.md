# Santa Cruz — fotografía oficial x3 y colisiones

## Activación sin perder el Santa Cruz antiguo

La fuente maestra preparada por el propietario es `Santa-Cruz-x3-nitido.tdrtrack`
(3072 × 4608, WebP y geometría Bézier editables). **Todavía debe subirse
como archivo binario a esta misma carpeta de `main`.**

La CI ejecuta `node scripts/install-santa-cruz-source.mjs` antes del build.
Cuando detecta el paquete, comprueba la imagen/forma, extrae la fotografía,
la divide en seis bloques de 1536 px y genera **en el espacio de compilación**
el registro `santa-cruz/track.json` y el proyecto oficial de colisiones.
Los dos checkpoints se extienden hasta los bordes Bézier sin modificar el
paquete original. Se conserva el ID `santa-cruz` y las físicas de fábrica.

Si el archivo **no está** en esta carpeta, el instalador no realiza ningún cambio:
la pista y sus decoraciones antiguas permanecen operativas. No alterar las
versiones de Android ni publicar en Google Play por este proceso.

## Dibujar colisiones

Tras comprobar Build y Deploy verdes de la SHA que incluye el paquete:

1. Entrar en /dev → Admin Hub → Environment Studio → ABRIR → SANTA CRUZ.
2. Verificar que aparece la fotografía y las curvas coinciden. Los edificios
   impresos en la foto no son objetos físicos; crear colisiones invisibles.
3. PLUMA para bordillos/muros; ZONA SÓLIDA para edificios, manzanas, isletas
   o mar. MOVER MAPA / CONTINUAR permite recorrer el circuito sin perder el trazo.
4. GUARDAR durante el trabajo y EXPORTAR al terminar.
5. Pasar el JSON exportado al asistente para integrarlo en el archivo
   `source/santa-cruz-photo.environment.json`. **No usar el JSON del entorno
   antiguo**: sus coordenadas son incompatibles (1900 × 2900 vs 3072 × 4608).

El instalador coloca siempre la versión de `santa-cruz-photo.environment.json`
en el build, dejando la fuente histórica `../santa-cruz.environment.json`
intacta en Git.

## Criterios de cierre

- Imagen 3072 × 4608 y geometría 1:1 sin asfalto ni pianos duplicados.
- Salida ANTES de meta, sentido correcto, 2 checkpoints de ancho completo.
- Motores y coches usan sus físicas normales (incluido Juanicar y Vortex).
- Environment Studio muestra la MISMA foto, con líneas/zonas guardables y
  exportables; runtime aplica las colisiones a jugador y adversarios.
- Comprobar visualmente en iPhone 12, tiempos de carga, temperatura, consumo
  y continuidad de frames antes de aprobar el circuito definitivo.
- GH Actions Build y Deploy verdes del mismo SHA.
