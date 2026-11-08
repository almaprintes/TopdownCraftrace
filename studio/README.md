# CraftRace Studio · Sitio web público

## Marcas y nombres oficiales

- Nombre del estudio: **CraftRace Studio**.
- Juego 001: **Top Down RACE: CrafRace**.
- Juego 002: **Top Down RACE: SlotRace**.

No usar «Top Down RACE» ni «SlotRace» como título completo del
producto en la landing, menú, títulos SEO, fichas o accesos públicos.
Las URL técnicas existentes no se renombran para no romper enlaces.

## URLs tras el despliegue de GitHub Pages

- Inicio / estudio: https://almaprintes.github.io/TopdownCraftrace/
- Top Down RACE: CrafRace — landing: https://almaprintes.github.io/TopdownCraftrace/top-down-race/
- Top Down RACE: SlotRace — landing: https://almaprintes.github.io/TopdownCraftrace/slotrace/
- CraftRace Studio ID: https://almaprintes.github.io/TopdownCraftrace/cuenta/
- Privacidad y datos: https://almaprintes.github.io/TopdownCraftrace/privacidad/
- Juego Top Down RACE: CrafRace DEV existente: https://almaprintes.github.io/TopdownCraftrace/dev/
- Juego Top Down RACE: SlotRace existente (otro repositorio): https://almaprintes.github.io/SlotRace/

## Límites de responsabilidad / compilación

El sitio de marketing vive en `studio/` (fuera de `public/` de Vite).
No se copia al `dist` de Android/iOS/Phaser. El workflow
`.github/workflows/pages.yml` ensambla el artefacto Pages con `studio/index.html`
como portada, `studio/{cuenta,slotrace,top-down-race,privacidad}/index.html` y
`studio/assets/` como `site/studio-assets/`. El juego DEV se sigue sirviendo
inalterado desde `site/dev/` y `site/dev-live/`. No se toca la raíz de la
compilación de Google Play.

La portada usa imágenes **reales del repositorio** TDR, servidas desde
`/TopdownCraftrace/dev/assets/...`, y arte existente en SlotRace desde
`/SlotRace/assets/...`. No se duplican grandes texturas en la página de inicio.
La ilustración SVG esquemática de SlotRace se marca como conceptual.

## CraftRace Studio ID

El formulario se comunica con el proyecto Supabase Auth compartido.
El UUID auténtico de `auth.users.id` es la identidad universal; la tabla
`public.craft_accounts` se crea en la propia base cuando se registra una
identidad permanente. `craft_accounts.nickname` es un apodo único que puede
ser NULL hasta que el usuario lo elija.

El navegador guarda **una sesión del portal independiente de los juegos**
con la clave `craftstudio-web-auth-v1`. El portal no modifica las cookies,
partidas, monedas, circuitos o copias de TDR ni SlotRace. El usuario puede
necesitar entrar por separado en cada juego, pero si usa un método asociado
a su misma identidad Supabase verá el **mismo UUID**.

Para vincular Google y Apple cuando usan diferentes correos (p. ej., ocultación
de correo Apple), se debe abrir sesión primero y llamar a `auth.linkIdentity`.
El callback verifica UUID y proveedor; nunca se fusiona por apodo o email
supuestamente coincidente.

### Configuración externa pendiente de autenticar con proveedores reales

- Añadir la URL exacta del portal `https://almaprintes.github.io/TopdownCraftrace/cuenta/`
  en Supabase Auth Redirect URLs, preservando las anteriores.
- Mantener `/TopdownCraftrace/dev/` y autorizar `https://almaprintes.github.io/SlotRace/`.
- Google: confirmar configuración OAuth existente.
- Apple: configurar Sign in with Apple web en Apple Developer y Supabase
  (Service ID, Team ID, Key ID, clave privada y callback según documentación).
- En Supabase Auth permitir manual identity linking para cuentas con
  distintos correos, y comprobar el resultado en un dispositivo real.
- Verificar correos de confirmación para signUp (según Auth settings).

**No publicar como «Apple login verificado» sin esta configuración externa.**
El frontend muestra errores comprensibles si el proveedor está deshabilitado.

## Verificación

`node scripts/studio-landing-smoke.mjs` valida HTML/JS/CSS, rutas y guardas
de identidad. Dentro de GitHub Pages se ejecuta
`node scripts/studio-landing-smoke.mjs ../site` después de ensamblar y antes
de publicar. El despliegue conserva intacta la PWA DEV.

Diseño responsive, navegación accesible, imágenes del juego y soporte
`prefers-reduced-motion`.
