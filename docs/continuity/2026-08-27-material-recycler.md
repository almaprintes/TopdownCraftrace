# Continuidad 2026-08-27 - Recicladora de materiales

## Estado
CERRADO Y VALIDADO visual y funcionalmente el 27/08/2026.

La prueba real confirma el flujo completo: desde un vaso incompleto de Fabricacion se abre la Recicladora sobre la misma escena, el material se preselecciona en RECIBES, se realiza la conversion y, al cerrar, los vasos muestran inmediatamente el inventario actualizado.

## Problema que resuelve
En piezas Prototype se observa acumulacion desigual de materiales. Las recetas actuales piden una pieza Racing previa, 2400 de chatarra, 2100 del secundario de familia, 250 de compuesto y 84 de electronica. El jugador puede acumular mucho de un recurso mientras otro bloquea una fabricacion.

Esto no debe resolverse con un intercambio 1:1 porque los materiales tienen valores y escasez diferentes. Tampoco interesa que un desequilibrio de drops se convierta simplemente en frustracion o en una compra forzada.

## Decision economica
Se incorpora una Recicladora de materiales. El jugador entrega excedentes y recibe el material que necesita. La conversion solo se ejecuta tras completar un video recompensado y no cuesta monedas.

Valores internos iniciales:
- Chatarra 1.0.
- Aleacion, goma, disco, muelle y engranaje 1.2.
- Compuesto 8.0.
- Electronica 20.0.

La conversion conserva el 75 por ciento del valor. La UI lo explica como `COMISION DE RECICLAJE: 25% - protege el valor de los materiales`. La perdida evita arbitraje al convertir de un material a otro y volver.

Limite: tres intercambios por dia. El estado se guarda mediante materialExchangeDay y materialExchangeCount en garage state.

## Por que funciona para juego y monetizacion
La Recicladora convierte un posible punto de frustracion en una decision del jugador:
- permite terminar una pieza usando excedentes reales;
- no regala materiales ni destruye su valor;
- el 25% de perdida protege la economia;
- el limite diario impide usarla como fuente principal de materiales;
- el video recompensado monetiza una accion que el jugador elige voluntariamente;
- no obliga a gastar monedas para corregir un desequilibrio que puede proceder del propio diseño de drops.

El sistema complementa la tienda y los drops; no los sustituye.

## UX final
La primera UI ocupaba casi toda la pantalla y mostraba los ocho materiales dos veces. Aunque era funcional, obligaba a utilizar textos demasiado pequenos.

Se sustituyo por una modal compacta y legible con:
- ENTREGAS: selector grande con material, stock y valor.
- RECIBES: selector grande con material, stock y valor.
- flecha central de conversion.
- cantidad mediante presets 25 / 100 / 250 / MAX.
- resumen exacto `X material -> Y material`.
- explicacion visible de la comision del 25%.
- contador de intercambios diarios.
- boton `VER VIDEO E INTERCAMBIAR`.

Principio UX adoptado: si una pantalla solo cabe reduciendo el texto hasta resultar incomodo, hay que simplificar la interfaz, no encoger la tipografia.

## Accesos
### Tienda
La Recicladora sigue disponible desde Tienda > Materiales mediante el boton RECICLADORA. Aqui ambos desplegables son libres.

### Fabricacion contextual
Los vasos de materiales incompletos de Fabricacion son pulsables. Al tocar uno se abre la Recicladora como modal SOBRE LA MISMA escena de Fabricacion; no se navega al menu ni se pierde la pieza seleccionada.

El vaso tocado se preselecciona automaticamente como material RECIBES. El jugador puede cambiar tanto ENTREGAS como RECIBES mediante desplegables.

Al cerrar la modal se recarga el estado del garaje y se vuelve a renderizar Fabricacion para que los vasos reflejen inmediatamente el nuevo inventario.

## Validacion real observada
Caso probado en Fabricacion / Sequential Prototype:
- se abre la Recicladora desde el vaso de Engranaje;
- RECIBES aparece como ENGRANAJE;
- ejemplo mostrado: 250 CHATARRA -> 166 ENGRANAJE;
- la UI muestra claramente `COMISION DE RECICLAJE: 25%`;
- tras ejecutar el intercambio, el contador diario pasa a 2/3;
- al cerrar, Fabricacion permanece en la misma pieza;
- el stock y porcentaje de los vasos se actualizan inmediatamente.

La integracion contextual se considera aprobada.

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

## Seguimiento futuro de economia
La Recicladora no sustituye una auditoria de drops. Hay que medir en pruebas prolongadas:
- materiales que se acumulan sistematicamente;
- materiales que bloquean recetas con demasiada frecuencia;
- numero medio de intercambios usados por jugador/dia;
- materiales origen y destino mas frecuentes;
- si el limite de 3/dia y la eficiencia del 75% mantienen utilidad sin trivializar la progresion.

Si el desequilibrio es estructural, se corrigen tambien las fuentes de materiales; no se compensa indefinidamente mediante la Recicladora.

## Como contarlo al jugador
Mensaje corto recomendado para onboarding/notas de actualizacion:

`¿Te sobra material y te falta justo el que necesitas? Recicla tus excedentes directamente desde Fabricacion. Elige que entregas, recibe el material que te falta y completa el intercambio viendo un video. La recicladora aplica una comision del 25% para proteger el valor de los materiales y permite hasta 3 intercambios al dia.`

La clave de comunicacion es presentarlo como una herramienta de aprovechamiento de excedentes y control del jugador, no como una forma de obligarlo a ver anuncios.
