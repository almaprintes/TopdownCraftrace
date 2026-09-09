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
- `beta-1.0` sigue congelada mientras se validan en `main` las mejoras candidatas a entrar en la beta publicable.

## Android

- Package/application ID definitivo en Google Play:
  - `com.craftracestudio.topdownrace`
- El proyecto actual en `main` es Vite + Phaser.
- Todavía no existe infraestructura Android/Gradle/Capacitor en el repositorio.
- Próximo trabajo técnico: envolver el build web con Capacitor, crear proyecto Android y generar un `.aab` firmado.
- En esta sesión el propietario **no está en el Mac**, por lo que no se debe depender de Terminal, Android Studio ni trabajo local hasta que vuelva a tener acceso al Mac. Mientras tanto se puede avanzar en GitHub, Play Console, documentación y planificación/configuración que sea posible desde el dispositivo actual.

## Monetización acordada

- Las compras repetibles de paquetes de monedas serán consumibles mediante **Google Play Billing**.
- **AdMob** será la red de anuncios.
- **RevenueCat Ads** se integrará con los rewarded ads de AdMob para telemetría/verificación y para cumplir el requisito de RevenueCat del Shipaton.
- No convertir los paquetes de monedas en suscripciones ni reintroducir Monthly/Yearly/Lifetime salvo decisión explícita posterior.

## ×2 de botín post-carrera — candidato fuerte a BETA 1.0 FINAL

- Implementado primero en `main` / DEV 1.0.1 para validarlo antes de decidir su promoción a `beta-1.0`.
- Flujo: el botín base se concede siempre -> aparece una oportunidad voluntaria **×2 DUPLICAR BOTÍN** -> rewarded ad -> solo tras finalización/verificación se concede una segunda copia del botín elegible.
- Si el anuncio falla, se cierra o no se verifica, el jugador conserva íntegro el botín base.
- Una sola duplicación por carrera/sesión. La reclamación utiliza un `claimId` persistente para impedir dobles callbacks o dobles concesiones.
- El ×2 afecta al botín económico elegible (piezas/materiales/moneda cuando corresponda), nunca a tiempos, victorias, récords, puntos de leaderboard ni otras métricas competitivas.
- En DEV existe simulación del rewarded para probar UX. La conexión nativa real con AdMob + RevenueCat Ads/SSV queda para el trabajo Android en Mac.
- La presentación visual se rehízo para que sea un momento protagonista: CTA dorado grande, ×2 muy visible, representación del premio duplicado, brillo/partículas y confirmación verde de **BOTÍN DUPLICADO**.
- El objetivo de UX es que se perciba como una oportunidad especial y valiosa, no como publicidad obligatoria ni como un botón secundario.
- Si las pruebas son estables y la experiencia convence, el propietario quiere considerar expresamente incorporar esta función a **BETA 1.0 FINAL** antes de publicación.

## Ingeniero de pista / Lectura de la tanda

### Problema detectado

- La sección **LECTURA DE LA TANDA** repetía una frase genérica sobre salidas de pista incluso en sesiones en las que el jugador no se había salido.
- Eso hacía que el informe pareciera decorativo y podía afirmar hechos falsos.

### Primera mejora implementada en DEV

- La lectura pasa a basarse en telemetría real de la sesión en lugar de una frase fija.
- Se enlaza el estado de vuelta limpia con cada vuelta completada.
- Una salida de pista solo se puede mencionar cuando el juego la haya detectado realmente.
- El análisis puede distinguir, según los datos disponibles: mejor vuelta, mejor vuelta al inicio/final, mejora progresiva, caída progresiva de ritmo, consistencia, dispersión elevada y sesión limpia.
- Principio obligatorio: **no inventar telemetría**. Si una métrica no existe o no fue registrada, el ingeniero no puede afirmar que ocurrió.

### Próximo paso aprobado: análisis por sectores

El propietario considera especialmente valioso que el informe se comporte como un **ingeniero de pista que ha estado vigilando la telemetría**. El siguiente salto aprobado es analizar S1/S2/S3 junto con las vueltas completas.

Objetivos:

- Identificar el sector más fuerte y el más débil de la sesión.
- Detectar en qué sector se está perdiendo la mayor parte del tiempo.
- Reconocer mejores sectores personales/de sesión cuando la telemetría lo permita.
- Detectar inconsistencia localizada: por ejemplo, S1 estable pero S3 muy variable.
- Relacionar una buena vuelta con sus sectores, evitando conclusiones basadas solo en el tiempo total.
- Producir comentarios concretos y útiles del estilo: `Tu S1 está siendo muy fuerte, pero la mayor pérdida está llegando en S3.`
- Variar la redacción sin convertirla en frases aleatorias: primero se determina el diagnóstico con datos y después se elige una formulación apropiada.
- Priorizar una o dos observaciones importantes en lugar de saturar al jugador con toda la telemetría.

### Visión futura — NO implementar ahora

- Queda documentada, pero aplazada, la posibilidad de convertir el ingeniero en acompañamiento durante la carrera mediante comentarios breves en tiempo real por texto y/o audio.
- Ejemplos futuros: `Buen S1`, `A dos décimas de tu mejor vuelta`, avisos de consistencia o información útil de ritmo.
- El propietario considera que los comentarios en tiempo real pueden resultar excesivos para la versión actual, por lo que **no forman parte del alcance inmediato**.
- Si se retoma en versiones futuras, deberá ser poco intrusivo, contextual, configurable y hablar solo cuando exista información útil.

## RevenueCat — requisito crítico

- **RevenueCat NO es opcional para el Shipaton.**
- Para poder presentar Topdown Craftrace al Shipaton hay que integrar RevenueCat de una forma válida según las reglas vigentes; la arquitectura acordada usa **RevenueCat Ads** con los rewarded ads de AdMob.
- Por tanto, una build destinada al Shipaton no se debe considerar completa si solo contiene el juego empaquetado y la prueba cerrada: debe existir el flujo real de RevenueCat Ads integrado y funcionando.
- La planificación de Android debe hacerse desde el principio teniendo esto en cuenta, para evitar rehacer la capa nativa después.

## Orden de trabajo recomendado

1. Mantener congelada `beta-1.0` mientras se validan las mejoras candidatas.
2. Continuar trabajo nuevo en `main` como DEV 1.0.1.
3. Completar/probar el análisis de tanda y sectores en DEV.
4. Validar a fondo el ×2 post-carrera en DEV y decidir si se promueve a BETA 1.0 FINAL.
5. Preparar Capacitor sobre `main` cuando haya acceso al Mac.
6. Configurar Android con `com.craftracestudio.topdownrace`.
7. Integrar Google Play Billing para consumibles, AdMob y RevenueCat Ads/SSV.
8. Generar y probar una primera build Android.
9. Generar `.aab` firmado y subirlo a la pista cerrada de Play Console.
10. Activar testers y validar instalación, anuncios recompensados y compras en Android.

## Regla de continuidad

No volver a tratar RevenueCat como una mejora posterior u opcional cuando se esté preparando la versión del Shipaton. No pedir al usuario trabajo de Mac mientras haya indicado que no dispone de él. Mantener separados los cambios de DEV y la rama `beta-1.0`: ninguna mejora nueva se promueve a la beta congelada sin decisión explícita.