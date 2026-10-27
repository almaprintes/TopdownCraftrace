# Google Play V10 — Black Friday / noviembre sin anuncios

**Estado:** candidato, NO publicado automáticamente. Android package `com.craftracestudio.topdownrace`; `versionCode 10`; `versionName 1.2.336`.

## Texto sugerido para «Novedades»

BLACK FRIDAY EN TOP DOWN RACE 🏁
¡Noviembre sin anuncios! Consigue 100 monedas cada 4 horas, publica tus récords, desafía fantasmas y duplica botines gratis hasta el 30 de noviembre. Hemos preparado también mejoras en Race Control y estabilidad. ¡A por tu mejor vuelta!

## Verificaciones indispensables antes de publicar

- No confundir APK de QA `com.craftracestudio.topdownrace.rewardedtest` y la aplicación original.
- Confirmar firma original del paquete de Play y `versionCode=10`.
- Instalación como actualización de la V9 sin borrar datos locales.
- El modo gratuito **NO** debe llamar a SDK AdMob ni fingir verificación de RevenueCat.
- Monedas +100 conserva cuatro horas; no duplicar reclamación a pulsaciones repetidas.
- Duplicación ×2 conserva reclamación única de la carrera.
- Publicación de récords y fantasmas requiere identidad Supabase, vuelta válida y confirmación del servidor, aunque la promoción dispense del anuncio.
- Cartel Black Friday se muestra una vez por sesión, puede reabrirse desde el lobby y puede cerrarse incluso en horizontal.
- Comprobar traducción ES/EN, accesibilidad y vista del iPhone/Android.
- Revisar el flujo de vuelta a anuncios a partir del 01/12, sujeto al estado real de la cuenta publicitaria.

## Control remoto

Tabla de solo lectura para clientes: `public.tdr_promotion_control`, ID `november_2026`, `enabled=true`, fin `2026-12-01T00:00:00Z`.

El equipo administrador puede extender o desactivar el periodo desde SQL en Supabase, nunca desde clientes. No introducir credenciales privilegiadas en el juego. **No desactivar antes de finalizar el mes**, ya que el evento promete noviembre íntegro.

El acceso gratuito es un permiso de promoción dentro del videojuego, **no** una visualización o recompensa validada por Google/RevenueCat.
