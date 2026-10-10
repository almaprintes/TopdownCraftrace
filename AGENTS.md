# REGLAS OBLIGATORIAS DE TRABAJO — TOP DOWN RACE

Estas reglas prevalecen sobre cualquier costumbre anterior del repositorio.

1. NO crear ramas nuevas para trabajo normal.
2. Trabajar SIEMPRE en `main` para el desarrollo actual.
3. La versión pública de Google Play es 1.1.188 (versionCode 8). `beta-1.0` es histórica y obsoleta; no usarla para compilar o publicar.
4. `main` es la única línea de desarrollo actual. No asumir que una rama histórica representa Google Play; comprobar siempre el versionado Android y el estado real de publicación antes de preparar una release.
5. NO mezclar código, assets ni builds desde ramas auxiliares, antiguas, recovery, lab, preview, feat, fix, tmp, backup o similares.
6. NO cambiar el origen de `/dev` fuera de `main`.
7. NO publicar automáticamente en Google Play al hacer cambios en `main`.
8. Una nueva versión de Google Play solo se prepara/publica cuando el propietario lo indique explícitamente y tras las validaciones correspondientes.
9. Antes de cualquier cambio de despliegue, verificar este archivo y `.github/workflows/pages.yml`.
10. Si una tarea parece requerir una rama nueva, detenerse y buscar una solución dentro de `main` salvo autorización explícita del propietario.

Estado de versiones actualizado 2026-10-03:
- `main` contiene actualmente Android `versionCode 8`, `versionName 1.1.188` (fuente de verdad: `android/app/build.gradle`).
- `beta-1.0` y `beta-0.0.3` son históricas y no deben usarse como referencia del estado actual de Google Play.
- El número de versión del `package.json` no sustituye al versionado Android para releases de Google Play.
- Antes de incrementar `versionCode`/`versionName`, confirmar la siguiente release y validar el AAB en el Mac/dispositivo cuando corresponda.

Objetivo operativo: una única línea de desarrollo en `main`, simple y predecible, con releases Android verificadas antes de publicar.

## PROTOCOLO OBLIGATORIO DE ENTREGA DEV — 22/09/2026

11. Tras cualquier cambio que deba publicarse en DEV, NO responder al propietario con estados intermedios del despliegue.
12. Vigilar GitHub Actions de forma autónoma hasta que el workflow correspondiente al HEAD exacto de main termine.
13. Si Build, verificadores o Deploy fallan, diagnosticar el fallo, corregirlo en main y volver a vigilar la nueva ejecución SIN requerir una nueva iteración del propietario, salvo que la corrección implique una decisión de producto o un cambio de alcance.
14. Solo comunicar que una versión está lista cuando el HEAD final tenga Build + Deploy en estado completed/success.
15. Una respuesta del tipo «pendiente», «en cola», «compilando» o «todavía no» no constituye entrega y debe evitarse cuando el propietario haya pedido esperar hasta que esté lista.
16. El objetivo operativo es que el propietario pueda despreocuparse del pipeline: cuando el asistente responda que está lista, debe significar que el despliegue completo ha sido comprobado.

## Fuente única de publicación — 10/10/2026
- Única rama activa de desarrollo y despliegue: `main`.
- GitHub Pages publica la página informativa de Google Play desde main, y `/dev` y `/dev-live` exclusivamente del mismo SHA de main.
- `dev-first-update` y `beta-1.0` dejan de ser fuentes válidas de desarrollo o despliegue. Pueden eliminarse al verificar el despliegue de main.
- La versión Android pública 1.1.188 sigue gestionada por Google Play y no se modifica con commits web.
- Última versión DEV anterior a Image Mode: 1.2.97. Siguiente versión 1.2.98.
- No generar un APK por cambios exclusivos de TrackStudio hasta autorización expresa.

## DEV consolidada — 08/10/2026
- Main integra el progreso de DEV 1.2.75 con las correcciones y la copia en la nube, nueva versión DEV 1.2.76.
- dev-first-update queda como historial de DEV 1.2.75. No desarrollar ni desplegar desde esa rama.
- GitHub Pages y las pruebas Android deben usar el mismo commit exacto de main.
- Google Play sigue en Android 1.1.188/versionCode 8; no publicar otra release sin autorización expresa.
