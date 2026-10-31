# TDR — Puerta común de aceptación OAuth (31/10/2026)

## Estado real

La integración web existente de Google continúa usando GoTrue PKCE y su
nonce de pestaña. Esta mejora **NO implementa Sign in with Apple** ni
autoriza cambiar la configuración de Supabase o la identidad del jugador.

`acceptVerifiedSocialSession`, en `src/game/online/raceControlOnline.js`,
es el único punto preparado para aceptar la respuesta de un futuro
adaptador Apple/Google nativo. Antes de guardar un token:

- Verifica el usuario mediante `GET /auth/v1/user` usando el access token
  recibido de Supabase (no un perfil ni un hash enviado por el cliente).
- Exige `user.id` coincidente con la sesión y con el antiguo UUID cuando
  estamos vinculando. La sesión local no puede cambiar durante el proceso.
- Exige que la identidad verificada contenga **exactamente** el proveedor
  elegido, `google` o `apple`, y que no esté asociada a otro `user_id`.
- Rechaza mantener el perfil como `is_anonymous`.
- No almacena `provider_token`, `provider_refresh_token` ni datos de
  usuario arbitrarios; guarda los proveedores que confirmó Supabase.
- No restaura ni reemplaza la partida automáticamente. Tras el acceso,
  la recuperación o copia cloud requiere confirmación explícita.

La compatibilidad de `acceptGoogleWebSession` se conserva como función
delegada. El nuevo test sintético `scripts/oauth-provider-session-guard-smoke.mjs`
comprueba las dos opciones sin red, el rechazo de cuentas cruzadas, la
identidad anónima y la conservación de las monedas y el nick.

En CI, `scripts/google-web-auth-smoke.mjs` sigue verificando el Google PKCE
original. **No se ha probado Apple real**, ni está disponible la firma
Apple Developer/entitlements desde este entorno. En iOS será necesario
usar el flujo nativo autorizado por Apple, vincularlo con GoTrue,
verificar la conservación del UUID con datos de prueba y probar la
restauración de una instalación nueva.

AdMob: `android-revenuecat-qa-apk.yml` solo construye la QA de muestra
tras ejecución manual o marca explícita `[apk-qa]`. Los commits normales
siguen sujetos a las pruebas Android de compilación y unidad del workflow
de DEV, pero no activan anuncios reales ni QA repetitivas durante la
suspensión de noviembre.

**Sin cambios en Supabase, datos existentes, rankings ni Google Play.**
