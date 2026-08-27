# CIRCUITO ATLÁNTICO — piloto de iluminación con normal map

Fecha: 2026-08-27

## Objetivo

Probar en un único circuito una mejora visual de asfalto con relieve aparente e iluminación dinámica 2D, sin tocar física, trazado, colisiones, cronometraje ni el renderer de los demás circuitos.

## Alcance

- Circuito piloto: `track01` (CIRCUITO ATLÁNTICO).
- Renderer: Phaser 3.90 / WebGL / `Light2D`.
- Albedo: `public/assets/materials/asphalt-pbr/albedo.png`.
- Normal map: `public/assets/materials/asphalt-pbr/normal.png`.
- Roughness permanece disponible en disco, pero NO se carga todavía porque `Light2D` no lo consume y mantenerlo en GPU no produciría ninguna mejora visible.
- Calidad BAJA y `__tdrIosSafeMode` conservan el renderer estándar para evitar coste extra.

## Implementación

Archivo: `src/game/scenes/RaceWorldAlignedMaterialsScene.js`.

Se carga albedo + normal como una única textura Phaser mediante el soporte nativo de normal maps. Al entrar en `track01`, se crea un `TileSprite` world-space limitado por la máscara exacta de pista y se aplica la pipeline `Light2D`.

La iluminación usa una fuente amplia situada fuera del mapa para imitar una dirección solar suave en vez de un foco local tipo linterna. El asfalto iluminado se superpone al asfalto estándar, dejando intactos el resto de elementos y sistemas.

La activación es aislada: si falla la textura, la máscara o la pipeline, la carrera conserva el asfalto estándar.

## Commit funcional

`1a85d1f091245de23c7bbf5c35d381d04e02ef09` — `feat: pilot normal-mapped asphalt lighting on Atlantico`

## Qué revisar en dispositivo

Entrar en CIRCUITO ATLÁNTICO con calidad MEDIA o ALTA y comprobar:

- si el grano/relieve del asfalto se percibe al variar la posición en pista;
- si desaparece o mejora el aspecto plano anterior;
- si reaparece moaré durante el zoom dinámico;
- estabilidad y fluidez en iPhone;
- que cualquier otro circuito permanece visualmente igual que antes.

Si el piloto visual funciona, la siguiente fase debe decidir cómo incorporar roughness de forma efectiva (shader/material propio o aproximación barata), no simplemente cargar el mapa sin utilizarlo.
