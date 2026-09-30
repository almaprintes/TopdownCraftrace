# TDR Track Advertising System (TAS)

**Estado:** procedimiento aprobado para implementación  
**Objetivo:** convertir superficies publicitarias de los circuitos en soportes reemplazables, sin modificar el circuito ni requerir cambios de código para cambiar de anunciante.

## Principio obligatorio

La publicidad **nunca se hornea en el fondo del circuito**. Cada soporte publicitario es un objeto/capa independiente con un identificador estable. El circuito define dónde está el soporte; la campaña define qué creatividad muestra.

Una vez implantado TAS, cambiar de AlmaPrint a otra marca debe consistir en sustituir/seleccionar assets de campaña, no editar escenas ni lógica del juego.

## 1. Tipos iniciales de soporte

| Tipo | ID sugerido | Proporción base | Uso |
|---|---|---:|---|
| Valla panorámica | BILLBOARD | 4:1 | grandes curvas/rectas |
| Banderola vertical | FLAG | 1:3 | vallados y zonas de público |
| Barrera | BARRIER | 6:1 | lateral de pista |
| Pórtico | GANTRY | 5:1 | sobre pista/meta |
| Panel lateral | TRACKSIDE | 3:1 | soporte general |

Las proporciones son plantillas; una escena puede declarar variantes si su perspectiva exige otra geometría.

## 2. Identificación de slots

Cada superficie tendrá ID único y predecible:

```
<trackId>__<type>__<nn>
tenerife__billboard__01
tenerife__flag__01
tenerife__flag__02
```

No se reutilizan IDs para superficies diferentes.

Cada slot registra como mínimo:

```js
{
  id: 'tenerife__billboard__01',
  type: 'BILLBOARD',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  creative: 'billboard'
}
```

## 3. Estructura propuesta

```
public/assets/advertising/
  templates/
    billboard.webp
    flag.webp
    barrier.webp
    gantry.webp
    trackside.webp
  campaigns/
    default/
      campaign.json
      billboard.webp
      flag.webp
      barrier.webp
      gantry.webp
      trackside.webp
    almaprint/
      campaign.json
      billboard.webp
      flag.webp
      barrier.webp
      gantry.webp
      trackside.webp
```

Las plantillas son neutras/blancas y sirven para crear creatividades sin tocar código.

## 4. campaign.json

Ejemplo:

```json
{
  "id": "almaprint",
  "name": "AlmaPrint",
  "version": 1,
  "assets": {
    "BILLBOARD": "billboard.webp",
    "FLAG": "flag.webp",
    "BARRIER": "barrier.webp",
    "GANTRY": "gantry.webp",
    "TRACKSIDE": "trackside.webp"
  }
}
```

En la primera implementación, una campaña podrá aplicarse a todos los slots de un circuito. El diseño debe permitir posteriormente asignar campañas por slot sin rehacer el sistema.

## 5. Procedimiento para crear una campaña sin ayuda

1. Duplicar la carpeta de campaña `default`.
2. Renombrarla con un ID en minúsculas, sin espacios.
3. Abrir las plantillas de los soportes necesarios.
4. Colocar logo, texto o creatividad respetando exactamente el lienzo/proporción.
5. Exportar como WebP conservando el nombre del soporte.
6. Actualizar `id`, `name` y `version` en `campaign.json`.
7. Seleccionar la campaña para el circuito.
8. Validar visualmente que ninguna creatividad invade pista, HUD o zonas de conducción.

**Resultado esperado:** cambiar una campaña no exige modificar JavaScript.

## 6. Procedimiento para añadir soportes a un circuito

1. Identificar zonas visibles que no interfieran con conducción.
2. Elegir tipo de soporte.
3. Colocar primero el asset neutro.
4. Asignar ID único.
5. Registrar posición, escala, rotación/profundidad.
6. Comprobar en móvil que el soporte sigue siendo legible.
7. Probar `default` y `almaprint`.
8. Solo entonces declarar el slot homologado.

## 7. Reglas de arquitectura

- Una sola fuente de verdad para campañas y slots.
- Prohibido crear listas manuales distintas en varias escenas.
- Prohibido incrustar marcas comerciales en fondos prerenderizados.
- Los slots deben sobrevivir a cambios de campaña sin recolocación.
- Un asset ausente debe caer en `default`, nunca romper el circuito.
- La carga de publicidad no puede bloquear el arranque de una carrera.
- Las creatividades no alteran físicas, colisiones ni trazado.
- Mantener los assets optimizados para móvil.
- Toda campaña tendrá versión para invalidar caché.
- El sistema debe poder desactivarse y mostrar soportes neutros/TDR.

## 8. Primera prueba: AlmaPrint

La primera campaña real de validación será **AlmaPrint**.

Prueba mínima:
- 1 BILLBOARD grande.
- 2 FLAG.
- 1 BARRIER o TRACKSIDE.
- Todos alimentados desde la misma campaña.
- Cambiar `almaprint` → `default` debe sustituirlos sin editar el circuito.

Si esto requiere modificar cada cartel a mano, TAS no está terminado.

## 9. Fase posterior: gestión comercial

No implementar todavía, pero preservar compatibilidad con:
- patrocinador exclusivo por circuito;
- campaña por temporada/evento;
- distintos anunciantes por slot;
- fechas de inicio/fin;
- campañas locales o promocionales;
- panel interno para activar campañas;
- métricas de exposición agregadas, respetando privacidad;
- fallback automático al branding TDR.

## 10. Checklist de homologación

Una implementación TAS se considera válida únicamente si:

- [ ] Las superficies están separadas del fondo.
- [ ] Los IDs son únicos.
- [ ] Existe fallback neutro/default.
- [ ] AlmaPrint puede sustituir todos los soportes definidos.
- [ ] Cambiar campaña no requiere tocar JS.
- [ ] No afecta físicas ni input.
- [ ] No introduce errores si falta una creatividad.
- [ ] Funciona en Android/iPhone.
- [ ] Los assets respetan tamaño/proporción establecidos.
- [ ] El cambio de campaña es suficientemente sencillo para hacerlo manualmente sin asistencia.

## 11. Ley TAS

> **El circuito posee los espacios; la campaña posee las imágenes. Nunca al revés.**

Esta separación es obligatoria para cualquier nuevo soporte publicitario de Top Down RACE.
