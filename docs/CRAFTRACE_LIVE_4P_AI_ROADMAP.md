# CraftRace LIVE — parrilla de 2 a 4 pilotos con IA opcional
**Decisión de producto:** 20 de noviembre de 2026. **Estado:** diseño y primera lógica de parrilla **aislada y probada**; **NO es aún un multijugador de cuatro jugadores operativo**.

## Objetivo acordado
- El organizador configura **2, 3 o 4 plazas**; por defecto se mantiene el formato actual de **2 humanos**.
- Invita hasta tres humanos adicionales con **el mismo código de siete caracteres**. Las personas reales tienen prioridad sobre los bots antes de iniciar la carrera.
- Opcionalmente marca **Completar con IA**: cada plaza libre muestra una IA provisional. Si entra otro humano antes de iniciar, reemplaza una IA provisional. **Las IA solo se confirman al bloquear la parrilla y arrancar.**
- Se puede empezar con **2, 3 o 4 participantes efectivos**, incluyendo **1 humano + IA**, una vez que **todos los humanos estén listos**. Si no se selecciona IA, hace falta al menos otro humano.
- La dificultad de los rivales IA tiene exactamente **tres niveles**: **1 Principiante**, **2 Competitivo**, **3 Experto**. El tercero debe ofrecer resistencia seria a pilotos experimentados, pero **sin teletransportes, velocidades artificialmente infladas, agarre extra ni recompensas manipuladas**. La dificultad se consigue con trazada, anticipación, frenada, consistencia y decisiones de carrera, **calibradas contra tiempos reales**, no mediante cifras inventadas.
- Todo esto es **DEV y carreras amistosas** hasta homologación del servidor. No alterar récords, monedas ni tablas oficiales.

## Estado comprobado antes de ampliar
- El sistema LIVE existente funciona con **anfitrión + un invitado**. La tabla `craftrace_live_rooms` tiene `host_id` y `guest_id`; RPC `join`, `poll` y controles Realtime autorizan a esos dos UUID.
- El puente visual `src/game/online/craftraceLiveRaceBridge.js` mantiene **un único rival remoto**. Envía poses cada **150 ms en movimiento**, intercala poses mediante interpolación y evita simular su física. La ruta Realtime Broadcast está protegida por sala; HTTP RPC es respaldo.
- Existe `src/game/ai/raceAiController.js` que reutiliza el controlador físico de Supervivencia, pero su documentación indica que no se ha homologado para carreras LIVE de cuatro coches. **No afirmar que ya hay tres IA competitivas.**
- Consulta de Supabase del 20/11/2026: **13.603 paquetes históricos** en `craftrace_live_packets`, ocupación total aproximada **6,4 MiB**. No implica saturación, pero obliga a planificar retención/purga segura y a evitar persistir cada posición cuando Broadcast funcione.
- **No hubo migraciones, altas ficticias, cambios de Auth o alteraciones de juegos públicos en esta fase.**

## Fases de implementación sin romper los dos pilotos
1. **Parrilla pura (iniciada):** `src/game/online/craftraceLiveRoster.js` calcula provisionalmente plazas, humanos, IA, nivel y preparación, con validación de 2–4 y sin efectos secundarios. Smoke `scripts/craftrace-live-roster-smoke.mjs`. El flujo en uso **no importa** esta pieza todavía.
2. **Servidor multiusuario (pendiente):** evolución reversible del modelo LIVE con `capacity`, miembros autorizados y orden de incorporación; servidor controla plazas únicas 0–3, invitaciones, listo/no listo y bloqueo atómico al arrancar. Seguridad mediante Auth/RLS y RPC; prohibir ingreso de quinto humano, entradas durante carrera y suplantación de pilotos. Los bots no necesitan cuentas de usuario, y solo el anfitrión puede configurar o arrancar bots. Reingreso de desconectados conserva su misma plaza.
3. **Vestíbulo compartido (pendiente):** interfaz con 2/3/4 plazas, lista de pilotos y estado, interruptor de rellenar con IA, nivel 1/2/3, código único, botón de copiar/compartir. Mantener la UX de dos pilotos actual bajo feature flag hasta que el nuevo servidor esté verificado.
4. **Carrera multipiloto (pendiente):** registrar 1–3 rivales humanos, interpoladores independientes, estados separados, grid y cronómetro único, tabla final con 2–4 resultados. Cada móvil simula **solo su coche humano**; el organizador simula las IA y difunde sus poses a los demás. Nadie genera ni publica resultados de otro humano. Sin colisiones en primera beta; añadirlas exige autoridad y reconciliación específicas.
5. **IA competitiva (pendiente):** aprovechar el planificador de trazada y control físico ya existente, pero integrar 1–3 bots con límite de CPU, cachés por circuito y pruebas reales en Phaser. Nivel 1 predecible y asequible; nivel 2 corre limpio y es exigente; nivel 3 es rápido, constante y capaz de disputar victorias a buenos pilotos mediante las mismas físicas y homologación de coche. Medir tiempos por vuelta, errores, trazada y CPU por nivel en varios circuitos: *ser competitivo es un criterio de aceptación, no una propiedad que podamos declarar ya implementada*.
6. **Rendimiento y redes (pendiente):** instrumentar tráfico, jitter, RTT, FPS, p95 de frame time, memoria, desconexión y carga del anfitrión en iPhone/Android. Comparar 2H, 3H, 4H, 2H+2IA, 1H+3IA, carreras largas y cambios de Wi-Fi/datos. Si el modo 4 provoca degradación, optimizar bots y render antes de activarlo para jugadores.
7. **Publicación (bloqueada):** habilitar la función tras pruebas reproducibles con móviles físicos y backend protegido. Solo DEV por **GitHub Actions/GitHub Pages**; **no Vercel**, no Android Play ni iOS nativo sin autorización posterior.

## Coste de red teórico
- En movimiento, **cada coche publicado** produce hasta `1000/150 ≈ 6,7` poses por segundo según la cadencia actual.
- 2 humanos: cada cliente recibe 1 coche remoto (≈6,7 poses/s).
- 4 humanos: cada cliente recibe 3 coches remotos (≈20 poses/s).
- La CPU de la IA **no se puede estimar por el número de paquetes**: se mide en los dispositivos reales. El anfitrión solo envía poses de IA cuando hay otro humano conectado; sin audiencia remota no hace falta transmitir bots.
- Estas cifras son cálculos a partir de intervalos de código, **no pruebas de capacidad ni mediciones de FPS**. La cuota/tasa real de Supabase depende del plan y las condiciones vigentes.

## Reglas de recuperación y justicia
- Un humano desconectado **no se sustituye por IA durante una carrera**. Pausar/reconectar o abandonar bajo reglas explícitas; no robar una plaza al reconectar.
- Si cae el anfitrión (autoridad de bots), pausar la carrera; no continuar con IA simulada de forma contradictoria por varios móviles.
- Compartir código no autoriza acceso por sí solo sin identidad y comprobación de plazas; la pertenencia al canal Realtime debe verificarse en servidor.
- Los resultados LIVE beta no confieren premios/monedas/récords oficiales hasta prueba del cronometraje/antifraude.

**Referencia:** `docs/DEPLOYMENT_POLICY.md`, `docs/PLATFORM_RELEASE_MATRIX.md`, `docs/CRAFTRACE_LIVE_BROADCAST_MIGRATION.md`.
