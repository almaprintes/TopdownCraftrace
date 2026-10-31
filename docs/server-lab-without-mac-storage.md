# TDR · Laboratorio PostgreSQL sin ocupar el iMac

Esta primera etapa corre **en GitHub Actions**, nunca en el Mac.
Con el workflow `tdr-postgres-lab.yml` se inicia un contenedor PostgreSQL 17
temporal y se prueba la función **real** de la migración 033 con fantasmas
inventados. Se destruye al finalizar.

- Sin instalaciones locales, Docker local, Xcode adicional ni discos externos.
- Sin credenciales de Supabase y sin leer o alterar las partidas existentes.
- Sin servidor de juego permanente: es un banco de pruebas bajo demanda.
- Repositorio público: runner estándar de GitHub Actions sujeto a la política
  gratuita para repositorios públicos, no un servicio de alojamiento online.
- Repetir desde GitHub > Actions > TDR PostgreSQL lab > Run workflow.
- Benchmark pequeño de 20 validaciones sintéticas con 650 muestras;
  todavía no mide el rendimiento a 100.000 usuarios.
- Siguiente etapa: medir rutas y checkpoints versionados en un juez
  independiente con datos de prueba antes de integrar producción.

**No comprar Raspberry Pi, SSD ni mini-PC antes de conocer los resultados.**

## Fase 2: juez geométrico en sombra (31/10/2026)

- `src/game/online/serverGeometryJudge.js` lee únicamente geometría **oficial y confiable del servidor**: `src/game/tracks/library/karting-tenerife/track.json`, convierte su ruta con `TrackBuilder`, genera los mismos gates proporcionales y amplía sus extremos usando `raceGateWidth`. Guarda hash SHA-256 de los parámetros oficiales relevantes, calculado en el servidor.
- Comprueba el cruce dirigido CP1 → CP2 → meta con `crossesDirectedFinishGate`, cobertura de la ruta (12 sectores), proximidad al eje y segmentos que recortan curvas; detecta casos a revisar, no declara automáticamente tramposos. Registros corruptos o con circuito distinto se etiquetan `invalid` **solo en este laboratorio**, sin efecto sobre jugadores.
- Pruebas inventadas del trazado real: vuelta por la línea central completa, media vuelta, dirección contraria, salto de tramo, tiempo alterado, circuito incorrecto y fuente de geometría distinta. Los fantasmas se cuantizan como en el juego (`encodeOnlineGhostNative`).
- **NO es una función desplegada de Supabase ni un filtro de rankings reales.** Antes de activarla hay que reproducir muchos fantasmas legítimos con trazado/máscaras de carretera exactas, contemplar las rutas inversas y partes abiertas, medir falsos positivos y definir `pending/verified/rejected` sin eliminar marcas antiguas. El codec de fantasma del cliente puede ser falsificado de forma coherente; para garantía fuerte se necesitan entradas o simulación autoritativa.

## Calibración de pilotos publicados y variante inversa (31/10/2026)

Se realizó un diagnóstico **estrictamente de lectura** de los fantasmas existentes en
`public.track_records` de Supabase. Los valores de las grabaciones se procesaron
en memoria en esta revisión y **NO** se subieron a GitHub, no se guardaron como
fixtures públicos, ni se exportaron perfiles/identidades. La base de datos y los
récords permanecen inalterados.

- Karting Tenerife: 4 grabaciones (3 `karting-tenerife`, 1
  `karting-tenerife-horario`). **Tres de las cuatro quedan lejos de segmentos
  de la línea central actualmente autorizada**, con distancias máximas al eje
  de unos 544–583 px; la cuarta se aparta como máximo unos 75 px.
  La causa NO está demostrada: podrían ser versiones antiguas de geometría
  o grabaciones fuera de recorrido. **No interpretar como trampas.**
- El paquete binario `TDRGHOST` v2 enviado al servidor incluye `tr`,
  `ms`, `car` y `p` pero no una prueba autenticada del hash geométrico.
  Las copias existentes NO permiten demostrar que se disputaron con la edición
  actual: conservarlas y tratarlas como registros históricos no homologables
  automáticamente hasta documentar versiones y conseguir calibración legítima.
- En los 15 fantasmas de distintos circuitos, la mayor velocidad instantánea
  calculada fue 20.485 px/s en un tramo del rally. Como había un intervalo entre
  muestras diminuto, NO debemos inferir teletransporte con esa cifra ni tomar
  un umbral fijo de fotograma como norma de sanción.
- La variante horario ahora invierte secuencia CP2/CP1 y normales de las puertas,
  como `makeTenerifeClockwiseTrack`, y obtiene hash SHA-256 distinto al legado.
  Las pruebas CI confirman sendas vueltas completas y sentidos contrarios.
- Añadido indicador diagnóstico de velocidad promedio por ventana temporal de
  al menos 100 ms, además de velocidad instantánea y gaps cortos. El umbral
  provisional de 2.500 px/s es **solo una señal de revisión en laboratorio**,
  NO un límite demostrado de físicas, NO se conecta a producción y NO puede
  rechazar ni modificar marcas.
- Siguiente: versionar la geometría oficial **desde el servidor**, cotejar
  grabaciones reales contra versiones históricas documentadas, medir latencias
  y memoria de revisión y definir estados sin perder tiempos. Un hash aportado
  solo por el móvil no certifica la geometría y unas posiciones simuladas
  coherentes también podrían ser falsas.
