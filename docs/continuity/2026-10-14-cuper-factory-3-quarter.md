# CROWN Cuper — fábrica y skins · DEV 1.2.196

La FÁBRICA utiliza las vistas **tres cuartos** proporcionadas por el propietario. NO generar ni utilizar perfil lateral ortográfico.

- Original: `public/assets/cars/workshop/crown_cuper.webp`
- Gold Edition: `public/assets/cars/workshop/crown_cuper_gold.webp`

Los dos recursos se derivan del área **derecha** de los montajes de referencia. Conservar encuadre y diseño de ambos, sin reconstruir la carrocería.

La selección de skins es exclusiva del **garaje del jugador**, con una sola identidad `crown_cuper`. El Admin Hub edita geometría/colocación; no equipa skins al jugador. La fábrica muestra la skin equipada y cae en cascada a Original cuando falta la tres cuartos de la variante y, temporalmente, a la vista cenital original si tampoco existe la de fábrica. Las otras 17 fichas conservan su asset de fábrica existente.

Para añadir las dos imágenes de fábrica al repositorio sin reconstrucción:
1. Extraer la vista derecha de cada imagen de referencia.
2. Convertir a WebP; no cambiar perspectiva.
3. Subirlas bajo `public/assets/cars/workshop/` con los nombres indicados.
4. Mantener GitHub Actions Build + Deploy en verde para el HEAD exacto de `main`.

Los dos cenitales del Cuper subidos inicialmente sin prefijo se reutilizan en GitHub mediante alias de blob, sin modificar sus bytes, en `public/assets/skins/skin_crown_cuper_{original,gold}.webp`.
