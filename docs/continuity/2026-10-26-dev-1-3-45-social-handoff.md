# DEV 1.3.45 — Vinculación Google/Apple · seguridad de datos

Esta iteración prepara la operación que deberá ejecutarse **después de un inicio de sesión real y verificado con Google o Apple**, no inicia OAuth ni altera datos existentes. Los proveedores requieren la configuración oficial de Google Cloud/Apple Developer y Supabase Auth, y el retorno seguro a iOS/Android/PWA.

## Contrato
- Jugador local (incluido JUANFRAN) no crea identidad Supabase. Sigue jugando, cobrando recompensas y conservando monedas/garaje.
- `currentRaceControlAccount()` identifica explícitamente proveedores sociales declarados por GoTrue en `app_metadata.providers` (o `provider`); no considera anónimo a quien carezca de email si `is_anonymous` indica false.
- `protectLocalSaveAfterSocialSignIn({playerConfirmed:true})` valida copia local íntegra, cuenta online Google/Apple y UUID consistente; consulta perfil previo y si hay una copia remota existente **se detiene sin fusionar, sumar monedas, restaurar ni reemplazar**. Perfil con nick distinto también detiene.
- Nunca acepta permisos solo por el nick ni vincula una identidad sin autenticar.
- Con cuenta nueva, reclama el nick mediante RPC transaccional, conserva geografía declarada y crea primera copia online con revision=0, readback completo, UUID e integridad verificados.
- Es una **ruta interna preparada**: ninguna pantalla la invoca todavía. Solo debe exponerse después de habilitar inicio de sesión social auténtico y resolver la decisión de copia existente.
- Backups siguen excluyendo datos de anuncios transitorios y fantasmas locales grandes; récords/fantasmas publicados usan sus tablas por separado.

## Pendiente obligatorio
1. Habilitar proveedores Google y Apple en Supabase; credenciales secretas exclusivamente en panel seguro, nunca en el repo/chat.
2. iOS: Sign in with Apple nativo, Google nativo/deep links según implementación; Apple Developer & capabilities y configuración de callbacks en Supabase.
3. Android: Google Credential Manager/OIDC y Apple si se ofrece; Web: OAuth con PKCE/redirect verificado.
4. Implementar callback/sesión GoTrue verificada y botón real «Proteger mi partida», después solicitar consentimiento y ejecutar el handoff.
5. Probar usuario local→Google/Apple, same/different UUID, reinstalación, copia ya existente, regiones, rollback, rewarded ad offline/online, y seguridad RLS.
6. Incorporar eliminación de cuenta desde la app antes de publicación iOS conforme a requisitos de tienda.

### Prueba
`node scripts/social-account-link-smoke.mjs` (sin peticiones reales). La prueba se añadió al `prebuild`. Solo DEV, no APK/AAB ni publicación de tienda. Integración iOS local en Mac no modificada.
