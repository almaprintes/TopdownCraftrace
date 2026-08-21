# ECONOMÍA 2.0 — TIENDA Y MONETIZACIÓN

Fecha: 2026-08-21
Estado: aprobado para implementación

## Objetivo

Acompañar el nuevo coste de fabricación —con requisitos de materiales significativamente mayores por categoría— con vías de aceleración opcionales, comprensibles y respetuosas con el jugador.

Principio central: monetizar aceleración y conveniencia, no bloquear la progresión ni vender directamente superioridad competitiva.

## Estructura de TIENDA

La tienda tendrá tres secciones principales:

1. **MATERIALES**
   - Packs comprados exclusivamente con monedas del juego.
   - Packs generales y/o especializados por familias de materiales.
   - Los materiales siguen pudiéndose conseguir jugando.

2. **MONEDAS**
   - Packs de monedas adquiribles mediante compra real en las versiones nativas.
   - Durante desarrollo/web se utilizará un proveedor simulado; la interfaz no debe depender del proveedor final de IAP.
   - Las cantidades y precios reales quedan pendientes de balance y validación antes de publicación.

3. **RECOMPENSAS**
   - Vídeo recompensado totalmente voluntario.
   - Recompensa inicial de referencia: +250 monedas.
   - Cooldown: una recompensa cada 4 horas.
   - Mostrar claramente si está disponible y, si no, cuenta atrás hasta la próxima disponibilidad.
   - No usar intersticiales forzados para sustituir este flujo.
   - Añadir también una recompensa gratuita diaria pequeña para favorecer el retorno sin exigir publicidad.

## UX

Pantalla horizontal coherente con la interfaz actual del juego.

Cabecera: TIENDA + saldo actual usando el asset oficial de moneda (`assets/ui/moneda-tdr.webp`).

Navegación simple:

`MATERIALES | MONEDAS | RECOMPENSAS`

Materiales: tarjetas grandes, asset real del material, contenido del pack y precio en monedas.

Monedas: tarjetas de packs de moneda; en desarrollo deben identificarse como simulación para no confundirlas con una compra real.

Recompensas: tarjeta protagonista de vídeo recompensado, premio visible y botón `VER VÍDEO`; tras reclamar, sustituir disponibilidad por contador `PRÓXIMA RECOMPENSA HH:MM:SS`.

## Arquitectura

Separar presentación, economía y proveedores externos.

- Store/economy service: catálogo, precios, entrega y persistencia.
- Purchase provider: interfaz abstracta para compras; simulación en web/desarrollo y proveedor nativo posteriormente.
- Rewarded ads provider: interfaz abstracta; simulación en web/desarrollo y AdMob Rewarded en builds nativas.
- El juego concede la recompensa del vídeo solo después de recibir confirmación de recompensa del proveedor.
- Persistir el instante de última recompensa para aplicar el cooldown de 4 horas.

## Balance

No congelar todavía precios reales ni cantidades definitivas de packs. Primero medir:

- materiales obtenidos por 10–20 minutos de juego;
- coste real de fabricación Street / Sport / Racing / Prototype;
- monedas obtenidas por sesión;
- tiempo medio necesario para fabricar cada categoría.

Después ajustar precios y packs para que jugar siga siendo la vía principal y la tienda una aceleración opcional.

## Integración futura

La implementación debe quedar preparada para IAP de iOS/Android y AdMob Rewarded sin acoplar la UI a SDKs concretos.

## Criterios de aceptación de la primera iteración

- Acceso visible a TIENDA desde el lobby.
- Tres pestañas funcionales.
- Compra de packs de materiales con monedas y actualización inmediata de inventario/saldo.
- Catálogo de packs de monedas visible con proveedor de desarrollo.
- Recompensa de vídeo simulada con +250 monedas y cooldown persistente de 4 horas.
- Recompensa diaria gratuita persistente.
- Uso del asset real de moneda en la interfaz.
- Diseño legible y usable en móvil apaisado.
