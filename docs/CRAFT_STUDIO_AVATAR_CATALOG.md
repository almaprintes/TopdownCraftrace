# CraftRace Studio — catálogo de avatares compartidos

## Diseño y consumo
Los archivos WebP se alojan una sola vez en GitHub Pages del repositorio almaprintes/TopdownCraftrace, bajo studio/assets/avatars/. El workflow de Pages copia ese directorio a /TopdownCraftrace/studio-assets/avatars/. Supabase solo guarda los metadatos en public.studio_avatar_catalog y el avatar_id escogido en public.craft_accounts.

## Admin Hub
Ruta: TDR DEV → Admin Hub (Paddock) → AVATARES · STUDIO.

- Cargar varias imágenes WebP/PNG/JPG o un ZIP con hasta 100 imágenes.
- Ajustar salida entre 128 y 1024 píxeles, obligatoriamente cuadrada, con control individual de zoom y foco. Se recorta sin deformación.
- Editar etiqueta de cada imagen antes de publicarla; más tarde se puede cambiar nombre, orden y disponibilidad.
- Ver totales registrados, publicados y siguiente identificador público.
- Asignar avatar_0001, avatar_0002, etc. automáticamente y sin reutilizar IDs anteriores, consultando tanto Supabase como GitHub.
- Subir todos los binarios de un lote mediante UN solo commit de GitHub; registrar los metadatos en Supabase después de confirmar el commit.
- Reintentar el registro en Supabase si GitHub se completó pero la escritura de metadatos falló. El reintento no duplica las imágenes.
- Publicar opcionalmente un retrato exclusivo para la cuenta administradora y aplicarlo a su perfil, sin hacerlo seleccionable por otros jugadores.

## Seguridad de publicación
El usuario debe iniciar sesión con una cuenta verificada que tenga app_metadata.tdr_staff=true. Para dar acceso de escritura a GitHub desde un navegador web, el administrador proporciona un token fine-grained de GitHub restringido a este repositorio con Contents: Read and write. No se envía ese token a Supabase, no se incluye en el juego y no se guarda en almacenamiento del navegador. Los permisos RLS de Supabase verifican el rol staff y el trigger del perfil impide a jugadores subir una URL personalizada o seleccionar avatares exclusivos ajenos.

## Estado de publicación
La funcionalidad del editor y los selectores de los juegos está versionada, pero debe probarse todavía el flujo de publicación del primer lote desde un navegador. La tabla empezó vacía; no anunciar los avatares como publicados hasta que existan imágenes verificadas en GitHub Pages y registros activos en Supabase. Los formatos JSON, PostgreSQL y WebP facilitan una futura migración a servidor propio.
