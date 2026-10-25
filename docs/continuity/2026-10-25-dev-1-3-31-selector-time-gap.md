# DEV 1.3.31 — Diferencia personal vs récord online en selector

25 de octubre de 2026 · rama main · Top Down RACE.

Petición: en la esquina superior derecha del selector de circuitos, justo debajo de los dos tiempos existentes, mostrar la diferencia de tu mejor vuelta respecto al récord absoluto online.

- Nueva tercera fila etiquetada DIFERENCIA (DIFFERENCE en inglés).
- **Fórmula:** `mejor_tiempo_personal_local_ms - mejor_tiempo_publicado_online_ms`. Una diferencia negativa es una ventaja del jugador y se pinta verde; positiva indica que es más lento y aparece roja. Si hay empate, 0.000 s neutros.
- Caso real de la captura: personal 0:27.096 menos público 0:29.388 = **−2.292 s**, verde. Es posible ser más rápido localmente si la mejor vuelta aún no se ha publicado; no se presenta como récord online oficial.
- Si cualquiera de los registros falta o falla la conexión, mostrar — sin adivinar el valor. Durante carga también —. Se limpian resultados previos inmediatamente al seleccionar otra pista o pulsar NORMAL/INVERSO, se protege contra respuestas antiguas con el identificador de circuito.
- La consulta online sigue siendo un snapshot público con caché de 3 minutos. No añadimos fetch, RAF ni registro automático de usuario.
- CSS del mismo cuadro compacto para iPhone horizontal.
- Smoke `npm run check:selector-records` valida signos, precisión de milésima, nulos, empate, y consistencia de UI.

Sin modificaciones a pistas, carreras, colisiones, récords almacenados ni sistema de publicación. No generar APK/AAB.
