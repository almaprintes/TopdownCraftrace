# Firma recuperada y preparación de candidato 1.2.335

El propietario autorizó continuar tras contrastar en Play Console el certificado de clave de subida. En el Mac se validaron mediante Java Properties las contraseñas del almacén y de la clave privada, sin mostrarlas ni modificar el almacén. Los valores locales están escapados como Unicode; no deben copiarse literalmente a keytool.

- Alias: topdownrace-upload.
- Certificado SHA-256: A1:D1:11:5C:71:9A:DE:2C:53:26:B7:50:CE:B3:16:B8:26:CD:6D:09:34:80:7B:C7:74:E6:61:7E:25:AC:1F:20.
- No se han subido credenciales a GitHub ni firmado/publicado una actualización Play.
- Fuente del arreglo: main 26b9f1dd88165f54276bca00268ef43bc6304135, DEV 1.2.335.
- Nueva preparación: QA 1.2.335/versionCode 1000335; producción 1.2.335/versionCode 10. Los candidatos 1.2.334 se conservan como históricos, no se publican.
- La APK debe conservar certificado QA cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f. Si falta el almacén QA original, detenerse sin generar otra clave.
- Pendiente: comprobar resultados de compilación del commit, validar APK en móvil (Atlántico normal/inverso, fantasmas antiguos/nuevos, escala de coche y conservación de datos), firmar el nuevo AAB localmente y auditar paquete/certificado. La compilación no equivale a validación móvil.
- Antes de cualquier envío a revisión/despliegue: comprobar estado y códigos disponibles en Play Console y obtener autorización final inequívoca del propietario.
