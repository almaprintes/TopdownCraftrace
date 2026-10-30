# TDR · Plan obligatorio de integridad online y eficiencia a 100.000 pilotos
**Decisión del propietario: 30/10/2026. Estado: APROBADO COMO OBJETIVO, NO IMPLEMENTADO.**

> Prioridad: preparar un sistema antitrampas y una migración progresiva de cuentas provisionales a identidades vinculadas, para que la base de datos competitiva sea utilizada por pilotos recuperables. No bloquear cuentas activas, borrar usuarios, invalidar sus tiempos ni alterar partidas hasta verificar la transición completa.

## P0 — Sistema antitrampas de RACE Control — PENDIENTE

**Problema demostrado:** los `submit_track_record*` de Supabase reciben el tiempo y el fantasma del cliente, y aún no pueden demostrar que procedan de una carrera legítima. La migración 031 impide **circuitos inventados** en ambos publicadores (13 ediciones oficiales), pero no evita tiempos o trayectorias fraudulentos.

- [ ] Definir contrato autoritativo para circuito/edición física, coche, versión de físicas, checkpoints y formato de ghost. El servidor no debe confiar en un hash generado exclusivamente por el cliente.
- [ ] Validaciones baratas en recepción: tipo, límites, intervalo, duración coherente con muestras, orden temporal, puntos finitos, tamaño y coincidencia del circuito. Rechazar payloads imposibles antes de almacenar.
- [ ] Probar validez de trayectoria: salida/meta/checkpoints en orden, geometría oficial, velocidades y aceleraciones físicamente plausibles, teletransportes, vueltas imposibles. Diseñar límites conservadores para no penalizar técnicas legítimas.
- [ ] Separar récords **pendientes / verificados / rechazados**, con política de visibilidad y revisión; estudiar el coste de una validación diferida por evento (no por fotograma ni por apertura).
- [ ] Para partidas competitivas de mayor rigor, considerar simulación autoritativa o reproducción determinista en un servidor. **Ninguna comprobación ejecutada únicamente en el dispositivo ofrece garantía antitrampas.**
- [ ] Prueba de falsificación en entorno aislado con controles positivos y negativos: tiempos artificialmente bajos, ghost inconsistente, geometría antigua, muestras manipuladas, múltiples cuentas. No contaminar clasificaciones reales.
- [ ] Métricas: CPU y ms por validación, tamaño transferido, tasa de falsos positivos y coste a 1k/10k/100k participantes. No crear un bucle permanente de peticiones.

**Criterio de aceptación:** una vuelta alterada en el cliente no se publica como récord verificado sin comprobación independiente; ninguna vuelta legítima desaparece ni se modifica sin un proceso seguro y auditable.

## P0 — Identidad online recuperable (Google / Apple) — PENDIENTE

**Matiz técnico:** `signInAnonymously()` crea una cuenta real con `auth.users.id` y token JWT, y usa el rol PostgreSQL `authenticated`. **No confundir la cuenta anónima con la clave/rol `anon`**. Las políticas que solo comprueban `TO authenticated` no distinguen las cuentas provisionales. Supabase documenta `auth.jwt()->>'is_anonymous'` para distinguirlas.

**Medición el 30/10/2026:** 97 registros de Auth; 96 con `is_anonymous=true` y 1 cuenta permanente; existen 2 copias de progreso, una asociada a cuenta anónima. Estos registros no equivalen necesariamente a jugadores activos únicos.

- [ ] Mantener **partida local sin registro**: se puede jugar sin crear ni ocupar cuentas nuevas en Supabase. No forzar Google/Apple para empezar una partida offline.
- [ ] Requerir **identidad vinculada y recuperable** para **crear nuevas** copias de nube, publicar tiempos o utilizar online competitivo, tras desarrollar y probar la transición. No confiar solo en `role='authenticated'`.
- [ ] Facilitar vinculación Google (web/Android) y Apple (iOS), con PKCE/nonce, verificación de identidad en servidor y **conservación del mismo UUID** mediante identity linking. Actualmente el flujo Google web DEV ya contempla vinculación; comprobar Android/iOS antes de activar restricciones globales.
- [ ] Diseñar flujo para usuarios con cuentas ya distintas: consentimiento explícito, detectar colisiones, conservar datos originales, ofrecer exportación y reversión. Nunca combinar inventarios, nicks o récords automáticamente usando solo un alias.
- [ ] Medir perfiles/cuentas provisionales con progresos y records; permitir período de gracia, comunicaciones claras y opción de rescate. **No desactivar el proveedor anónimo ni aplicar restricciones nuevas a cuentas existentes todavía.**
- [ ] Verificar en entorno separado políticas `RLS` y RPC: usuario anónimo provisional / registrado Google / registrado Apple / `anon` sin sesión. Aplicar `auth.jwt()->>'is_anonymous'='false'` para RPC/RLS solo cuando sea compatible con el flujo; si el JWT cambia, renovar antes de probar.
- [ ] Preparar caso de pérdida de sesión anónima; sin vínculo no se puede demostrar la propiedad de una cuenta ya desvinculada. No prometer recuperación imposible.
- [ ] Evitar crear identidades provisionales silenciosas en cada instalación o visita; el código `cloudAutoSync.js` de web DEV ya se limita a Google y no crea cuentas anónimas.

**Criterio de aceptación:** ninguna partida, coche, moneda, récord ni fantasma existente desaparece al vincular la identidad; las RPC competitivas niegan acceso a cuentas provisionales **después** de la migración, sin afectar el juego local. Vincular identidad no impide que una persona cree varias cuentas permanentes ni sustituye el antitrampas.

## P1 — Presupuesto de bytes y almacenamiento — AUDITADO, OPTIMIZACIÓN PENDIENTE

### Medidas verificadas, 30/10/2026
| Medición | Valor |
|---|---:|
| Copias en `player_progress` | 2 |
| JSON completo medio transmitido (`progress::text`) | **127.267 bytes** |
| JSON almacenado medio (`pg_column_size(progress)`) | **31.406 bytes** |
| Copia máxima observada, JSON | 158.194 bytes |
| Copia máxima observada, almacenada | 38.448 bytes |
| Fantasmas almacenados | 15 |
| Payload binario medio de fantasma | **3.050 bytes** |
| Payload binario máximo observado | 4.996 bytes |
| Máximo cliente de guardado JSON | 470.000 bytes |
| Máximo servidor de guardado JSON | 524.288 bytes |
| Máximo servidor por fantasma | 131.072 bytes |

El JSON de las dos copias suma 254.534 bytes. `tdr2:ttHist:*` aporta 108.858 bytes y `tdr2:raceRecords:v1`, 101.068 bytes: **82,5 % del contenido de JSON medido** entre esos dos apartados. Es un agregado de solo dos perfiles, no una muestra estadísticamente representativa. **No eliminar ninguno:** antes comprobar usos, equivalencia y pruebas de restauración. PostgreSQL ya reduce el almacenamiento físico mediante su representación/compresión; el tamaño enviado por la red es distinto del tamaño guardado.

### Escenarios ilustrativos (no prueba de carga)
- 100.000 copias de **31.406 bytes** almacenados ≈ **3,14 GB de solo contenido**, más tablas, índices, versiones antiguas y sobrecarga.
- Una lectura completa de la copia media por 100.000 jugadores ≈ **12,73 GB de salida JSON**, sin cabeceras ni otros endpoints.
- 100.000 jugadores con **un fantasma por 13 ediciones**, a **3.050 bytes** por fantasma ≈ **3,97 GB binarios**, sin índices ni overhead de red.
- 100.000 copias cercanas al **máximo permitido al cliente**: hasta 47 GB de JSON lógico, sin deducir automáticamente el almacenamiento comprimido.
- Llamar a una subida/día no es lo mismo que tener una cuenta activa: evaluar frecuencia real y distribución de tamaños antes de un cálculo de factura.

### Comportamiento eficiente ya existente
- `cloudAutoSync.js`: **solo web DEV** con Google, deja invitados locales y no crea cuentas anónimas. Compara `SHA-256` local y no llama a Supabase si el progreso no cambió; mínimo de cinco minutos entre escrituras automáticas; omite sincronización durante carrera.
- `cloudProgress.js`: evita subir de nuevo una copia idéntica cuando hay justificante verificado y consulta **solo revisión y fecha**; tras un guardado manual nuevo comprueba el JSON remoto completo por seguridad; los conflictos de revisiones no sobreescriben.
- `save_my_player_progress`: usa `auth.uid()` y compara la revisión previa; un único registro por UUID (índice `player_progress_pkey`). Cuota servidor 512 KiB; cliente 470.000 bytes. Los replays locales grandes no forman parte de la copia.
- `onlineGhostCodec.js`: codificación binaria diferencial y reconstrucción verificada; guardado de récords por jugador y circuito oficial (migración 031).

### Siguientes medidas concretas
- [ ] Medir distribución p50/p90/p99 de copias/ghosts, lecturas, subida, descarga y reintentos en un período definido sin registrar contenido privado ni generar tráfico artificial en producción.
- [ ] Auditar `ttHist:*` y `raceRecords:v1` en su uso real antes de explorar deduplicación, codificación compacta o políticas de retención **reversibles**.
- [ ] Diseñar formatos versionados compatibles y mecanismo de restauración cruzada entre versiones; no tocar el JSON de los dos jugadores actuales.
- [ ] Preservar consulta ligera de estado, caché local por digest y control de concurrencia. No retirar la lectura de verificación simplemente para ahorrar bytes si eso elimina garantías de integridad.
- [ ] Evaluar los límites de payload por circuito/edición y frecuencia con cargas sintéticas aisladas, manteniendo los fantasmas de rally largos y las futuras evoluciones del juego.
- [ ] Estudiar caché CDN para fantasmas **públicos y verificados**, sin exponer la nube privada de progreso; evitar blobs redundantes.
- [ ] No lanzar un multijugador masivo antes de planificar su canal en tiempo real independientemente de estas copias y rankings.

## Normas de calidad innegociables
1. **Nunca sacrificar una partida o un récord válido para optimizar costes**. Antes de migrar: backup, prueba de importación, métricas, rollback y validación real de dispositivos.
2. Medir coste por jugador y por petición multiplicado por 100.000, **no por los usuarios que haya hoy**.
3. Toda función que amplíe datos o autenticación exige pruebas de denegación de permisos y ausencia de datos privados expuestos.
4. **Sin cambios silenciosos en Google Play**; ninguna restricción irreversible de login en la app pública sin aprobación explícita.
5. Documentar tanto la mejora como los límites de la evidencia; no llamar «antitrampas» a una simple comparación local o a un hash del cliente.

Fuentes técnicas: Supabase [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) y [Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking), funciones `save_my_player_progress`, `cloudAutoSync.js`, `cloudProgress.js`, `onlineGhostCodec.js` y consultas de tamaño de la base real.

## Optimización aplicada — 30/10/2026: no reescribir partidas idénticas

- Migración 032: `save_my_player_progress` solo hace `UPDATE` cuando cambian realmente `schema_version` o `progress.data`, manteniendo la comparación de revisiones (CAS). La fecha `createdAt` regenerada ya no provoca una reescritura por sí sola. Si la partida es igual y la revisión coincide, devuelve éxito con la revisión existente; si está obsoleta, responde conflicto como antes. No cambia los formatos 1/2, las tablas ni las partidas guardadas.
- Prueba con una copia real usando rol autenticado en transacción revertida: un `createdAt` diferente preservó `xmin` y revisión, y una revisión antigua fue rechazada. El dato original no se modificó.
- Ahorro: elimina WAL y actualizaciones físicas *cuando llega una subida redundante*. El cliente ya evita la mayoría de las subidas idénticas comparando SHA-256, por lo que no se anuncia un porcentaje artificial de ahorro.
- Prueba automática `scripts/cloud-noop-history-smoke.mjs`: valida la lógica SQL y un prototipo **reversible**, construido con datos inventados, de diccionario de campos por historial; comprueba campos opcionales, Unicode, propiedades futuras, gzip y restauración completa.
- **IMPORTANTE: el prototipo de compactación no se activa.** Un formato 3 enviado a la base de datos impediría a clientes antiguos recuperar su partida; hay que validar lectura v3 en todas las plataformas, compatibilidad de Google Play, restauración y tamaño físico en PostgreSQL antes de habilitarlo. PostgreSQL ya comprime internamente el JSONB, por lo que el ahorro de tamaño de red no garantiza ahorro físico en la base de datos.
