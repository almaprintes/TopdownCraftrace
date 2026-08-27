# Continuidad 2026-08-27 - Recicladora de materiales

## Problema
En piezas Prototype se observa acumulacion desigual de materiales. Las recetas actuales piden una pieza Racing previa, 2400 de chatarra, 2100 del secundario de familia, 250 de compuesto y 84 de electronica. Por tanto un cambio 1 a 1 entre materiales seria incorrecto.

## Decision economica
Se incorpora una Recicladora de materiales. El jugador elige que material entrega, que material recibe y la cantidad. La conversion solo se ejecuta tras completar un video recompensado. No cuesta monedas.

Valores internos iniciales:
- Chatarra 1.0.
- Aleacion, goma, disco, muelle y engranaje 1.2.
- Compuesto 8.0.
- Electronica 20.0.

La conversion conserva el 75 por ciento del valor. La UI lo explica como `COMISION DE RECICLAJE: 25%`, para que el jugador entienda que el intercambio no es 1 a 1 y que la comision protege el valor de los materiales. Esta perdida evita arbitraje al convertir de un material a otro y volver.

Limite: tres intercambios por dia. El estado se guarda mediante materialExchangeDay y materialExchangeCount en garage state.

## UX revisada
La primera UI ocupaba casi toda la pantalla y mostraba los ocho materiales dos veces. Aunque era funcional, obligaba a utilizar textos demasiado pequenos.

Se sustituyo por una modal compacta con dos selectores grandes:
- ENTREGAS [material / stock / valor]
- RECIBES [material / stock / valor]
- flecha central de conversion
- cantidad mediante presets 25 / 100 / 250 / MAX
- resumen exacto `X material -> Y material`
- texto legible de comision del 25 por ciento
- contador de intercambios diarios
- boton `VER VIDEO E INTERCAMBIAR`

Principio UX adoptado: si una pantalla solo cabe reduciendo el texto hasta resultar incomodo, hay que simplificar la interfaz, no encoger la tipografia.

## Accesos
### Tienda
La Recicladora sigue disponible desde Tienda > Materiales mediante el boton RECICLADORA. Aqui ambos desplegables son libres.

### Fabricacion contextual
Los vasos de materiales incompletos de Fabricacion son pulsables. Al tocar uno se abre la Recicladora como modal SOBRE LA MISMA escena de Fabricacion; no se navega al menu ni se pierde la pieza seleccionada.

El vaso tocado se preselecciona automaticamente como material RECIBES. El jugador puede elegir el material que ENTREGA mediante desplegable. Tras la revision final tambien se permite cambiar RECIBES desde su propio desplegable, manteniendo como valor inicial el material del vaso tocado.

Al cerrar la modal se recarga el estado del garaje y se vuelve a renderizar Fabricacion para que los vasos reflejen inmediatamente el nuevo inventario.

## Implementacion
Economia compartida:
- `src/game/store/materialExchange.js`

Recicladora en Tienda:
- `src/game/scenes/MenuMaterialExchangeScene.js`
- cadena activa: `MenuSeasonScene.js` importa `MenuMaterialExchangeScene.js`

Recicladora contextual en Fabricacion:
- `src/game/scenes/UpgradeWorkshopCompactRecipeScene.js`
- reutiliza exactamente `materialExchange.js` y `RewardedAdsProvider.js`; no duplica reglas economicas.

## Commits
- Economia inicial: `15923d61dc4308159c27b788df1fd8abfc313d6b`
- UI inicial grande: `03eedd38a9895a6a12e67a88abb90d08f4b6ae59`
- Conexion activa a tienda: `cfaf31d1f2749708da8a2bb8774255659ac6606e`
- Rediseño compacto con desplegables: `c37d740e79b2b8471eaeb8f8ab5ac192d23ee995`
- Primer enlace desde vasos: `0ade49fc4edb3923e2b6dce5d95f887a18398656`
- Modal contextual dentro de Fabricacion: `81c9481a5c31be67e29271668adc336fa11749db`
- Flujo contextual final, refresco seguro y ambos desplegables: `e3a3fe1cede8ba070a1859ccbd908d571b7b7cd3`

## Validacion pendiente
Probar:
1. Tienda > Materiales > Recicladora.
2. Tocar un vaso incompleto en Fabricacion y confirmar que RECIBES se preselecciona correctamente.
3. Cambiar ENTREGAS y RECIBES desde desplegables.
4. Conversion chatarra -> compuesto y chatarra -> electronica.
5. Secundario -> secundario.
6. Conversion inversa para comprobar perdida y ausencia de arbitraje.
7. Limite diario y persistencia tras recarga.
8. Tras un intercambio contextual, cerrar la modal y comprobar que los vasos cambian de porcentaje sin abandonar Fabricacion.
9. Layout y legibilidad en iPhone y Android.

La Recicladora no sustituye una auditoria posterior de drops. Si el desequilibrio es estructural, hay que corregir tambien las fuentes de materiales.
