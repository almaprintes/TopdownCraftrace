# TDR · Matriz de plataformas, versiones y rutas de publicación
**Norma operativa vigente: 1 de noviembre de 2026.** Se aplica a los cambios posteriores y prevalece sobre las instrucciones *históricas* que citan ramas `develop`, `beta-0.0.3` o dicen que todos los cambios de interfaz son «solo iPhone».

## Regla del propietario
1. **Rendimiento del iPhone: SOLO iOS.** Cualquier cambio de WebKit, frame pacing, WebGL, resolución, GPU, memory pressure, profiler, optimización de mosaicos o control térmico para resolver los tirones de iPhone debe ejecutarse únicamente en iOS/iPhone. No modificar el comportamiento Android que ya funciona bien. Un módulo del repositorio compartido puede contener código exclusivo iOS, pero debe quedar protegido por detección de plataforma + pruebas en ambos sistemas.
2. **Menús, cabeceras, botones, modales, tipografía, disposición, responsive, áreas seguras y ayuda: COMPARTIDOS Android + iOS.** Crear un solo comportamiento funcional y estilo base donde la misma pantalla exista en ambas. Corregirlo y validar en las dos plataformas. Solo utilizar diferencias CSS de plataforma para corregir restricciones reales (isla dinámica/safe area/teclado), nunca duplicar flujos sin necesidad.
3. **Núcleo compartido:** circuitos, coches, física homologada, cronometraje, checkpoints, progreso, monetización a nivel de negocio, perfiles, Supabase y reglas online. Nunca mantener simulaciones distintas para Android e iOS por resolver un problema gráfico; los cambios al núcleo requieren pruebas de regresión en ambos.
4. **Funciones realmente exclusivas:** se permiten Android-only (Gradle/SDK, AdMob, puente nativo Android) e iOS-only (Xcode, Capacitor iOS, permisos Apple/WebKit), con aislamiento explícito y pruebas de no regresión de la otra plataforma.
5. **Desarrollo común no significa publicación simultánea.** Los cambios compartidos entran en el código fuente común y llegan a Android e iOS en sus próximas compilaciones *independientes*. No actualizar Play, TestFlight o app Xcode por el mero hecho de actualizar la PWA. Lanzamientos requieren QA y autorización del propietario.

## Tres versiones independientes + un identificador de código

| Canal | Qué se lee | Fuente de verdad | Cómo llega al usuario |
| --- | --- | --- | --- |
| **DEV PWA** (Safari iPhone, navegador Android y ordenador) | `DEV 1.4.x` y commit `DEV_SOURCE_SHA` | **Build en GitHub Pages**: `/dev/index.html` (meta `tdr-dev-version`) y `/dev/dev-build.txt` | GitHub Actions Pages, desde el SHA exacto de `main`; no es IPA ni APK |
| **Android público** | `versionName` + `versionCode` | `android/app/build.gradle` → flavor `production`, comprobar **Play Console** para la versión realmente publicada | AAB **firmado con clave de subida original**, validado, aprobado y subido a Google Play |
| **Android QA** | Variante y código `bridgeTest`/`deviceTest`, además de SHA | Gradle + workflow específico + artefacto firmado | APK aislada, paquete distinto de Play; NO sustituye la pública |
| **iOS nativo** (app de Xcode, distinta de Safari) | `CFBundleShortVersionString` (versión) y `CFBundleVersion` (compilación) + SHA del código integrado | **Proyecto local de Xcode**, su target App / General / Identity y build settings | Compilar/sincronizar Capacitor iOS desde la copia del Mac e instalar en el dispositivo; distribución App Store aparte |

**IMPORTANTE:** La app iOS **no está en el árbol principal del repositorio GitHub** (a 01/11/2026 no existe `ios/` en `main`). La copia Xcode del propietario partió del commit `9181e72c` (DEV 1.3.35), pero puede contener cambios locales posteriores. Ni ese commit ni la versión web permiten deducir el `CFBundleShortVersionString` instalado hoy. Comprobarlo físicamente en Xcode; no inventarlo.

### Qué se ha verificado, sin confundir fuente, candidato y publicación
- DEV Pages: flujo de numeración automática `scripts/stamp-dev-version.mjs`, ancla workflow run **5675 = DEV 1.4.9**; run **5677 = DEV 1.4.11** publicado y validado. El siguiente número dependerá del run real, y puede saltarse números cuando una ejecución falla. En `index.html` del repositorio permanece una versión de respaldo; **no** representa la última publicada si CI la ha estampado.
- Android Gradle flavor `production`: candidato **1.3.64 / versionCode 11** (no equivale a publicado). Historial de publicación confirmada **1.2.335 / versionCode 10**, que debe reconfirmarse en Play Console antes de una nueva subida.
- Android `defaultConfig` de Gradle mantiene un `versionName` distinto, **1.1.188/vc8**; NO usarlo para identificar producción sin leer el flavor `production`. `package.json` `version:1.0.4` tampoco identifica Android ni iOS.
- iOS nativo: versión y build reales **pendientes de comprobación en el Mac**. La base original no es prueba del estado actual.

## Enrutamiento de tareas: decisión previa obligatoria
Etiquetar antes de cambiar código cada tarea como:
- `[AMBAS · UI]`: un único cambio común de menús/estilo/UX (ej.: ayuda, tienda, ajustes, botón de soporte, tamaño de botones). Revisar iPhone horizontal, Android horizontal, accesibilidad, scroll, áreas seguras; Android nativo e iOS nativo reciben el cambio **solo cuando se recompilan**.
- `[iOS · RENDIMIENTO]`: resolver tirones, calentamiento y WebKit del iPhone. Aislar en funciones/módulos de iOS y condicionar claramente en runtime. Guardar baseline Android y probar que no cambia su ruta. Hacer A/B reversible si el resultado aún no está medido.
- `[ANDROID · NATIVO]`: SDK, bridge Android, manifest, permisos, anuncios nativos, Gradle. No editar Xcode ni optimizaciones iOS.
- `[AMBAS · NÚCLEO]`: física, carreras, economía, circuitos, cuentas/Supabase. Requiere validación funcional en ambas y compatibilidad de datos.
- `[ADMIN · DEV]`: herramientas Paddock de administrador, Track Studio, Environment Studio, botones rojos de control del servidor. Las correcciones de UI de estos controles deben verse igual en entornos de pruebas Android e iOS **si se incorpora el Admin Hub a esa build**, pero **el Admin Hub está excluido de la compilación pública de Android**. No introducir interruptores de administración en las apps públicas solo por marcar la interfaz como «ambas».

Al iniciar cada tarea, describir el objetivo y el **ámbito exacto**. Al terminar, reportar cuatro aspectos: archivo/código cambiado, pruebas realizadas, plataformas a las que está destinado y versiones/artefactos **realmente desplegados**. No etiquetar como «ya está en Android/iOS» un commit de GitHub Pages.

## Cómo sincronizar cambios comunes sin perder el trabajo local iOS
1. Primero verificar SHA y estado de `main` en GitHub. Mantener las optimizaciones iOS encapsuladas; ejecutar pruebas automáticas de Android cuando se toca el núcleo o UI compartido.
2. Mac: **proteger el trabajo local Xcode/iOS antes de sincronizar** (copia de seguridad/commit y comprobar `git status`). El Mac puede contener modificaciones iOS que GitHub desconoce. No sobrescribir el directorio Xcode por copiar `main` a ciegas.
3. Una vez reconciliados los cambios web comunes con la copia local, compilar el payload iOS por el procedimiento de ese proyecto (en conversaciones anteriores `npm run build:ios`), sincronizar Capacitor iOS, instalar en `Juan’sPhone` con Xcode y comprobar versión/build en el target. **Los cambios GitHub no se instalan solos en la app nativa.**
4. Para Android: compilar una APK QA de flavor aislado por el workflow Android aprobado **solo al pedir pruebas en Android**; tras validación, preparar candidato `productionRelease` con nuevo `versionCode` y firma original. La publicación a Play requiere confirmación específica del propietario.
5. Para la DEV web: `main` → GitHub Actions → GitHub Pages `/dev`. Usar el `DEV_SOURCE_SHA` publicado para identificar las pruebas en Safari iPhone o navegador Android. Con la numeración automática no modificar manualmente números en múltiples archivos.

## Matriz mínima de aceptación

| Cambio | Safari iPhone/PWA | iOS nativo Xcode | Android QA | Android Play pública |
|---|---|---|---|---|
| Ajuste de **menú** | QA visual/táctil | Recompilar + QA nativa | Recompilar + QA táctil | **No** se modifica hasta publicación autorizada |
| Prueba de **rendimiento iOS** | A/B y métricas; Android sin cambios | Recompilar y medir con Instruments si procede | Smoke de no regresión; NO habilitar mejora iOS | Sin cambio |
| Cambios de **lógica común** | Validar | Validar después de sincronizar | QA real + regresiones | Solo tras aprobación |
| Arreglo de **Admin Hub/botones rojos** | QA Paddock en DEV | QA solo si Admin Hub disponible en build de pruebas | QA solo en build de pruebas que lo incluya | No exponer administración en producción |

## Fuentes históricas vs vigentes
- `docs/VERSION_CHANGELOG.md`: excelente **registro histórico** de bugs, versiones y commits, pero su introducción menciona `develop` y no es aplicable a la rama actual.
- `docs/REPOSITORY_WORKFLOW.md`: flujo histórico `beta-0.0.3`, expresamente marcado como antiguo.
- `docs/dev-version-auto-stamp.md`: procedimiento actual de **numeración de la PWA DEV**, no numeración Android/iOS.
- `docs/continuity/2026-10-20-handoff-general.md`, `AGENTS.md`, `android/app/build.gradle`, `.github/workflows/pages.yml`, `vite.config.js`: consultar HEAD antes de una tarea. El presente documento define el nuevo **alcance por plataforma**, no sustituye comprobaciones de versiones reales.
