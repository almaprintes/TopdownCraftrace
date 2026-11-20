# CraftRace · Política vigente de despliegues y recuperación
**Fecha de decisión:** 20 de noviembre de 2026. **Estado:** Vercel desconectado del repositorio por el propietario y verificado mediante la integración de Vercel. Esta política tiene prioridad sobre notas históricas que recomienden Vercel.

## Canal oficial: una sola fuente
- **Repositorio:** `almaprintes/TopdownCraftrace`, rama `main`.
- **Único despliegue automático autorizado para DEV web:** workflow `.github/workflows/pages.yml` (**Deploy Top Down Race**) de **GitHub Actions**, con destino **GitHub Pages**.
- **URL DEV canónica:** https://almaprintes.github.io/TopdownCraftrace/dev/
- **Verificación obligatoria:** workflow completado correctamente y fichero `/TopdownCraftrace/dev/dev-build.txt` con `DEV_SOURCE_SHA` igual al commit esperado. Un push o build verde, por sí solo, **no demuestra que la DEV publicada se haya actualizado**.
- No confundir DEV web con Android Google Play, APK QA ni iOS nativo/Xcode: requieren procedimientos y autorizaciones independientes. No generar ni publicar releases nativas por una tarea de documentación o de PWA.

## Por qué se usó Vercel y por qué se desconectó
El **propietario relata** que una incidencia reconocida de GitHub Actions impidió los despliegues normales y se recurrió **puntualmente a Vercel como solución de emergencia**. Tras volver a utilizar GitHub Pages, la conexión Git de Vercel quedó activa y continuó compilando la misma rama con cada commit. Eso produjo miles de notificaciones de builds fallidos y alertas de cuota de almacenamiento (10 GB en la cuenta Hobby), además del despliegue duplicado.

**Hecho comprobado el 20/11/2026:** el propietario desconectó `almaprintes/TopdownCraftrace` desde **Vercel → topdown-craftrace → Settings → Git → Disconnect**; Vercel confirmó `Git repository disconnected` y una lectura posterior de `get_git_deployment_context` devolvió `linkedProjects: []` en el equipo `almaprint`. El proyecto de Vercel, sus dominios `vercel.app`, la configuración y su último despliegue se conservaron. GitHub Actions/Pages seguía en `completed/success` para la versión revisada. **No fue una eliminación de la cuenta ni del proyecto de Vercel.**

## Reglas obligatorias para cualquier desarrollador, agente o CI
1. **No desplegar en Vercel por defecto.** Prohibido utilizar Vercel como atajo para un error de GitHub Actions sin aprobación nueva y explícita del propietario. No conectar de nuevo su integración Git ni crear un proyecto Vercel vinculado; no usar CLI `vercel`, API `create_deployment`, Deploy Hooks, integraciones de GitHub ni acciones de CI para ese destino.
2. **Si Pages falla, arreglar el origen.** Revisar error concreto de GitHub Actions, logs, permisos, cuota, artefactos y estado del servicio; no inferir que Vercel es la solución. Evitar reintentos a ciegas o cambios de hosting que generen otra cascada de errores.
3. **Verificar la DEV real.** Revisar commit, build y `DEV_SOURCE_SHA` servido por Pages antes de decir «publicado». Conservar el canal de publicación oficial.
4. **Separar integración de cuenta y proyecto.** No borrar la cuenta de Vercel ni el proyecto archivado, no tocar dominios, variables ni `vercel.json` para intentar evitar despliegues. El archivo `vercel.json` es configuración histórica de cabeceras: **su mera presencia no activa un despliegue**; lo que causaba la automatización era la integración Git ya desconectada.
5. **Proteger las identidades y datos.** No cambiar dominios/OAuth de Google o Apple ni URL de Supabase, registro de usuarios, rankings, replays o almacenamientos locales por un problema de despliegue.
6. **Las notas antiguas no autorizan Vercel.** Si README, PROJECT_HANDOFF o changelogs históricos hablan de builds o verificaciones en Vercel, describen estados pasados. Prevalece esta política y la matriz vigente.

## Única excepción: contingencia expresamente autorizada
Si GitHub Actions vuelve a sufrir una caída real:
1. Investigar y documentar el fallo, confirmar el bloqueo de GitHub Pages y consultar al propietario si desea habilitar un alojamiento de emergencia.
2. **Esperar su autorización explícita** para ese incidente, definiendo objetivo, código exacto, dominio temporal, duración y forma de volver al canal principal.
3. Preferir un **despliegue manual y temporal sin integración Git permanente**, cuando técnicamente sea posible. Si se autoriza una conexión Git temporal, registrar que debe desconectarse tras el incidente; nunca dejarla habilitada al finalizar.
4. Tras restaurar GitHub Pages, verificar el SHA publicado, retirar el mecanismo alternativo autorizado y comprobar de nuevo que `linkedProjects: []` en Vercel y que no hay deploy hooks/CI reactivados.
5. No prometer que los antiguos dominios `vercel.app` se actualicen después de la desconexión. Conservan su contenido anterior sujeto a las políticas de Vercel.

## Comprobación operativa sin modificar nada
- GitHub: workflow `Deploy Top Down Race` y `https://almaprintes.github.io/TopdownCraftrace/dev/dev-build.txt`.
- Vercel: equipo `almaprint`, proyecto `topdown-craftrace`; en **Settings → Git**, el repositorio debe constar **desconectado**. La lectura de integración Git debe indicar **sin proyectos vinculados**.
- Ante un nuevo correo `Production deployment failed` **posterior a la desconexión**, comprobar el origen del nuevo intento: proyecto reconectado, CLI, hook u otro servicio. **No** restablecer Git automáticamente ni cambiar Pages.

**Fuentes de control interno:** `AGENTS.md`, `docs/PLATFORM_RELEASE_MATRIX.md`, `.github/workflows/pages.yml` y esta política.
