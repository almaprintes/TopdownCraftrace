# Top-Down Race 2 — Estructura de chats y handoff

Convención: [TDR2] <ÁREA> — <Tema> (v1, v2… cuando se renueve por tokens)

## Chats activos recomendados
1) [TDR2] DEV — Programación v1 (código y debugging)
2) [TDR2] DESIGN — Game Design (progresión, dificultad, economía)
3) [TDR2] ART — Identidad & UI (icono, HUD, branding, flyers, promo)
4) [TDR2] STORY — Campaña (modo historia, estructura, guión)
5) [TDR2] QA — Testing (checklists, dispositivos, criterios de aceptación)

## Regla de renovación
Cuando un chat se acerque al límite de tokens:
- Se crea el siguiente chat y se pega el SUPERPROMPT de continuidad.
- El nuevo chat debe usar el repositorio conectado `almaprintes/TopdownCraftrace` y comprobar siempre el estado real de `main` antes de editar.
- El chat anterior queda como histórico.

---

# SUPERPROMPT ACTUAL — 2026-08-20

Continuamos el desarrollo de **Top Down RACE / TopdownCraftrace**.

Repositorio:
`almaprintes/TopdownCraftrace`

Rama de trabajo:
`main`

## Regla crítica de trabajo
- Usar GitHub conectado de verdad; no decir que no hay acceso sin comprobarlo.
- Antes de editar, inspeccionar imports y archivos activos reales.
- Hacer cambios pequeños y reversibles.
- Tras cada modificación, verificar el SHA exacto con `fetch_commit` antes de comunicarlo.
- El usuario prueba en iPhone real; no afirmar que algo funciona en dispositivo hasta que él lo confirme.

## Física BASE 1.0 congelada
La física común está aprobada y congelada. No tocar globalmente salvo defecto concreto reportado por el usuario.

Coche patrón:
`VELOCE Flash`

Commit base de chasis aprobado:
`433651cf043c9f2312fdc8cd264948c9645608a7`
`Blend chassis load transitions across brake and throttle`

El usuario confirmó una mejora enorme de conducción y un tiempo de 41.751 en Karting Tenerife con Flash. La estrategia es mantener esta BASE 1.0 y crear identidad por coche mediante perfiles/overrides individuales.

## Filosofía de marcas
Hay 15 coches oficiales: 5 marcas × 3.

- HÉLIX: marca pobre/escuela. Cada hermano mejora al anterior pero también es algo más exigente.
- CROWN: mismo espíritu equilibrado, más prestación y refinamiento que HÉLIX.
- AVENIR: precisión y morro incisivo; más técnico, castiga brusquedad y mala transferencia de peso.
- VELOCE: velocidad. Flash es la referencia BASE 1.0; Surge y Photon suben prestaciones y exigencia.
- FORGE: categoría aparte; más lentos en asfalto, mucha fuerza y gran tracción en tierra/césped/condiciones adversas.

Principio: **mejor coche no significa coche más fácil**. Debe aumentar el techo de rendimiento, pero también la exigencia.

## Identidades iniciales ya aplicadas
Se crearon perfiles específicos por coche/familia y overrides individuales. El override activo es:
`public/community/car-overrides.json`

Boot carga `community/car-overrides.json` en producción. Se eliminó un override antiguo absurdo de CROWN Axis (`maxFwd:1500`).

VELOCE Flash quedó sin cambios de rendimiento, solo con `massKg` heredado del override, para conservarlo como patrón.

## Protocolo de homologación
Circuito elegido: **Karting Tenerife**, porque el usuario lo conoce muy bien y así evitamos el sesgo de aprendizaje de un circuito nuevo.

Prueba por coche:
- Contrarreloj.
- 5 vueltas consecutivas.
- Coche completamente stock, sin piezas equipadas.
- Analizar mejor vuelta, progresión V1→V5, consistencia σ, punta, sectores, salidas y sensación subjetiva.

Orden de prueba:
Spark → Comet → Pulse → Axis → Vector → Equinox → Gripline → Apex → Torque → Flash → Surge → Photon → Hammer → Anvil → Colossus.

## Resultados y sensaciones hasta ahora

### HÉLIX Spark
Tanda registrada:
- Mejor 50.613
- Punta 52 km/h
- σ 0.80 s
- Evolución 53.091 → 52.027 → 52.118 → 52.316 → 50.613
- Usuario: “Facilísimo y monótono. Enseguida llegas a la velocidad punta… sensación de quiero maxearlo para poder ir más rápido.”
- Las salidas fueron buscando décimas, no por inestabilidad.
- IMPORTANTE: después descubrimos que llevaba **Frenos T4 equipados**. Como casi no frenó, la lectura de carácter sigue siendo válida y el tiempo probablemente está poco afectado. Repetición stock opcional al final para homologación estricta.

### HÉLIX Comet
- Mejor 47.737
- Punta 56 km/h
- σ 0.80 s
- Evolución 50.238 → 49.114 → 49.074 → 49.321 → 47.737
- Usuario: “Sumamente divertido de conducir. No tan desesperante como el Spark.”
- Congelado provisionalmente, sin cambios.

### HÉLIX Pulse
- Mejor 45.905
- Punta 59 km/h
- σ 0.36 s
- Usuario: “Muy bien y rápido. Muy fácil de manejar con una salida de curva excepcional.”
- Durante esta prueba hubo algo de lag.
- Lectura: rendimiento muy bueno, quizá demasiado fácil para ser el HÉLIX superior. Posible ajuste fino futuro: algo más de exigencia al volver al gas con dirección metida, sin quitar velocidad. No tocar todavía.

### CROWN Axis
- Mejor 46.034 aprox.
- Usuario: “Un poco lento comparado con Pulse pero mucho más fácil de conducir.”
- Visualmente parecía demasiado grande.
- Se corrigió solo su tamaño visual con `visualScale: 0.92`, sin tocar física.
- Commit verificado de escala: `efc5b9e917f24d3d93687ce47e2009c9c58c9172`.

### CROWN Vector
Tanda de 4 vueltas por error, aceptada:
- 45.921 → 44.544 → 44.073 → 43.877
- Mejor 43.877
- Punta 62 km/h
- Velocidad media 57 km/h
- σ 0.80 s
- 0 frenadas; 91% gas / 9% coasting
- Usuario: “Sensación fantástica. El coche me permite progresar y arañar más décimas a cada vuelta.”
- Congelado provisionalmente.

### CROWN Equinox
- Mejor 41.458
- Punta 65 km/h
- Media 60 km/h
- σ 0.57 s
- V1 42.953 / V2 41.496 / V3 41.458 / V4 41.701 / V5 41.483
- Usuario: “He hecho una gran conducción. Es muy potente pero se siente peligro de que te puedes salir en cualquier momento.”
- En V5 se salió dos veces y aun así hizo 41.483; sus mejores parciales fueron 13.545 y 27.342.
- No suavizar de momento: esta sensación de riesgo es justo la identidad deseada.
- Ha superado el viejo 41.751 del Flash, pero antes de nerfear nada hay que repetir Flash más adelante para medir cuánto ha mejorado el piloto durante la sesión.

## Estado AVENIR Gripline
El usuario empezó a probarlo y notó que iba demasiado rápido. Descubrió que tenía mejoras equipadas:
- Neumático Street T1
- Transmisión Prototype T4

La tanda Gripline con esas mejoras NO cuenta. Debe repetirse totalmente stock.

También se descubrió que Spark tenía Frenos T4. Los demás coches probados hasta Equinox parecen stock.

## Factory / desequipado — problema reciente
Inicialmente Factory permitía equipar pero no desequipar.

Se intentó una primera corrección en `_equippedStrip()`, pero era el método equivocado: la barra inferior visible usa realmente `_familyDock()` de `UpgradeWorkshopPremiumV3Scene`.

Se creó wrapper activo:
`src/game/scenes/UpgradeWorkshopUnequipScene.js`

y `src/game/game.js` ahora importa ese wrapper en lugar de `UpgradeWorkshopUnifiedStyleScene.js`.

Commit que activó la interfaz correcta:
`e6b432653a0019d4e541b2d36e176414e1b50b77`
`Activate factory unequip wrapper`

La UI muestra `TOCA PARA QUITAR` en una familia equipada.

### Bug descubierto al desequipar
El usuario quitó Neumáticos T1 y Transmisión T4 del Gripline y las piezas desaparecieron del inventario.

Se corrigió para que al desequipar se devuelva la pieza al inventario cuando no queda ninguna copia física registrada, y además se añadió reparación puntual de las dos piezas perdidas del Gripline.

**Último commit verificado antes del cambio de chat:**
`fe2a036c45487ee5d939f6564113681c5ce3f7ea`
`Return factory parts to inventory when unequipping`

Este commit:
- añade `_returnPartToInventory(equippedId)` antes de borrar la referencia equipada;
- añade una reparación de una sola vez con clave `tdr2:repair:unequip-gripline-20260820`;
- si Gripline ya no tiene esas piezas equipadas y el inventario está a 0, restaura 1× `tires_street` y 1× `transmission_prototype`.

### PRIMERA ACCIÓN DEL NUEVO CHAT
No asumir que el arreglo ya funciona en iPhone. Pedir/comprobar con el usuario que, tras cargar la versión nueva y entrar a Fabricación con Gripline:
1. reaparezcan Neumático Street T1 y Transmisión Prototype T4 en inventario;
2. Gripline tenga las cinco familias en `SIN EQUIPAR`;
3. no desequipar ninguna otra pieza hasta confirmar lo anterior.

Si las piezas reaparecen correctamente, retomar inmediatamente la homologación con **AVENIR Gripline stock, 5 vueltas en Karting Tenerife**.

## Deploy / caché
Hay dos workflows en `.github/workflows/`:
- `build-pages.yml`: construye preview y publica rama `preview`.
- `pages.yml`: construye `dist` y despliega GitHub Pages.

Se forzó `public/sw.js` de `tdr2-v21` a `tdr2-v22` durante el diagnóstico, pero el problema de la opción de desequipar no era caché: era que se había modificado el método incorrecto.

## Regla para continuar la calibración
No tocar la física global BASE 1.0.
No cambiar un coche solo por una tanda aislada si la sensación y los datos no lo justifican.
Mantener las tandas stock y comparar siempre con Karting Tenerife.
Cuando terminemos las familias, repetir 5 vueltas de VELOCE Flash stock como control del progreso del piloto antes de hacer balance final entre marcas.
