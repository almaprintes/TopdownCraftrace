# Top Down RACE: CraftRace — publicación Google Play + Shipaton 2026

Fecha de inicio: 2026-08-31
Estado: activo

## Identidad pública del proyecto

- Nombre oficial del juego: `Top Down RACE: CraftRace`
- Nombre público de desarrollador en Google Play: `CraftRace Studio`
- Titular legal: Juan Francisco Fernández Ramos
- País: España
- Idioma principal de la ficha: Español (España)
- Localización adicional prevista: Inglés
- Público objetivo: todos los públicos / sin contenido adulto
- Publicación inicial: Android / Google Play únicamente
- iOS / Apple Developer Program: aplazado hasta validar viabilidad y rendimiento del juego en iOS

## Web oficial

- Dominio previsto: `https://topdownrace.almaprint.es`
- El subdominio se usa técnicamente bajo `almaprint.es`, pero la marca AlmaPrint NO debe aparecer como marca/desarrollador del juego.
- DNS administrado en Cloudflare.
- Registro creado: CNAME `topdownrace` -> `almaprintes.github.io`, inicialmente `Solo DNS`.
- Repo web independiente creado: `almaprintes/TopDownRace-Web`
- GitHub Pages configurado desde `main` / `/ (root)`.
- Custom domain configurado en GitHub Pages: `topdownrace.almaprint.es`.
- En el repo web ya existen como base: `CNAME`, `index.html` y página de soporte.
- Pendiente: política de privacidad final, textos definitivos, diseño final y validación HTTPS estable.

## Contacto

- Correo usado para la cuenta de desarrollador y comunicaciones: `dj1free@gmail.com`
- Se prevé crear reglas/etiquetas para separar correos del juego.
- El correo público de soporte de cada app puede configurarse posteriormente.

## Google Play Console

### Cuenta

- Cuenta de desarrollador creada el 2026-08-31.
- Tipo: cuenta personal.
- Nombre público: `CraftRace Studio`.
- Registro: 25 USD, pago único, completado.
- Perfil de pagos: particular / España / titular legal real.
- Monetización declarada: sí.
- Número aproximado de apps en próximos 12 meses: 1.
- Métodos de monetización declarados: anuncios + compras dentro de la aplicación.
- No se declararon suscripciones ni app de pago.
- Categorías especiales: `Ninguna de las anteriores`.
- Sitio web declarado: `https://topdownrace.almaprint.es`.
- Experiencia declarada: primer videojuego Android / primera publicación en Google Play; desarrollo previo principalmente web/PWA.

### Verificaciones

- Verificación de identidad: documentación enviada el 2026-08-31, estado `En revisión`.
- Documentos aportados: documento de identidad por ambas caras + justificante de domicilio.
- Verificación de acceso a un dispositivo Android real: COMPLETADA el 2026-08-31 mediante la app móvil Play Console.
- Verificación del número de teléfono de contacto: PENDIENTE; Google la mantiene bloqueada hasta aprobar primero la verificación de identidad.
- Estado general de la cuenta: no se puede publicar hasta completar la configuración de cuenta.

### Privacidad relevante

- Google Play indica que, si la cuenta obtiene ingresos, la dirección legal completa del desarrollador puede mostrarse públicamente.
- No se debe inventar ni ocultar información legal. Si en el futuro se quiere evitar mostrar un domicilio particular, habrá que resolverlo mediante una dirección legal válida y admisible por Google.

## Shipaton 2026 — estrategia

Objetivos principales definidos:

1. Best Game Award.
2. RevenueCat Design Award.
3. #BuildInPublic.

Objetivos adicionales a evaluar/atacar si no comprometen estabilidad:

- OneSignal / Keep Them Coming Back.
- Catvertising, si RevenueCat Ads encaja técnicamente con el stack.
- HAMM, si la monetización y las métricas lo justifican.
- Grand Prize como objetivo global de elegibilidad, sin diseñar el producto alrededor de él.

### Requisitos Shipaton que ya condicionan el release

- La app debe estar publicada durante la ventana válida del concurso.
- RevenueCat es obligatorio para la candidatura según las reglas revisadas.
- Debemos tener una implementación real válida de compra/monetización mediante RevenueCat o la modalidad válida que establezcan las reglas.
- Material de candidatura pendiente: vídeo demo <2 min, icono 1024x1024, screenshots requeridos, descripción, enlaces públicos, acceso a funciones premium para jueces si aplica.
- Objetivo interno recomendado: publicar bastante antes del cierre para disponer de margen de revisión, métricas y correcciones.

## Monetización prevista

- Descarga gratuita.
- Anuncios recompensados opcionales.
- Compras dentro de la aplicación.
- No se prevé suscripción para la 1.0.
- AdMob ya estaba planteado en el proyecto, pero la integración real en el build debe verificarse antes de darla por hecha.
- RevenueCat todavía NO está configurado/integrado en el juego a fecha de este documento.

## Próximos pasos — orden recomendado

### P0 — ahora

- [ ] Esperar aprobación de identidad de Google.
- [ ] En cuanto se apruebe, verificar el número de teléfono de contacto.
- [ ] Crear cuenta/proyecto de RevenueCat para `Top Down RACE: CraftRace`.
- [ ] Decidir el primer producto de compra dentro de la app que se gestionará con RevenueCat.
- [ ] Determinar package/application ID Android definitivo antes de conectar Google Play + RevenueCat.
- [ ] Verificar estado real de integración Android del repo y ruta de build nativo.

### P1 — ficha Google Play

- [ ] Crear la app `Top Down RACE: CraftRace` en Play Console cuando la cuenta lo permita.
- [ ] Idioma principal: Español (España).
- [ ] App: juego.
- [ ] Gratis.
- [ ] Declarar anuncios.
- [ ] Configurar Data Safety según SDKs realmente incluidos.
- [ ] Clasificación de contenido mínima compatible con el juego.
- [ ] Público objetivo sin marcar categorías especiales de niños/familias salvo que se decida explícitamente después.
- [ ] Añadir URL de privacidad y soporte.
- [ ] Preparar icono, feature graphic, screenshots y descripción ES/EN.

### P2 — testing y publicación

- [ ] Revisar los requisitos vigentes de testing para cuentas personales nuevas de Google Play.
- [ ] Preparar testers y ventana de prueba cerrada si Google la exige antes de producción.
- [ ] Generar AAB firmado.
- [ ] Probar en varios Android reales.
- [ ] Validar anuncios, compras, RevenueCat, restauración de compras, offline/online y guardado.
- [ ] Publicar una 1.0 estable con margen suficiente antes del cierre de Shipaton.

### P3 — Shipaton / marketing

- [ ] Empezar/continuar BuildInPublic con enlaces y cambios reales derivados del feedback.
- [ ] Preparar vídeo demo de menos de 2 minutos.
- [ ] Preparar screenshots obligatorias y material promocional.
- [ ] Completar Devpost.
- [ ] Revisar categorías finales y requisitos exactos justo antes de entregar.

## Regla de continuidad

Este documento debe actualizarse cada vez que se complete un paso de publicación, cambie un requisito, se cree un identificador definitivo, se conecte un SDK o aparezca un bloqueo. No dar por hecho que una cuenta creada equivale a SDK integrado ni que una configuración externa equivale a una función funcionando dentro del build.
