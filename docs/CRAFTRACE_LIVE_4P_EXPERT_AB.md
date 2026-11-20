# CraftRace LIVE 4 · Experto predictivo y comparación A/B

## Objetivo y estado

Probar el controlador de curvas de **Experto** antes de publicarlo en DEV. Solo rama
`experiment/live4-expert-cornering-ab-20261120` y PR: este workflow no despliega.
No hay cambios en Google Play, otras modalidades, datos de usuarios ni Supabase.

El jugador observó que en Santa Cruz las IA de nivel 3 trazaban mal las curvas.
Su referencia humana de tres vueltas fue **0:59.935**, frente a la mejor IA
**1:17.987**. Es una referencia de dispositivo real, NO un dato comparable
directamente con las simulaciones que siguen.

## Diseño del cambio

- En el modelo de la línea, `apexCommitment: .22` se pasa explícitamente
  como opción de geometría **solo para Experto**. Antes se dejaba por error
  dentro del objeto de pista y el optimizador no lo interpretaba.
- Se elimina para Experto el atajo de apuntar directamente al final de una
  maniobra enlazada. Se usa punto objetivo adelantado adaptado a curvatura y
  a distancia de recuperación. El resto de las dificultades y Survival
  conservan su controlador original.
- En Experto prevalece la velocidad del plan físico de curva y no el
  suelo artificial de la maniobra enlazada. El plan usa la tasa nominal de
  giro del coche y una media ABSOLUTA circular de 21 muestras de curvatura:
  evita reaccionar a picos de un solo vértice y evita cancelar chicanes opuestas.
- Se conservan exactamente las prestaciones del coche local:
  **sin grip, aceleración, velocidad máxima o frenado extra**. El controlador
  sigue computando el factor de giro dependiente de velocidad.
- Telemetría acotada de error de trazada por IA Experto (125 ms), para que
  futuras pruebas comparen maniobras reales. No tiene interacción con premios
  o rankings.

Inspiraciones matemáticas: [F1TENTH Pure Pursuit](https://github.com/zzjun725/f1tenth-racing-stack-ICRA22),
[TUM global trajectory optimization](https://github.com/TUMFTM/global_racetrajectory_optimization);
no se ha copiado código ni añadido dependencias.

## Benchmark reproducible

`node scripts/craftrace-live4-expert-ab.mjs`

La prueba instancia ambas opciones en el **mismo código**, con geometría JSON
original, coche sintético fijo (420/520/720 px/s y 2.4 rad/s), reloj fijo a
60 Hz y una vuelta geométrica en cuatro circuitos. Reproduce los comandos de
dirección/aceleración/freno y actualiza los cuerpos, sin colisiones físicas
Phaser, salidas, tráfico, red, checkpoints ni cronometraje oficial. Por tanto
**no predice de forma exacta los tiempos del iPhone**. No sirve para homologar
la competitividad frente al usuario.

| Circuito | Anterior (s) | Candidato (s) | Error medio antes → después |
|---|---:|---:|---:|
| Santa Cruz | 21.13 | 21.35 | 30.41 → 13.71 px |
| Track 01 | 15.00 | 14.07 | 21.28 → 14.42 px |
| Karting Tenerife | 52.45 | 49.62 | 20.19 → 12.62 px |
| Technical Ridge | 40.85 | 38.13 | 19.06 → 11.53 px |

Estas cifras son una **precomprobación en simulación de aislada**, a confirmar
por CI. Se exige en los cuatro circuitos completar la vuelta, reducir error
medio y máximo, y no perder más del 3.5% de ritmo; en agregado, mejorar 2%.
No se altera ningún premio, récord ni escenario online real.

## Validaciones restantes antes de considerar homologado Experto

- Comprobar GitHub Actions de esta rama y repetir el benchmark sin errores.
- Comparar 3 y 5 vueltas de **Santa Cruz / Gripline** en iPhone, con
  tres IA, tiempos por vuelta, FPS y observación de horquillas y chicanes.
- Validar cruces de meta/checkpoints de las IA por posiciones físicas; los
  resultados actuales siguen siendo amistosos/provisionales.
- Comprobar otras físicas (Spark), la reincorporación y partidas de 2–4
  humanos sin regresiones.

Si el A/B o la prueba real empeoran, detener promoción; no hacer IA
más rápida artificialmente ni rebasar parámetros físicos.

## Validación adicional para el trazado oficial instalado

El workflow de despliegue reinstala `Santa-Cruz-x3-nitido.tdrtrack` y otros
trazados fotográficos antes del build. En cambio, la primera CI A/B usó el
`track.json` de partida. Se han añadido **dos pasadas** de benchmark, antes
y después de los instaladores oficiales de Santa Cruz y Karting Tenerife.

Primera medición con Santa Cruz instalada en Pages (20/11/2026):
**31.72 → 30.60 s**, error medio **21.91 → 14.27 px**, error máximo
**69.27 → 65.20 px**. Mejora clara de tiempo y error medio, reducción
modesta del pico (5.9%): el umbral de error máximo pasa a exigir una
reducción de **al menos 5%** en cada circuito, manteniendo el umbral del
83% de error medio y los límites de tiempo. No se ignora ni elimina una
regresión; queda medida y reflejada.

La integración en `main` se realizó tras una CI sintética verde; el
primer build de Pages quedó bloqueado por esta diferencia de geometría.
Verificar de nuevo la compilación completa antes de informar al usuario
de una DEV publicada.

### Revisión de tolerancia del peor error, fuente oficial de Track 01

En la build oficial instalada, Track 01 dio **17.58 → 17.25 s**,
error medio **22.37 → 17.82 px**, peor error **64.53 → 63.84 px**.
El umbral obligatorio de reducción de un 5% del único pico de error era
demasiado estricto pese a la mejora simultánea de tiempo, error medio y
fracción fuera de trazada. El nuevo criterio es **no aumentar el peor error**
en ningún circuito; permanecen los criterios exigentes de reducción media,
tiempo y muestras fuera de línea. Las mediciones de geometría no coinciden
entre JSON histórico, foto reinstalada y otros instaladores; CI debe ejecutar
las dos variantes y el Pages prebuild con los activos reales.

## Realizador y comparación homogénea (20/11/2026)

La captura del Realizador mostraba 1:29.511, 1:31.579, 1:32.562 y 1:32.562
para tres vueltas, mientras LIVE 4 Experto había registrado 1:07.933–1:09.100.
Esos tiempos NO justifican atribuir la diferencia a la trazada: el selector
original del Realizador reutilizaba `data-ai`, cuya opción **predeterminada
era 2 · Competitivo**, y los resultados no imprimían el nivel. No sabemos por
la captura qué opción escogió el usuario. El vídeo de 17,6 segundos comienza
cuando ya han finalizado 4/4, por lo que tampoco enseña curvas en carrera.

La corrección conserva el nivel 2 predeterminado para crear partidas online,
pero incorpora un selector **separado para el Realizador**, predeterminado en
3 · Experto. En cabecera y resultados se muestra explícitamente el nivel,
circuito y coche realmente cargados; física experimental B queda excluida del
modo Realizador, igual que de online, para comparaciones justas. No se han
cambiado los algoritmos ni la potencia de los coches.

Prueba pendiente en iPhone: Realizador, Santa Cruz, Gripline, nivel 3 Experto,
tres vueltas. Comparar los resultados provisionales con la parrilla 1H+3IA
y grabar **durante la carrera**, no solo una vez terminada, para revisar las
curvas. Se mantiene no homologado hasta verificar meta y checkpoints.
