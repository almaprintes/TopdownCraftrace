# DEV 1.3.44 — salida segura desde sesión anónima antigua

La DEV 1.3.43 conserva correctamente los jugadores nuevos en modo local, pero pilotos de pruebas cuya identidad Supabase fue eliminada continúan teniendo el token antiguo en el iPhone. La pantalla de Cuenta mostraba solo «Volver a intentar» y «Descargar copia».

**Solución UX:** si, y solo si, Supabase rechaza expresamente el refresh token de un usuario anónimo anterior (error 400/401 refresh_token_not_found/invalid refresh token), Cuenta ofrece «SEGUIR CON MI PARTIDA LOCAL». Requiere confirmación detallada; no es automático. La opción no aparece ante falta de red, errores desconocidos ni sesiones permanentes/email.

**Operación segura:** verifica el UUID esperado, la condición anónima y que no exista sesión válida, conserva únicamente una referencia de UUID anterior sin tokens y elimina solo `tdr2:onlineSession:v1`, nunca la progresión, garage/monedas, tiempos, fotos, recompensas, nick ni fantasmas. No modifica tablas Supabase, no hace signup anónimo, no recupera lo eliminado de la nube.

**Cobertura:** `scripts/anonymous-auth-identity-smoke.mjs` cubre rechazo explícito, no automático, identidad errónea bloqueada, 750 monedas conservadas, sin signup y bloqueo para cuentas permanentes.

**Pendiente:** probar transición con sesión JUANFRAN en iPhone. Sin Google/Apple activados. No APK/AAB ni publicación en tiendas.
