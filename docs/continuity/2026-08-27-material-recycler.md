# Continuidad 2026-08-27 - Recicladora de materiales

## Problema
En piezas Prototype se observa acumulacion desigual de materiales. Las recetas actuales piden una pieza Racing previa, 2400 de chatarra, 2100 del secundario de familia, 250 de compuesto y 84 de electronica. Por tanto un cambio 1 a 1 entre materiales seria incorrecto.

## Decision
Se incorpora una Recicladora en Tienda > Materiales. El jugador elige que material entrega, que material recibe y la cantidad. La conversion solo se ejecuta tras completar un video recompensado. No cuesta monedas.

## Valores internos iniciales
Chatarra 1.0. Aleacion, goma, disco, muelle y engranaje 1.2. Compuesto 8.0. Electronica 20.0.

La conversion conserva solo el 75 por ciento del valor. Esto evita arbitraje al convertir de un material a otro y volver.

## Limite
Tres intercambios por dia. El estado se guarda mediante materialExchangeDay y materialExchangeCount en garage state.

## Implementacion
Economia: src/game/store/materialExchange.js
UI: src/game/scenes/MenuMaterialExchangeScene.js
Cadena activa: MenuSeasonScene.js importa ahora MenuMaterialExchangeScene.js.

La UI muestra dos filas, ENTREGAS y RECIBES, con los ocho materiales y el stock actual. Hay presets 25, 100, 250 y MAX, una previsualizacion exacta del resultado, los intercambios restantes del dia y el boton de anuncio INTERCAMBIAR.

## Commits
Economia: 15923d61dc4308159c27b788df1fd8abfc313d6b
UI: 03eedd38a9895a6a12e67a88abb90d08f4b6ae59
Conexion activa: cfaf31d1f2749708da8a2bb8774255659ac6606e

## Validacion
Probar conversion de chatarra a compuesto y electronica, secundario a secundario, conversion inversa para comprobar perdida, limite diario, persistencia tras recarga y layout en iPhone y Android.

La Recicladora no sustituye una auditoria posterior de drops. Si el desequilibrio es estructural, hay que corregir tambien las fuentes de materiales.
