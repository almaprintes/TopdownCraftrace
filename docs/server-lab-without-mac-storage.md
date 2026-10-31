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
