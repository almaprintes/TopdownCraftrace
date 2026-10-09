# TDR · Jugadores y partidas portátiles (DEV 1.2.78)

## Principio arquitectónico

**Supabase es un proveedor, nunca el formato de nuestra partida.**
La identidad, el progreso y el transporte están separados:

```
Pantallas de TDR (lobby / garaje / estadísticas)
                  │
   src/game/social/cloudAccountUi.js
                  │
   src/game/social/cloudProgress.js    ← reglas, validación, snapshot JSON v2
                  │
   src/game/online/playerProgressRepository.js  ← contrato de almacenamiento
               /            \
 SupabaseProgressRepository    HttpV1ProgressRepository
        │                           │
 Supabase Auth + PostgREST     API HTTPS propia
        │                           │
     PostgreSQL                 PostgreSQL propio
```

La identidad existente procede de `src/game/online/raceControlOnline.js`,
con configuración centralizada en `src/game/online/backendConfig.js`.
La autenticación de hoy usa **GoTrue**, protocolo abierto y desplegable
en un servidor propio. Los pilotos se identifican mediante un **UUID
estable** de Auth, NO por ID de dispositivo, email ni apodo.

El progreso no contiene claves, sesiones, identificadores de anuncios
ni tokens. Los datos de `public.player_progress.progress` son un
objeto JSON portable independiente de SQL y de SDKs.

## Formato portable `format: 2`

```json
{
  "format": 2,
  "createdAt": "2026-10-09T09:00:00.000Z",
  "data": {
    "tdr2:garageFusion:v1": {"coins": 100, "inventory": {}},
    "tdr2:playerStats:v1": {"version": 5, "totalMeters": 1200, "cars": {}},
    "tdr2:pilotProfile:v1": {"version": 1, "id": "pilot-...", "name": "PILOTO"},
    "tdr2:carId": "helix_spark"
  }
}
```

Incluye: garaje, monedas y materiales locales, desbloqueos, vehículos,
kilómetros/estadísticas, vueltas y mejores tiempos locales, progresión
de temporada, nombre de piloto y selección de coche. Los JSON exportados
desde la aplicación contienen **solamente** este objeto (sin credenciales).

NO incluye: secretos, anuncios, credenciales, overrides DEV, ajustes
personales del dispositivo, ni los enormes blobs locales
`tdr2:topReplay:` (replays/ghosts locales). Los récords y ghosts
publicados online se exportan de las tablas correspondientes de PostgreSQL.
No prometer recuperación de esos blobs hasta implantar su almacén dedicado.

El tamaño máximo admitido en el cliente es 470 000 bytes; el servidor
acepta hasta 524 288 bytes por fila. Si es mayor, falla sin crear copias
parciales. **No basta con comprobar que el RPC respondió OK**: el cliente
lee la copia tras escribir y compara todo el JSON normalizado.

El JSON v1 se lee por compatibilidad; nuevas escrituras son v2.
En el futuro, agregar migradores deterministas `v2 → v3` y tests con
copias históricas, sin sobrescribir datos sin validación.

## Transporte intercambiable

Configuración de compilación Vite (identificadores públicos solamente):

- `VITE_TDR_ONLINE_URL`: Auth/Race Control con API GoTrue/PostgREST.
- `VITE_TDR_ONLINE_PUBLIC`: clave pública (NUNCA service_role).
- `VITE_TDR_PROGRESS_PROVIDER=supabase-postgrest` (por defecto) o `http-v1`.
- `VITE_TDR_PROGRESS_API_URL=https://api.mi-servidor.example` para `http-v1`.

Para servidor propio con stack GoTrue/PostgREST, conservar rutas y
configuración y cambiar únicamente URL + clave pública. Para backend
HTTPS completamente propio, `HttpV1ProgressRepository` ya implementa
este contrato:

```http
GET /v1/players/me/progress
Authorization: Bearer <JWT>
200 { "revision": 4, "updatedAt": "2026-10-09T...", "snapshot": { ... } }
404 si no existe

GET /v1/players/me/progress?fields=status
200 { "revision": 4, "updatedAt": "..." }  (no devuelve partida completa)
404 si no existe

PUT /v1/players/me/progress
Authorization: Bearer <JWT>
Content-Type: application/json
{ "expectedRevision": 4, "snapshot": { "format": 2, ... } }
200 { "saved": true, "revision": 5 }
409 { "saved": false, "revision": 5 }
```

Obligaciones del servidor: validar JWT en backend, extraer `sub` del JWT
**nunca aceptar user_id enviado por el cliente**; comparar revisión
y actualizar atómicamente con transacción `UPDATE ... WHERE revision =
expectedRevision`, proteger por usuario, limitar tamaño y comprobar
esquema. Nunca devolver datos de otro piloto. Rechazar peticiones
anónimas no autenticadas y nunca distribuir claves administrativas en
APK/JS.

## Migración al futuro servidor

**Fase 0 (ahora):** mantener UUID estable, RLS por `auth.uid()`,
backup manual y restauración explícita. Pedir a testers que vinculen
correo VERIFICADO con contraseña antes de reinstalar. Los usuarios
anónimos sin vínculo **no pueden recuperar su identidad** tras borrar
los datos de la app.

**Fase 1 (antes del cambio):**
- Crear nueva instancia PostgreSQL y servicio de autenticación
  GoTrue/OIDC, con copias redundantes y TLS. Definir dominio y certificados.
- Versionar migraciones SQL y contract tests de API en Git.
- Hacer respaldo de `public` (progress, profiles, records, ghosts,
  rankings, tablas relacionadas) **Y** `auth.users`/`auth.identities`
  mediante un canal administrativo seguro. Solo un operador autorizado
  puede extraer identidades; jamás exportarlas a un APK ni a artefactos
  públicos.
- Conservar TODOS los UUID originales y revisiones; verificar el conteo,
  tamaños y checksums de las copias antes y después.
- Estudiar dependencias `auth.uid()`, `pgcrypto`, políticas RLS,
  permisos de roles, RPCs, Edge Functions y esquemas auxiliares.
- Preparar un endpoint de prueba y ejecutar una migración en **staging**,
  con registros ficticios y snapshots anonimizados.

**Fase 2 (migración gradual):**
- Elegir una ventana con escrituras bloqueadas brevemente, o sincronización
  incremental/dual-read con una fuente de verdad clara; NO habilitar dos
  almacenes escribibles independientes.
- Copiar esquema, cuentas y datos con `pg_dump`/`pg_restore` o
  scripts de importación versionados. Verificar claves foráneas,
  snapshots, top tiempos y ghosts. Mantener snapshot previo y rollback.
- Si cambia el secreto JWT, las sesiones antiguas pueden necesitar
  reiniciar sesión. Informar con antelación a los usuarios; los usuarios
  con email verificado recuperan acceso. Vincular Google/Apple
  posteriormente usando la misma identidad y provider subject estable.
- Actualizar variables de entorno del build, NO migrar la lógica del
  garaje. Desplegar primero DEV, probar reinstalación con una cuenta
  recuperable y datos ficticios. Nunca auto-publicar Play Store.

**Fase 3 (después):**
- Solo apagar Supabase cuando RLS/autorización, ingresos, récords,
  copias e identidades estén reconciliados y haya plan de rollback.
- Retener backups cifrados fuera de línea según política de privacidad.
- El servidor propio debe acabar siendo autoridad para economía sensible
  y recompensas publicitarias verificadas, no confiar en monedas
  autodeclaradas por el cliente.

## Prueba destructiva segura de reinstalación

1. En **TDR QA ADS**, crear una partida de prueba claramente identificable
   (monedas, coche, recorrido, nombre).
2. Abrir ID ☁ → crear copia → comprobar **COPIA VERIFICADA** y revisión.
3. Vincular correo → confirmar → establecer contraseña. **Anotar ID
   completo y email** (jamás enviar contraseña por chat).
4. Comprobar que la copia aparece en el servidor para ese UUID.
5. Primero validar inicio de sesión y restauración en **otra instalación
   aislada** o dispositivo. Comprobar monedas, desbloqueos, kilómetros,
   nombre, ID y revisión.
6. Solo entonces desinstalar **la QA**, nunca la pública, y repetir. Si
   una etapa falla, detenerse. No borrar una única copia local.

## Límites actuales (no ocultar)

- La vinculación email/contraseña requiere que los emails de Supabase
  lleguen y la plantilla incluya un código válido o un enlace de
  verificación que se pueda completar en el dispositivo. Hay que
  probarlo de extremo a extremo con una cuenta QA, no darlo por hecho.
- El port de identidad usa GoTrue; sustituirlo por un proveedor Auth
  distinto requiere implementar/compatibilizar este **adaptador**,
  migrar los usuarios y gestionar el inicio de sesión. No es
  simplemente apuntar a otro PostgreSQL.
- Los replays locales grandes aún no se respaldan.
- Las partidas locales no son actualmente una economía antifraude:
  avanzar a sincronización automática y monedas autoritativas requiere
  backend seguro y SSV validada.
