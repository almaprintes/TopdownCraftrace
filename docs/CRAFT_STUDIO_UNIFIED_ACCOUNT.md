# CraftRace Studio — identidad compartida con SlotRace
Fecha: 2026-11-07.

## Contrato común de los juegos

Todos los juegos de CraftRace Studio emplean el **mismo** proyecto Supabase Auth.
El identificador de cuenta es `auth.users.id`; nunca se deriva de nombres de usuario
ni de correos escritos manualmente. Cada juego conserva su progreso propio.

- `public.craft_accounts`: pertenencia global y apodo único sin distinguir mayúsculas.
- `public.profiles`: **TDR**, datos previos de piloto y ranking, sin modificación.
- `public.slotrace_profiles`: **SlotRace**, independiente de los datos de TDR.

La base de datos registra automáticamente en `craft_accounts` a los usuarios
permanentes nuevos (y cuando una cuenta anónima pasa a permanente) mediante un
trigger privado de `auth.users`. Las sesiones anónimas **no** se registran como
cuentas permanentes por abrir la app, crear un apodo o competir.

## Google y Apple
- El usuario puede iniciar sesión en cualquiera de los juegos con su identidad
  Google o Apple **ya vinculada al mismo proyecto Supabase**; vuelve a obtener
  el **mismo UUID** incluso si cada app necesita iniciar sesión por separado.
- Google y Apple con correos diferentes —por ejemplo Apple «Ocultar mi correo»—
  **no deben fusionarse por nombre ni por similitud de email**. La operación
  correcta es `auth.linkIdentity` desde una sesión permanente ya verificada.
- En TDR web DEV existen **Google y Apple** con el mismo esquema PKCE,
  nonce de pestaña, callback de un solo uso y verificación del UUID en
  `acceptVerifiedSocialSession`. Al vincular Apple desde una sesión Google,
  el callback rechaza cualquier cambio de usuario.
- Las apps Android e iOS **nativas** todavía necesitan adaptadores de proveedor
  y prueba en un dispositivo real. La pantalla web no habilita por sí misma
  Sign in with Apple nativo.
- El cambio de proveedor nunca puede modificar ni importar una partida o
  sus monedas automáticamente.

## Usuario de prueba existente
El piloto TDR `JUANFRIKAZO_DEV` continúa con sus nicks, records y monedas.
Su **misma identidad** posee el alias Studio `Juanfrikazo-dev`.
No se creó un segundo usuario Supabase y las cuentas anónimas siguen intactas.

## Próximo paso
1. Autorizar la URL `https://almaprintes.github.io/SlotRace/` en Supabase Auth.
2. Confirmar que Google y Apple y, en su caso, manual identity linking están
   configurados para la misma instancia GoTrue. No cambiar ciegamente la
   configuración OAuth de TDR que ya funciona.
3. Comprobar que el usuario se crea automáticamente en `craft_accounts`
   tanto si comienza por TDR como por SlotRace, sin que los anónimos de TDR
   ocupen apodos. La migración es `20261107_037_craftstudio_universal_accounts.sql`.
4. Probar Google y Apple desde la **web DEV de TDR** y SlotRace, y verificar
   que ambos leen exactamente el mismo UUID tras entrar con el proveedor vinculado.
5. Probar Apple con correo oculto, habilitar manual identity linking si es
   necesario, comprobar el UUID y repetir después en dispositivos nativos.
6. Solo después, implementar copia y restauración deliberada de circuitos
   SlotRace, siempre con comparación previa para no perder datos locales.

## Estado de infraestructura verificado

- `auth.users` es la **única fuente de identidades** y los juegos comparten
  el proyecto `juukbnkjboiazqggqcyv`.
- Trigger `auth.users` → `public.craft_accounts` aplicado a cuentas nuevas
  permanentes o invitados convertidos a permanentes.
- La cuenta de TDR con el nombre `JUANFRIKAZO_DEV` figura en la base de
  datos como CraftRace Studio `Juanfrikazo-dev`, con su UUID original.
- TDR conserva sus partidas, nicks y récords en sus propias tablas; SlotRace
  mantiene su colección local hasta añadir la sincronización posterior.
- Falta verificación de Google/Apple en **los proveedores reales** de Supabase
  y sus URLs de redirección (configuración administrativa no disponible con
  el conector de SQL). No marcar los OAuth como listos para producción sin ello.
