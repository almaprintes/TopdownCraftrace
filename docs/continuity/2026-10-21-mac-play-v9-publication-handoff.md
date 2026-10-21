# Relevo operativo desde el Mac — Publicar Top Down RACE 1.2.334 en Google Play (21/10/2026)

## Objetivo y límites

El propietario quiere probar en Android la APK QA 1.2.334 y, **si confirma que todo funciona**, finalizar desde el Mac la publicación de la actualización de **Top Down RACE** que actualmente está publicada en Google Play como versión **1.1.188, versionCode 8** (comprobar en Play Console antes de subir). La actualización real tiene **versionName 1.2.334 y versionCode 9**, el mismo **applicationId original `com.craftracestudio.topdownrace`**. No se debe publicar sin confirmación del resultado de QA. GitHub/Google Play no se actualizarán automáticamente.

Repo: `almaprintes/TopdownCraftrace`. Única rama: `main`. No usar ramas históricas. DEV web consolidada: `1.2.334`. A la hora de documentar, HEAD `cde01a163996ed9642b40e4b1649cc8b934e010c`; revisar de nuevo HEAD al reanudar. No generar un APK/AAB distinto ni incrementar `versionCode` sin motivo: ambos paquetes YA ESTÁN COMPILADOS y conservar sus artefactos facilita comprobar igualdad de contenido.

## Entregables YA compilados y verificados

**1. APK QA Android 1.2.334 (para prueba antes de subir a Play):**

- GitHub Actions compilación: https://github.com/almaprintes/TopdownCraftrace/actions/runs/39630545275
- Descargar artefacto ZIP con la APK real (es posible que GitHub requiera iniciar sesión): https://github.com/almaprintes/TopdownCraftrace/actions/runs/39630545275/artifacts/12358663791
- Artifact name: `TDR-QA-DEV-1.2.334-REAL-ADS-SIN-MEDIR`; APK dentro del ZIP: `TDR-QA-DEV-1.2.334-REAL-ADS-SIN-MEDIR.apk`; unos 214 MB.
- Archivo APK SHA-256: `72737ac818507ebb1d04f3981dadb93533f7ecf2e1c7b2ec4fc2faa894b9ee5e`. El **APK salió correcto** de Gradle y se comprobó `aapt`, `apksigner`, ZIP y hash.
- QA applicationId: `com.craftracestudio.topdownrace.rewardedtest`; **versionCode `1000334`**.
- Firma QA SHA-256: `cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f`, idéntica a .325/.328. Permite actualización por firma y versionCode sobre .328; **NO desinstalar ni borrar datos**, comprobar en dispositivo.
- La creación de un enlace directo mediante GitHub Release FALLÓ con HTTP 403 `Resource not accessible by integration`, incluso usando un workflow con `contents:write`: https://github.com/almaprintes/TopdownCraftrace/actions/runs/39632705218. **No inventar** un enlace `/releases/download/tdr-qa-1.2.334`: no existe. El enlace de artefacto GitHub Actions anterior es válido.
- El commit de compilación QA es `9223160b33db2ece76ab25a1b43b6e69e8be3235`; más tarde se editaron solamente scripts/workflows/docs y se compiló el AAB. Si se exige paridad binaria exacta, comparar hashes del payload final, no prometer mismo commit literal.

**2. AAB de producción, actualización REAL Play v9:**

- GitHub Release candidato comprobado: https://github.com/almaprintes/TopdownCraftrace/releases/tag/tdr-play-candidate-1.2.334-vc9
- Enlace directo: https://github.com/almaprintes/TopdownCraftrace/releases/download/tdr-play-candidate-1.2.334-vc9/TDR-PLAY-1.2.334-vc9-NO_PUBLICAR_SIN_FIRMA.aab
- Tamaño 216.197.353 bytes (≈216 MB). SHA-256 del AAB sin firmar: `1651160e0a2e1b3cd33c11dc03f0b5ced470f8fad5c5f6db018cbb64757f9964`.
- Build production SUCCESS en https://github.com/almaprintes/TopdownCraftrace/actions/runs/39631541726 ; `app-production-release.aab`, variante `productionRelease`, appId `com.craftracestudio.topdownrace`, `versionName 1.2.334`, `versionCode 9`. Hash y etiqueta confirmados; **no está firmado con el certificado original de subida**, y NO ES APTO para subir tal cual a Play.
- El workflow de producción NO tiene actualmente los secretos con la clave de subida original (`TDR_PLAY_UPLOAD_KEYSTORE_BASE64`, `TDR_PLAY_UPLOAD_STORE_PASSWORD`, `TDR_PLAY_UPLOAD_KEY_PASSWORD`, `TDR_PLAY_UPLOAD_KEY_ALIAS`). Por tanto, deliberadamente generó `NO_PUBLICAR_SIN_FIRMA`. No generar una clave nueva salvo como procedimiento oficial de reset si la anterior se perdió.

**3. Web:** DEV `1.2.334` y Pages CI última ejecución https://github.com/almaprintes/TopdownCraftrace/actions/runs/39632705142 `completed/success`. Google Play sigue en v8 hasta acción humana confirmada en Play Console.

## Mac: recuperar, validar y proteger la clave original

- La ruta histórica comunicada por el usuario es `/Users/juanfrikazo/topdownrace-upload.jks`; alias `topdownrace-upload`. **Comprobar primero que exista** en el Mac (o en Time Machine/copia); la existencia actual NO ha sido verificada desde este chat.
- Requiere Java/JDK con `keytool` y `jarsigner`. Comprobar `command -v java keytool jarsigner`.
- Inspección sin revelar secretos:
  ```bash
  ls -l "$HOME/topdownrace-upload.jks"
  keytool -list -v -keystore "$HOME/topdownrace-upload.jks" -alias topdownrace-upload
  ```
  Solicitará la contraseña en el Terminal Mac, no en el chat. Comparar el **SHA-256 del certificado de clave de SUBIDA** con el certificado de carga que muestra Play Console en **Firma de aplicaciones de Play**; no comparar con la firma QA ni confundir con el **certificado de firma de la aplicación** que guarda Google.
- No subir `.jks`, contraseñas, `keystore.properties`, ni copia sin cifrar a GitHub, chat, Drive público o artefactos de CI. No pedir al propietario que escriba contraseñas en el chat.
- Hacer dos copias de seguridad cifradas de la JKS en destinos independientes (p. ej. soporte externo cifrado y gestor/almacén seguro), junto con registro seguro del alias y credenciales (sin exponerlas).
- Si la JKS se ha perdido: si está activado **Play App Signing**, Google permite restablecer clave de subida en Play Console sin perder la publicación. Ver documentación oficial: https://support.google.com/googleplay/android-developer/answer/9842756 y https://developer.android.com/studio/publish/app-signing . Confirmar el estado real en Play Console antes de recomendar un reset: **no crear una nueva clave por defecto**.

## Firmar en el Mac el AAB ya compilado

Tras descargar el AAB a `~/Downloads` (ajustar la ruta si cambió) y verificar antes su hash, usar por ejemplo:

```bash
cd "$HOME/Downloads"
shasum -a 256 TDR-PLAY-1.2.334-vc9-NO_PUBLICAR_SIN_FIRMA.aab
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore "$HOME/topdownrace-upload.jks" \
  -signedjar "$HOME/Downloads/TDR-PLAY-1.2.334-vc9-FIRMADO.aab" \
  "$HOME/Downloads/TDR-PLAY-1.2.334-vc9-NO_PUBLICAR_SIN_FIRMA.aab" \
  topdownrace-upload
jarsigner -verify -verbose -certs "$HOME/Downloads/TDR-PLAY-1.2.334-vc9-FIRMADO.aab"
keytool -printcert -jarfile "$HOME/Downloads/TDR-PLAY-1.2.334-vc9-FIRMADO.aab"
```

La primera comprobación `shasum` debe coincidir con `1651160e0a2e1b3cd33c11dc03f0b5ced470f8fad5c5f6db018cbb64757f9964`. No publicar sin verificar firma, certificado y paquete real; adaptar algoritmo de firma a la clave si es necesario. `jarsigner` pedirá credenciales en el Terminal. No modificar el contenido del AAB después de firmarlo. Alternativa segura: reconstruir `productionRelease` localmente con `android/keystore.properties` excluido de Git y configurar la firma original; verificar el resultado igualmente.

Antes de subir, comprobar tamaño/formato, `com.craftracestudio.topdownrace`, `versionCode 9` y certificado de **carga** en Play Console. No usar la APK QA para actualizar Play.

## Checklist de QA que el propietario debe confirmar

Probar la APK .334 instalada SOBRE la QA .328 en Android sin desinstalar y verificar retención de datos. Probar entrada en frío a varias pistas, cambiar entre circuitos normales/inversos (especialmente Canarias 4096/Tenerife/Atlántico), ausencia de paredes falsas en primera carga, colisiones en inversos, reinicio, checkpoints y vueltas; fantasma con zoom dinámico y reinicio; lecturas de tanda variadas; copia JSON nube/local; rankings Supabase; inventario y garaje; anuncios reales sin congelaciones; ausencia de crash al terminar. Si hay fallo crítico, NO subir AAB, corregir en main y aumentar versión/código si se genera un nuevo candidato, sin pisar la v9 candidata firmada.

## Publicación de la actualización v8 → v9

1. Conservar la respuesta del usuario al test: **solo continuar si confirma "todo bien"/"publica"** o da autorización inequívoca. Este proyecto pidió preparar AAB mientras prueba; NO publicar automáticamente.
2. Abrir Play Console con la cuenta de desarrollador, Top Down RACE, **verificar pista de producción vigente en `versionCode 8`**, permisos y política de ads/datos. Confirmar Play App Signing, SHA-256 de la clave de subida y que `versionCode 9` está libre.
3. Subir el AAB **firmado** (no el `NO_PUBLICAR_SIN_FIRMA`) como actualización de la misma aplicación `com.craftracestudio.topdownrace`; rellenar notas de versión en español e inglés y completar requisitos/avisos de Play Console que aparezcan.
4. Revisar advertencias, validación del paquete, cambios de permisos, SDK objetivo y formularios exigidos. Si hay bloqueos, solucionarlos; no afirmar que está publicado por haber completado el upload.
5. Tras confirmación del propietario, **enviar a revisión / iniciar despliegue** en la pista elegida. Confirmar estado real en Play Console (borrador, en revisión, publicado). La revisión y disponibilidad pueden tardar; no inventar tiempos.
6. Documentar commit fuente, AAB firmado SHA-256, certificado, versionCode y estado real de publicación; actualizar `PROJECT_HANDOFF.md` / `AGENTS.md` para no afirmar más que la evidencia disponible.

## Información importante

- Firma QA y firma Play **son diferentes**; no usar `TDR_CI_QA_STABLE_SIGNING` para producción. `android/app/build.gradle` define variantes `production` y `deviceTest`; defaultConfig histórico sigue en 1.1.188/vc8, pero el flavor producción SOBRESCRIBE a 1.2.334/vc9.
- El último HEAD `main` puede cambiar por nuevos commits de documentación y la QA/AAB están ligados a sus SHAs concretos. No recompilar por cambios de documentación.
- Herramientas de acceso local al Mac pueden variar entre chats; si el nuevo chat no tiene control de archivos locales/Play Console, guiar por Terminal o indicar Work con navegador donde proceda; nunca afirmar acceso directo sin comprobarlo.
- No es preciso que una pérdida de Mac bloquee la app para siempre: con **Play App Signing habilitado**, puede solicitarse reset de clave de subida, pero primero conservar copias de la original y comprobar el estado en Play Console.
