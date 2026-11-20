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

## Fase 2: backend aislado, monitor de presencia y contrato para 4 plazas (20/11/2026)
**Migración aplicada al Supabase real y verificada el 20/11/2026. La interfaz general de dos jugadores sigue intacta; la versión de cuatro está accesible solo mediante opt-in en DEV y aún no inicia carreras.**

- Migración aditiva: `supabase/migrations/20261120_039_craftrace_live_v2_lobby_2_to_4.sql`; tablas **independientes** `craftrace_live_v2_rooms` y `craftrace_live_v2_members`, sin alterar las tablas ni RPC del modo de dos.
- RPC versionadas de acceso restringido: `create`, `join`, `snapshot`, `configure`, `set_ready`, `heartbeat`, `start`, `leave`. El cliente nuevo solo las llama tras autorización del usuario y **solo se importa dinámicamente si el usuario abre la DEV con el parámetro `?live4=1`; la interfaz normal de dos jugadores no lo carga**.
- El anfitrión ocupa la plaza 0; los invitados entran atómicamente en la **primera plaza libre**, hasta 4. UUID únicos, límites de formato y 6 pistas por anfitrión/hora. Una entrada posterior a la salida se rechaza, excepto el **reingreso de una identidad que ya tenía plaza**.
- Cada piloto humano pulsa Listo. Todos deben figurar listos y haber enviado un latido en los **15 segundos** anteriores a iniciar; el monitor privado se actualiza cada 5 s. La parrilla permanece provisional antes de salir y los bots no ocupan identidades reales.
- Al iniciar, el servidor bloquea la parrilla con hasta 4 entradas y cuenta atrás de 8 segundos. Las posiciones de IA de plazas vacías **solo se materializan en ese momento**. Este bloqueo **no significa que exista ya un motor de carrera 4P integrado**.
- Desconexión previa a salida: un invitado libera su plaza al salir expresamente; durante carrera conserva la plaza para reconectar. El anfitrión puede cerrar su pista. Una conexión perdida sin salida expresa queda identificada por presencia obsoleta, no permite salida y puede reentrar.
- `src/game/online/craftraceLiveV2Roster.js` interpreta **plazas reales de servidor**, no indices inferidos por el orden de la lista: admite huecos de invitados, hasta tres IA, todos los niveles y parrilla cerrada. `src/game/online/craftraceLiveV2LobbyClient.js` prepara las peticiones autenticadas y el monitor sin conexión al cargar el módulo.
- `scripts/craftrace-live-v2-lobby-smoke.mjs` cubre composición, huecos, control de Listo, validación de entrada, contrato SQL, RLS, concesión de RPC y aislamiento de las funciones de dos pilotos; se ejecuta en `prebuild`. **Una prueba estructural JavaScript no sustituye prueba SQL ni de autorización real con usuarios distintos.**
- Hecho en Supabase: ambas tablas creadas y vacías, ocho RPC versionadas, RLS activado en ambas y acceso directo a tablas denegado para `anon`/`authenticated`; las tablas históricas permanecen. **Falta prueba real con 2–4 identidades distintas y verificación de la salida del servidor.**
- Siguiente bloqueo: probar invitaciones, rechazo de quinta persona, host protegido, latidos y reconexión con móviles reales; después integrar los tres rivales y motores de IA. No migrar resultados oficiales, Play, iOS ni Vercel.

## Fase 3: parrilla gráfica opt-in en DEV (20/11/2026)
- `src/game/ui/craftraceLiveV2Lobby.js/.css`: pantalla PADDOCK para 2–4 plazas con ajustes del organizador, compartir/copy de código, unirse con cuenta permanente, lista de humanos e IA provisionales, estados LISTO/SIN CONEXIÓN y abandono con confirmación. Monitor limitado a lecturas periódicas y latidos; se detiene al cerrar.
- La entrada normal al LIVE de dos jugadores **no cambia**. Solo en la ruta DEV y con `?live4=1`, `src/game/ui/craftraceLiveLobby.js` hace un `import()` dinámico de la beta, nunca en el flujo normal ni en el de Google Play. Acceso para QA: https://almaprintes.github.io/TopdownCraftrace/dev/?live4=1 (después entrar en multijugador desde el juego).
- El botón de salida de carrera 4P **no existe todavía**: es intencionado y se informa al jugador. No se incorpora una carrera 4P sin física, resultados y sincronización probados. El servidor puede bloquear una parrilla mediante su RPC, pero el cliente experimental no ejecuta `start`.
- Pruebas automáticas: `scripts/craftrace-live-v2-ui-smoke.mjs` (aislamiento del 2P, entrada DEV, controles, compilación sintáctica, CSS móvil y protección contra iniciar una carrera ficticia).
- **Pendiente:** QA de cuatro cuentas reales en dispositivos distintos; reentrada tras caída, miembros offline, capacidad/IA; multicoche visual, IA competitiva nivel 3, resultados y rendimiento de iPhone/Android. No declarar 4P jugable hasta superar estas etapas.

## Fase 4A: 3 coches remotos y 3 IA físicas aisladas (20/11/2026)
**Estado: componentes y prueba sintética; aún no conectados a la escena LIVE de carreras.**
- `src/game/online/craftraceLiveV2RaceModel.js`: hasta **3 interpoladores independientes** con historial máximo de 18 muestras cada uno, límites por sala/identidad/asiento/secuencia/tick y validación de que el organizador es el único emisor de posiciones de bots. La autoridad de los remitentes de Broadcast, a diferencia de los resultados persistidos en RPC, sigue siendo **solo verificación del cliente**: nunca asignar premios.
- `src/game/online/craftraceLiveV2GridGeometry.js`: parrilla de hasta 4 coches (dos columnas en pistas lo bastante anchas o fila única escalonada en pistas estrechas), sin cambiar la geometría de salida del online clásico.
- `src/game/online/craftraceLiveV2BotDirector.js`: de 1 a 3 cuerpos Arcade, actualizados **solo por el anfitrión**, usando `updateRacePhysicalBot` con las físicas de coche existentes y un único perfil de trazada calculado por circuito. Niveles de elección de ritmo: 70 %, 86 % y 100 % del máximo original. Nivel 3 **no supera potencia, velocidad máxima ni agarre del jugador** y aún debe calibrarse con cronos reales; el nivel puede no equivaler todavía a competitivo profesional.
- `src/game/online/craftraceLiveV2PositionLink.js`: canal privado `craftrace-live4:<uuid>` pensado únicamente para posiciones efímeras a una cadencia acotada. No se conecta hasta completar los permisos Realtime específicos de v2 y la integración en escena.
- `scripts/craftrace-live-v2-race-smoke.mjs`: prueba de protocolo, duplicados, intrusos, bot impersonado, huecos de parrilla, niveles y 80 pasos de física **sintética**. La prueba es útil como regresión, **no demuestra 60 FPS en teléfonos reales**.
- Próximo bloqueo: permisos privados Realtime v2, resultados amistosos persistidos/autorizados, integración completa de cliente + escena y QA físico con hasta cuatro dispositivos. Mantener el botón de salida deshabilitado hasta conectar esos componentes.
