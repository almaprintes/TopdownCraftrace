# Continuidad — Atlántico Android y catálogo Beauty

## Diagnóstico

La beta `2441460b` ya ejecutaba el circuito con la identidad canónica
`circuito-atlantico`, pero el catálogo generado de terreno horneado todavía lo
registraba como `track01`. Por ello `getTrackBeautyLayerConfig()` devolvía
`null` únicamente para Atlántico y Android conservaba el renderizador antiguo
por celdas, overlays y máscaras.

Esa beta también activaba las tres superficies completas de Environment Studio
de Atlántico. Los otros tres circuitos publicados no declaran esos materiales.
La protección que evita esas superficies en Android ya existe en `main` desde
`03464974`.

## Corrección

- La única identidad de runtime y publicación es `circuito-atlantico`.
- El generador convierte el nombre histórico del manifest en la identidad
  canónica, conservando la carpeta de assets existente solo como ruta física.
- Las comprobaciones específicas de Atlántico usan también la identidad
  canónica.
- Cuando la capa horneada está activa se omite la presentación heredada de
  superficies por fotograma.
- El smoke check `check:track-beauty-identity` exige que los cuatro circuitos
  publicados resuelvan exactamente cuatro tiles optimizados y rechaza que
  `track01` reaparezca como clave de runtime.

La geometría, física, colisiones, cronometraje, decoración y assets horneados no
cambian.
