# RACE Control · Campeonato de fin de semana para IA (formato decidido)

## Autoría y alcance
- El propietario crea los eventos **oficiales** desde su sesión de administrador de CraftRace en iPhone.
- La clasificación de **16 IA persistentes** es global, pero solo los eventos oficiales homologados pueden modificar el Elo.
- Las carreras ordinarias de humanos, las pruebas del Realizador y las partidas de exhibición **no** modifican el Elo mundial de las IA.
- Este documento describe un formato aprobado; la tabla global, la homologación segura y el blog quedan **pendientes de implementación**.

## Estructura fija (7 carreras, 28 salidas individuales)
1. **Sábado – clasificatorias A/B/C/D**: cuatro carreras de cuatro pilotos, con 16 participantes distintos. Clasifican los dos primeros de cada una, total 8.
2. **Domingo – semifinales 1/2**: dos carreras de cuatro. Clasifican los dos primeros de cada una, total 4.
3. **Domingo – gran final**: los cuatro clasificados disputan una carrera; **el primero en la meta es el campeón** del fin de semana.
- Sábado y domingo son la organización operativa predeterminada, sin horas fijas. La dirección puede programar horarios.
- El campeón del evento **no** tiene por qué ser el piloto con más Elo.

## Siembra por Elo inicial (congelada al abrir el campeonato)
Ordenar la clasificación global por Elo descendente, desempate estable por ID. Dividir en cuatro bombos de cuatro:
- A: seeds **1, 8, 9, 16**
- B: seeds **2, 7, 10, 15**
- C: seeds **3, 6, 11, 14**
- D: seeds **4, 5, 12, 13**

Cada clasificatoria recibe un piloto del bombo 1–4, otro del 5–8, otro del 9–12 y otro del 13–16.

### Semifinales automáticas
- S1: **A1 + B2 + C1 + D2**
- S2: **B1 + A2 + D1 + C2**
- Se evita repetir inmediatamente una rivalidad de clasificatoria: cada semifinal tiene exactamente un representante de cada clasificatoria.

### Gran final
- **S1-1 + S2-1 + S1-2 + S2-2**.
- El campeón se determina por resultado homologado de esa carrera, no por Elo histórico.

## Resultados y Elo
- Registrar por carrera orden, pilotos, tiempos totales y de vuelta; no clasificar empates automáticos sin criterio adjudicado.
- Congelar las cabezas de serie y las reglas del evento hasta terminarlo aunque cambie una clasificación externa.
- Diferenciar el **resultado deportivo** del evento de la **actualización Elo**: ambos se conservan, pero la segunda requiere homologación administrativa y validación de integridad en servidor.
- Aplicar cualquier cálculo Elo de manera transaccional e idempotente en el servidor una sola vez por evento/carrera según la política que finalmente se apruebe.
- Las carreras del Realizador DEV, ensayos locales y una segunda pulsación del administrador nunca deben contar otra vez.

## Publicación
RACE Control público: calendario del campeonato, cuadro de 7 carreras, participantes, clasificados, tiempos por vuelta, resultado final, cambio de Elo y crónica firmada por la dirección. El contenido del blog se publica solo tras aprobación humana.

## Estado del código
- `src/game/ai/craftraceAiWeekendChampionship.js`: creación de cuadro, siembra congelada, progresión sin duplicados, resultados y campeón en memoria.
- `scripts/craftrace-ai-weekend-championship-smoke.mjs`: pruebas de 4+2+1 carreras y controles de integridad.
- **Aún no conectado** a la pantalla RACE Control, Supabase, verificación oficial, publicación, blog ni clasificación Elo persistente.
