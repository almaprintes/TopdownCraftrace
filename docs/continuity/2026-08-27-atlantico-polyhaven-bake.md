# Continuidad — 2026-08-27 — Atlántico, Poly Haven y bake de terreno

## Estado
ATLÁNTICO / `track01` queda APROBADO como patrón visual y técnico del nuevo terreno.

La validación más fuerte se obtuvo en Android Redmi 11 con preset Alta: 60 FPS y sensación de juego superfluida. En iPhone el terreno horneado también mostró tiempos de render muy bajos; los tirones de iOS se consideran un problema distinto de frame pacing/WebKit y no una razón para degradar este sistema de terreno.

## Objetivo
Mejorar la calidad visual de las superficies de los circuitos usando materiales Poly Haven, manteniendo rendimiento móvil alto y presets gráficos simples para el usuario.

## Decisión arquitectónica DEFINITIVA
No usar TileSprites/chunks visuales como arquitectura final del terreno. Los chunks pueden seguir existiendo para geometría, lógica, física, detección y herramientas, pero NO deben ser la representación visual final de carrera.

El terreno estático se hornea offline y se muestra en runtime como un máximo de 4 superficies grandes por circuito. Para Atlántico, mundo 2430x2000, son 4 cuadrantes de 1215x1000.

Principio: Poly Haven es fuente de trabajo/bake, no dependencia de runtime del jugador. El jugador final recibe WebP ya horneados.

## Atlántico aprobado
Tres superficies:
- asfalto: Poly Haven `asphalt_02`, procesado para eliminar grietas largas reconocibles y conservar micrograno;
- hierba: Poly Haven `sparse_grass`;
- tierra/offroad: Poly Haven `rocky_trail_02`, brightness 0.78.

Escalas físicas aprobadas:
- roadCell: 205 px de mundo;
- roadMacroGrid: 4;
- macro del asfalto: 820x820 px de mundo;
- hierba: 1126 px de mundo;
- tierra: 983 px de mundo.

Cambiar 1K/2K/4K no debe cambiar la escala física aparente. Resolución fuente y escala del material son conceptos separados.

## Evolución del asfalto
La textura original tenía grietas largas que se repetían de forma demasiado evidente. Se probaron anti-repeat y reducción de contraste, pero no bastó. La versión aprobada reconstruye el material a partir de componente de baja frecuencia + microdetalle, eliminando las grietas largas de la base. Esto conserva lectura de asfalto sin crear patrones periódicos dominantes.

## Rendimiento observado
Con cuatro superficies grandes:
- ejemplos en iPhone Ultra: render del terreno alrededor de 0.6–0.8 ms en varias capturas;
- Android Redmi 11, preset Alta: 60 FPS estables y sensación superfluida;
- el terreno horneado deja de ser el principal cuello de botella.

Conclusión: no volver a chunks visuales para intentar solucionar problemas de iOS. Los tirones de iOS deben tratarse como frame pacing / WebKit / bucle de actualización.

## Generalización al resto de circuitos
Todos los circuitos usarán tres superficies conceptuales:
1. `road` — superficie de pista;
2. `shoulder` — franja/terreno cercano a la pista;
3. `outer` — terreno exterior.

Pero NO todos usarán los mismos materiales. Algunos circuitos compartirán configuraciones y otros tendrán combinaciones propias.

Regla de diseño:
- la arquitectura y el baker son comunes;
- la selección de los tres materiales, su escala y tratamiento pertenecen a cada circuito;
- no existe fallback visual automático que convierta todos los circuitos en copias de Atlántico.

## Nueva arquitectura de bake
### Biblioteca/configuración
`scripts/track-beauty-config.mjs`

Contiene:
- biblioteca reutilizable de materiales;
- configuración por circuito;
- escala física por superficie;
- brillo/tratamiento;
- revisión de assets.

Solo se añade un circuito cuando sus tres superficies han sido elegidas deliberadamente.

### Baker genérico
`scripts/bake-track-beauty.mjs`

Uso:
`node scripts/bake-track-beauty.mjs <trackKey>`

Lee el `track.json`, la configuración de materiales y genera:
- 4 WebP de terreno;
- preview;
- manifest completo con materiales, escalas, revisión y geometría.

### Compatibilidad Atlántico
`scripts/bake-atlantico-beauty.mjs` queda como wrapper de compatibilidad y llama internamente al baker genérico para `track01`.

### Catálogo runtime seguro
`scripts/build-track-beauty-catalog.mjs`

Reconstruye `src/game/tracks/trackBeautyLayers.generated.js` leyendo TODOS los manifests publicados en `public/assets/tracks/*/beauty/manifest.json`.

Esto es crítico: al hornear un circuito nuevo no se sobrescriben ni desaparecen los Beauty Layers anteriores.

### Workflow
`.github/workflows/bake-atlantico.yml` ya usa el baker genérico para `track01` y reconstruye el catálogo global después de publicar los cuatro WebP.

## Presets gráficos
La dirección UX sigue siendo cuatro presets automáticos:
- Rendimiento
- Medio
- Alta calidad
- Ultra

El usuario no ajusta parámetros técnicos uno por uno. La resolución/efectos internos pueden variar por preset, pero la escala física de las superficies no.

## Método para arreglar el resto
Para cada circuito:
1. abrirlo y observar su carácter visual;
2. escoger `road`, `shoulder` y `outer` de la biblioteca o añadir materiales nuevos;
3. decidir escala física y, si hace falta, brillo/tratamiento;
4. añadir su entrada a `TRACK_BEAUTY_CONFIGS`;
5. ejecutar bake;
6. probar en dispositivo real;
7. ajustar solo ese circuito;
8. congelar la combinación cuando quede aprobada.

Esto permite reutilizar combinaciones completas o solo una de las superficies sin duplicar código.

## Principio visual
No buscamos que todos los circuitos tengan exactamente la misma textura. Buscamos que todos tengan la misma calidad técnica y que cada uno pueda tener personalidad propia.

Atlántico es el patrón de calidad y rendimiento, no la plantilla estética obligatoria.

## Commits de generalización
- configuración por circuito/materiales: `d30addee34082484fa345ad698b7fec6521230ce`
- baker genérico: `5e42acec2615d10f48fea7ba3dfd7a032d978b60`
- catálogo global desde manifests: `357bbd29d91e2bf7a4e4efe21b10a2cb1cf097f8`
- wrapper Atlántico sobre baker genérico: `de5f6e963fb322ab69393d4dbe8e10f2f67501ae`
- workflow Atlántico adaptado al pipeline genérico: `d748fbd4d37fc664cd2bb0c87197d98eec32667c`

## Próximo paso
Elegir el siguiente circuito y trabajar únicamente sus tres superficies. No modificar Atlántico salvo regresión objetiva.
