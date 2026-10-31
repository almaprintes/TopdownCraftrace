# TDR — Identidades vinculadas: preflight sin cambios de datos (31/10/2026)

Supabase proyecto juukbnkjboiazqggqcyv, consulta agregada en
auth.identities: 1 identidad email y 1 identidad Google asociadas al
**mismo usuario**. No se han copiado correos, UUID ni tokens al repositorio.
Existen 97 cuentas Auth, de las que 96 eran anónimas en la última auditoría.
No hay identidad Apple registrada en esta consulta.

En DEV web, src/game/online/googleWebAuth.js usa PKCE S256 y nonce;
inicia vinculación manual solo con sesión antigua vigente y comprobación de UUID.
Se exige la conservación del identificador antes de aceptar la sesión;
la creación de copia en la nube es explícita. No confundir ese flujo
web con soporte Google/Apple nativo, que NO está validado en iOS/Android.

Se incorporan como pruebas obligatorias al laboratorio de GitHub Actions:
- google-web-auth-smoke.mjs: simulación de PKCE, nonce, replay, sesión,
  rechazo de cuentas cambiadas y conservación del progreso.
- anonymous-auth-identity-smoke.mjs: 8 escenarios sin peticiones externas;
  no crear usuarios anónimos en silencio ni eliminar sesiones permanentes.
- race-control-identity-recovery-smoke.mjs: no atribuir récords de un UUID
  a otro por coincidir el nick, ni borrar registros si falla refresco.

Estas pruebas no realizan login real con Google/Apple ni autorizan
desactivar acceso anónimo. Antes de pasar a producción se necesitan
consentimiento, prueba física Android e iOS, proveedor Apple configurado,
y plan de colisiones de cuentas con exportación, restauración y rollback.

No hay modificación de políticas Supabase, cuentas existentes, Play Store
ni monetización durante suspensión de AdMob.
