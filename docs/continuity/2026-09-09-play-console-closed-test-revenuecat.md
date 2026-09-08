# Topdown Craftrace — Play Console closed test + RevenueCat

Fecha: 2026-09-09
Rama de trabajo: `main` únicamente.

## Estado Play Console

- Objetivo inmediato: publicar una **prueba cerrada** en Google Play.
- Se creó una lista inicial de testers por correo.
- Testers actuales: 18.
- Correo de feedback de testers: `dj1free@gmail.com`.
- La pista cerrada está creada, pero el lanzamiento está vacío porque todavía no se ha generado/subido ningún APK/AAB.
- Play Console muestra errores por ausencia de App Bundle.

## Estado de versiones

- La versión que se da por cerrada para publicar es la antigua `DEV 0.0.4 · LXI`.
- Esa versión queda promovida a **BETA 1.0 FINAL** en la rama congelada `beta-1.0`.
- A partir de esta promoción, el desarrollo activo continúa en `main` como **DEV 1.0.1**.
- `beta-0.0.3` queda como histórico y no debe volver a usarse como beta pública actual.
- GitHub Pages debe publicar `/` desde `beta-1.0` y `/dev` desde `main`.

## Android

- Package/application ID definitivo en Google Play:
  - `com.craftracestudio.topdownrace`
- El proyecto actual en `main` es Vite + Phaser.
- Todavía no existe infraestructura Android/Gradle/Capacitor en el repositorio.
- Próximo trabajo técnico: envolver el build web con Capacitor, crear proyecto Android y generar un `.aab` firmado.
- En esta sesión el propietario **no está en el Mac**, por lo que no se debe depender de Terminal, Android Studio ni trabajo local hasta que vuelva a tener acceso al Mac. Mientras tanto se puede avanzar en GitHub, Play Console, documentación y planificación/configuración que sea posible desde el dispositivo actual.

## RevenueCat — requisito crítico

- **RevenueCat NO es opcional para el Shipaton.**
- Para poder presentar Topdown Craftrace al Shipaton hay que integrar **al menos una monetización mediante RevenueCat**.
- Por tanto, una build destinada al Shipaton no se debe considerar completa si solo contiene el juego empaquetado y la prueba cerrada: debe existir al menos un flujo real de monetización integrado con RevenueCat.
- La planificación de Android debe hacerse desde el principio teniendo esto en cuenta, para evitar rehacer la capa nativa después.

## Orden de trabajo recomendado

1. Mantener congelada `beta-1.0` como BETA 1.0 FINAL.
2. Continuar trabajo nuevo solo en `main` como DEV 1.0.1.
3. Preparar Capacitor sobre `main` cuando haya acceso al Mac.
4. Configurar Android con `com.craftracestudio.topdownrace`.
5. Integrar RevenueCat y al menos un producto/flujo de monetización válido para el Shipaton.
6. Generar y probar una primera build Android.
7. Generar `.aab` firmado.
8. Subirlo a la pista cerrada de Play Console.
9. Activar testers y validar instalación/compra/restauración en Android.

## Regla de continuidad

No volver a tratar RevenueCat como una mejora posterior u opcional cuando se esté preparando la versión del Shipaton. Es una condición obligatoria del objetivo actual. No pedir al usuario trabajo de Mac mientras haya indicado que no dispone de él.
