# TDR — AdMob suspendido: aislar QA de anuncios (31/10/2026)

La última ejecución del workflow de DEV `41188685153` mostró:
- Compilación web: **success**.
- Despliegue GitHub Pages: **success**.
- Build Android en rama `bridgeTest` y pruebas unitarias: completados.
- Instrumentación en emulador Android 15: **failure**, el anuncio demo
  `post_race_double_loot` devolvió `sample_ad_watchdog_timeout`.
No demuestra que el puente nativo no exista: el test exige que se complete
una muestra publicitaria en un emulador y eso puede depender de factores
externos. Este fallo debe seguir investigándose, no hacerse invisible.

La cuenta tiene la restricción de anuncios vigente hasta que Google confirme
su levantamiento; la campaña de noviembre debe permanecer sin anuncios.
**No encender anuncios ni emplear IDs reales para QA durante la suspensión.**

Cambio de integración continua:
1. `.github/workflows/pages.yml`: mantiene el build real de Android,
   tests unitarios nativos, APK de prueba y despliegue DEV, pero no depende
   del test de recompensa de Google en el emulador.
2. `.github/workflows/android-rewarded-emulator-diagnostic.yml`:
   workflow separado **manual** `workflow_dispatch`. Reproduce exactamente
   el paso instrumentado y conserva sus resultados incluso si falla.
   Sin IDs reales, tokens de facturación ni `continue-on-error`.
3. `scripts/ci-ads-isolation-smoke.mjs` se ejecuta en el laboratorio
   PostgreSQL de GitHub para proteger esta separación frente a regresiones.

Antes de reactivar AdMob (no basta con que llegue diciembre):
reconfirmar autorización oficial de Google, volver a ejecutar manualmente
el diagnóstico, solucionar cualquier error real de instrumentación,
y revisar el puente RevenueCat/AdMob y la recompensa server-side.

**Sin cambios de Play Store, cuentas, Supabase, datos ni costes en el Mac.**
