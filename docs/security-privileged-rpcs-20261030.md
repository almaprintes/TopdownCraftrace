# TDR · Auditoría de funciones privilegiadas (2026-10-30)

## Criterio
Revisadas en Supabase las 13 RPC de `public` con `SECURITY DEFINER` y `EXECUTE` para `authenticated`. Las advertencias automáticas de Supabase son de **exposición potencial**, no son por sí mismas 13 vulnerabilidades confirmadas.

Todas pertenecen al propietario `postgres` y están configuradas con `search_path=''`. El uso de `SECURITY DEFINER` es necesario actualmente para leer o escribir las tablas de perfiles/récords que no tienen `SELECT` o `INSERT` directo concedido al cliente. Una función así requiere autorización explícita en su propio código.

## Inventario revisado

| RPC | Permisos y operación | Resultado / riesgo |
|---|---|---|
| `claim_my_pilot_nick` | Solo `authenticated`; usa `auth.uid()`, valida 3–16 caracteres, crea o modifica **su propio** nick; trigger `profiles_unique_nick_guard` protege unicidad | Uso intencionado. Las cuentas anónimas con sesión siguen considerándose `authenticated` |
| `get_my_pilot_badge` | Solo `authenticated`; filtra `profiles.user_id=auth.uid()`, coteja alias reservado | Uso intencionado; badge depende del alias, no es una prueba criptográfica de autoría |
| `get_my_pilot_profile` | Solo `authenticated`; filtra por propio UUID | Uso intencionado |
| `get_my_track_personal_best` | Solo `authenticated`; UUID del JWT, un circuito exacto | Uso intencionado; evita cargar cuatro rankings al publicar |
| `get_race_control_nearby_ghosts` | Solo `authenticated`, exige perfil y parámetros dentro de límites; máximo 12 rivales | Uso intencionado; ranking de pilotos públicos, no datos privados de cuenta |
| `get_race_control_snapshot` | Solo `authenticated`; exige UUID, perfil y circuito válido en longitud; cuatro ámbitos | Uso intencionado; consultas de rankings pueden consumir CPU bajo carga |
| `get_track_creator_badges` | Solo `authenticated`; expone como máximo 500 badges públicos de un circuito | Uso intencionado; badges vinculados al alias reservado |
| `get_track_leaderboard` | Solo `authenticated`; filtra alcance geográfico, posiciones y empates | Uso intencionado; respuestas con grandes empates siguen siendo un riesgo de rendimiento |
| `get_track_record_ghost` | Solo `authenticated`; permite descargar fantasma ajeno con `record_ref` válido | **Intencionado para VS Ghost**. El coste de transferencia deberá limitarse mediante cuotas/caché, no rompiendo el modo |
| `post_web_track_comment` | `anon` y `authenticated`; PUBLICA comentarios del sitio | **Exposición anónima intencionada**. Migración 030 añade límites globales y limpieza; sigue requiriendo WAF externo para ataques de alto volumen |
| `submit_track_record` | Solo `authenticated`; actualiza únicamente `auth.uid()` si mejora tiempo | **Riesgo corregido**: antes admitía circuitos inventados. Migración 031 exige edición oficial |
| `submit_track_record_with_ghost` | Solo `authenticated`; igual que arriba, con payload máximo 131072 bytes y hasta 20000 muestras | **Riesgo corregido**: antes admitía circuitos inventados, permitiendo acumular fantasmas arbitrarios |
| `upsert_my_profile` | Solo `authenticated`; actualiza únicamente propio UUID, valida longitudes y códigos | Uso intencionado. País y región declarados por el jugador, no geolocalización certificada |

## Endpoints administrativos/internos no públicos
`enforce_unique_pilot_nick()` y `rls_auto_enable()` están en `public`, pero `anon` y `authenticated` **no tienen EXECUTE**; se usan como funciones de trigger. No se alteraron.

## Hallazgos y verificación de la corrección
- Los 13 endpoints accesibles a `authenticated` fueron inventariados, **solo `post_web_track_comment`** permite `anon` sin sesión.
- Las funciones de lectura/escritura de perfiles y récords usan `auth.uid()` del servidor, no UUID suministrados por cliente.
- Las dos funciones de envío de tiempos aceptaban `p_track_id` libre de 1 a 80 caracteres. Con cuentas desechables esto permitía insertar un número indeterminado de registros/fantasmas, saturando almacenamiento.
- Migración `031`: validador **inmutable** y privado de las 13 ediciones oficiales. No hace SELECT de una tabla, no crea índices, no incrementa las peticiones del juego. Solo se publica en circuitos presentes en el catálogo actual.
- Pruebas de SQL con rol `authenticated` y transacciones revertidas: **ambos publicadores rechazan `inventado-falso`**, y un ID oficial llega a la comprobación de tiempo válida. Sin inserciones.
- Confirmado que los **15 récords** existentes corresponden al catálogo; **15 fantasmas** permanecen almacenados. Comprobado que el ayudante no es ejecutable directamente por `anon` ni `authenticated`.
- Nueva prueba de integración estática `scripts/official-track-publishing-smoke.mjs` en `npm run prebuild`, que exige coincidencia con los 13 circuitos y permisos sin ampliación.

## Importante: cuentas anónimas de Supabase
A la fecha de la auditoría, **96 de 97 cuentas de Auth están marcadas `is_anonymous=true`**. Supabase asigna el rol PostgreSQL `authenticated` a sesiones de Auth anónimas. Por tanto **no** se puede afirmar que un `GRANT ... TO authenticated` garantice una identidad vinculada a Google/Apple. Revisar la transición de invitados antes de impedir su acceso: bloquear estos usuarios sin un plan de migración dañaría el progreso.

## Riesgos que NO se han declarado resueltos
- El tiempo y los datos del fantasma son aportados por el dispositivo; la lista oficial impide circuitos falsos pero no falsificaciones de tiempos. Es imprescindible tratar estos récords como no autoritativos hasta crear un esquema antitrampas verificable.
- Una persona que genere muchas cuentas puede obtener hasta un conjunto de registros por cuenta, aun con catálogo limitado. Hace falta protección en Auth/Edge y límites de uso razonables; no añadir una consulta SQL por cada frame ni por apertura.
- Descarga reiterada de fantasmas y grandes empates pueden incrementar egress y CPU. Medir p95 y volumen antes de elegir caché o cuotas.
- El auditor de Supabase seguirá marcando `authenticated_security_definer_function_executable` para las 13 RPC mientras esta arquitectura requiera acceso privilegiado. **No modificar las ACL solo para silenciar el aviso**.
- El comentario anónimo sigue expuesto al coste de peticiones maliciosas que no alcanzan a publicar; necesita WAF externo si sube el tráfico.

## Regla de circuitos nuevos
Cada alta de circuito y cada nueva versión física (`@g...`) debe actualizar **conjuntamente** juego, instantánea pública del leaderboard, validador privado de SQL y sus pruebas; rechazar la publicación si alguno difiere.

## Continuación priorizada
1. Auditar volumen de `player_progress`, frecuencia de sincronización, descargas y tamaño máximo permitido.
2. Analizar cuotas y coste de fantasma por jugador/circuito con un millón de filas sintéticas **fuera de producción**.
3. Resolver estrategia de identidades anónimas/Google/Apple con migración segura y comprobable.
4. Planear validación antitrampas de tiempos y fantasmas independientes del cliente.

Esta auditoría **no** constituye una prueba de 100.000 usuarios simultáneos; no cambia Google Play ni las partidas guardadas.
