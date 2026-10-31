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
