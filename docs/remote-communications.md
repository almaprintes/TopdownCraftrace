# Comunicaciones y actualización de Google Play — TDR DEV 1.4.6

## Qué hace
- **Lobby:** al abrir, lee hasta 30 avisos activos desde Supabase REST con API key pública; muestra un aviso solo una vez por publicación/revisión. El jugador siempre puede cerrarlo y continuar jugando. Se consulta nuevamente como máximo cada 30 minutos con el lobby abierto.
- **Google Play (Android):** la app nativa usa `AppUpdateManager` de Google Play Core para saber si esa instalación concreta puede actualizarse. No se compara con la versión DEV ni se presupone que todo el mundo tiene el mismo rollout. El botón abre Play Store mediante un Intent nativo y no instala nada sin acción del jugador.
- **Admin Hub > COMUNICACIONES (DEV):** crear/editar/publicar/despublicar/borrar; fechas de inicio y fin, prioridad, canal, enlace HTTPS y versión Android. Cada cambio publicado se ve sin distribuir APK/AAB nuevo.
- **Sin Internet:** lobby sigue funcionando, no se enseña alerta falsa; los avisos son datos, nunca HTML ejecutable.
- **Publicación:** publicar un aviso no equivale a publicar una actualización de la app. Los avisos tipo actualización solo deben activarse cuando Google Play ya ofrece la versión.

## Seguridad y acceso
Migración aplicada al proyecto Supabase `juukbnkjboiazqggqcyv`: `tdr_remote_communications_20261030`; tabla `public.tdr_public_notices`.

La tabla tiene RLS activo, lectura pública únicamente de avisos publicados dentro de su ventana, y escritura exclusivamente para JWT de Supabase Auth con `app_metadata.tdr_staff=true` (atributo **gestionado por el servidor**; nunca en `user_metadata`). La UI autentica usando GoTrue sin tocar la sesión del jugador ni guardar contraseña o token de administrador en `localStorage`. No contiene claves de `service_role`.

**Administrador verificado (30/10/2026):** solo la cuenta de TDR `dj1free@gmail.com`, vinculada a Google, tiene `app_metadata.tdr_staff=true`. El editor DEV usa la sesión existente de TDR/Google, renovando el JWT GoTrue; no pide otra contraseña ni altera la partida. Los permisos dependen de RLS, no de un botón oculto.

Los mensajes iniciales **no están publicados** (tabla vacía). Publica el primer mensaje real únicamente después de probar el circuito completo en la DEV y de identificar la cuenta administradora.

## Campos
- `kind=notice`: mensaje de servicio, `target=all|android|web|ios`, título y texto, enlace HTTPS opcional, prioridad, programación y publicación.
- `kind=update`: Android, `version_code` de la release aprobada en Play y enlace de Play Store. La app además consulta Play Core para un rollout efectivo; si Play indica que no hay actualización, no enseña una actualización pendiente a ese jugador.
- `updated_at`: si cambia al editar el mensaje se puede repetir a cada jugador; si no cambia se mantiene la marca «visto» en el dispositivo. Para forzar una repetición edita y actualiza este valor mediante el panel en una revisión posterior, o crea otro aviso.
- No se envían datos de jugador al endpoint de lectura.

## Pruebas y límites
`npm run check:remote-communications` revisa versión instalada, aviso automático, RLS por contrato, fechas, localStorage, URLs seguras, UI del lobby, admin autenticado y puente Android.

Google Play Core puede declarar estado desconocido en instalaciones por APK, en pruebas sin Play o sin acceso a la cuenta de Google; no se inventa disponibilidad. Esta implementación notifica y abre Play, **no instala** la actualización ni usa un diálogo de actualización inmediata. Para iOS, el detector de App Store requerirá su propia integración cuando exista una versión iOS publicada.

Esta primera entrega incluye la lectura nativa y el editor DEV. El primer aviso solo empezará a mostrarse a quienes tengan una versión de TDR que incluya este sistema de comunicaciones.

## Idiomas (DEV 1.4.6)
- Los idiomas **activos** del juego son español (`es`) e inglés (`en`).
- Español se mantiene en `title`, `body`, `action_label` (compatibilidad con instalaciones antiguas). La columna `translations` (JSONB) contiene `en: {title, body, action_label}`.
- El editor permite guardar borradores sin completar traducciones; el cliente **y una restricción CHECK de Postgres** impiden publicar avisos sin título y texto inglés, además del botón traducido cuando exista.
- El lobby lee `tdr2:settings.language` mediante `getLanguage()` y presenta la traducción elegida. Las alertas automáticas de Google Play también se localizan.
- Los clientes anteriores a DEV 1.4.6 siguen usando los campos españoles; para ver inglés desde el feed, necesitan una actualización futura autorizada.
- Migración `tdr_notice_bilingual_es_en_20261030`; fichero de control de versiones `supabase/migrations/20261030_023_tdr_notice_bilingual_es_en.sql`.
- El inicio de sesión real y el POST de borrador desde la interfaz necesitan la prueba manual en el dispositivo del administrador: no se pueden simular sus tokens Google privados.
