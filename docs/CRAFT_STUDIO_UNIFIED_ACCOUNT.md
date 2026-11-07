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
- En TDR web DEV existe Google OAuth con PKCE y verificación de UUID, y el
  backend `acceptVerifiedSocialSession` acepta una sesión verificada de Apple.
  **La interfaz nativa de Sign in with Apple aún requiere configuración y prueba**.
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
3. Probar acceso Google desde cada juego y verificar que ambos leen el mismo UUID.
4. Enlazar Apple desde una sesión Google ya autenticada, verificar el UUID y
   repetir en dispositivo físico.
5. Solo después, implementar copia y restauración deliberada de circuitos
   SlotRace, siempre con comparación previa para no perder datos locales.
