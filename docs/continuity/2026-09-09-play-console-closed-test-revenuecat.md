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

## Android

- Package/application ID definitivo en Google Play:
  - `com.craftracestudio.topdownrace`
- El proyecto actual en `main` es Vite + Phaser.
- Todavía no existe infraestructura Android/Gradle/Capacitor en el repositorio.
- Próximo trabajo técnico: envolver el build web con Capacitor, crear proyecto Android y generar un `.aab` firmado.

## RevenueCat — requisito crítico

- **RevenueCat NO es opcional para el Shipaton.**
- Para poder presentar Topdown Craftrace al Shipaton hay que integrar **al menos una monetización mediante RevenueCat**.
- Por tanto, una build destinada al Shipaton no se debe considerar completa si solo contiene el juego empaquetado y la prueba cerrada: debe existir al menos un flujo real de monetización integrado con RevenueCat.
- La planificación de Android debe hacerse desde el principio teniendo esto en cuenta, para evitar rehacer la capa nativa después.

## Orden de trabajo recomendado

1. Preparar Capacitor sobre `main` sin tocar `beta-0.0.3`.
2. Configurar Android con `com.craftracestudio.topdownrace`.
3. Generar y probar una primera build Android.
4. Integrar RevenueCat y al menos un producto/flujo de monetización válido para el Shipaton.
5. Generar `.aab` firmado.
6. Subirlo a la pista cerrada de Play Console.
7. Activar testers y validar instalación/compra/restauración en Android.

## Regla de continuidad

No volver a tratar RevenueCat como una mejora posterior u opcional cuando se esté preparando la versión del Shipaton. Es una condición obligatoria del objetivo actual.
