# Assets públicos de TopdownCraftrace

`public/assets/` es la única fuente oficial de assets públicos del juego.

Estructura recomendada:
- `cars/runtime/` — cartas/renders runtime existentes.
- `cars/workshop/` — renders limpios de coche para Factory/Craft Strip. Nombre exacto: `<carId>.webp`.
- `craft/items/` — componentes y piezas de crafting.
- `data/` — JSON públicos.
- `ui/` — interfaz.
- `audio/` — audio.
- `tracks/` — assets de circuitos.
- `fx/` — efectos.

No crear nuevas carpetas `/assets` fuera de `public/`. Vite copia `public/` al build y publica estos archivos con rutas `assets/...`.
