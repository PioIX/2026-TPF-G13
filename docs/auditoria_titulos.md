# Auditoría integral del sistema de títulos y premios — "El Trayecto" (G13)

Fecha: 2026-11-05. Alcance: `Titulo`, `TituloIndividual`, `TituloInternacional`,
`TituloGanado`, el motor de títulos de `backend/index.js`
(`procesarTitulosTemporada`) y su visualización en el frontend.

## 1. Cómo funciona realmente el sistema (investigación previa)

- Cada turno = una temporada (`posicion_actual` es el número de temporada).
- Al cerrar un turno, `procesarTitulosTemporada` (backend/index.js) hace
  **un sorteo por categoría**:
  1. **Colectivo**: probabilidad `0.07 + (jerarquia-1)*0.12`; el club compite
     por trofeos de `Titulo` cuyo `prestigio <= jerarquia` del club.
  2. **Internacional**: probabilidad `0.04 + (jerarquia-1)*0.07`; se filtran
     los torneos de `TituloInternacional` por confederación y convocatoria.
  3. **Individual**: probabilidad en función de la nota de rendimiento y de
     goles/asistencias por partido; se sortea entre premios de
     `TituloIndividual`.
- Todo título ganado se registra en `TituloGanado`
  (`id_titulo` / `id_titulo_individual` / `id_titulo_internacional` +
  `temporada` + `puntos_obtenidos`) y suma sus `puntos_campeon` a
  `ParticipantePartida.puntos_campeon` (liquida una sola vez por registro).
- El frontend muestra los títulos del turno en `PopupTitulo` y los datos de
  carrera (`cantidad_titulos`, `puntos_campeon`, último título) en
  `PanelJugador`, alimentados por los LEFT JOINs de la ruta de estado.
- Significado real de las columnas de `TituloInternacional` (verificado en código):
  - `tipo_seleccion`: 1 = torneo de selecciones (exige convocatoria activa),
    0 = torneo de clubes.
  - `continente`: alcance geográfico del torneo de SELECCIONES ("Mundial" =
    cualquier selección).
  - `continente_club`: confederación exigida al CLUB para torneos de clubes.
  - `jerarquia_minima`: jerarquía (1-5) mínima del club para competir
    (Champions 3, Europa League 2, Mundial de Clubes 4). Sin NULL-check al
    revés: el SQL ya excluye torneos por encima de la jerarquía del club.
  - `requiere_titulo_id`: existe la columna pero **el código no la usa** — las
    dependencias ahora están implementadas en el módulo de reglas (ver §3).

## 2. Bugs encontrados y corregidos (backend)

### B1 (crítico). Títulos nacionales inganables
`WHERE pais = (SELECT liga FROM Club ...)` comparaba el **país** del título con
la **liga** del club: "Brasileirão" ≠ "Brasil", "MLS" ≠ "Estados Unidos", etc.
Solo Argentina (cuya liga casualmente contiene el nombre del país) tenía sus
títulos disponibles. Ahora la liga se traduce a país con `MAPA_LIGA_A_PAIS`
(`backend/modulos/titulos.js`) y la elegibilidad se evalúa con reglas.

### B2 (crítico). Champions League para un club de CONMEBOL
Caso real en producción: participante 117 (club del Brasileirão, Brasil) ganó
la UEFA Champions League (TituloGanado 41). Ocurría cuando `continenteClub`
llegaba null (datos incompletos) y el filtro la dejaba pasar. Ahora:
- El continente del club es obligatorio para torneos de confederación
  (sin dato = no participa; la migración completa `Club.continente` para
  todas las ligas cargadas).
- El módulo normaliza acentos (la comparación sin normalizar también podía
  fallar por codificación).

### B3 (grave). Premios individuales otorgados "por sorteo puro"
Antes cualquier premio podía salir para cualquier jugador:
- **Arqueros** (Guante de Oro del Mundial id 8, Lev Yashin id 16, Mejor
  Arquero del Año id 30): el juego NO registra la posición del futbolista,
  así que un jugador de campo podía ganar el Yashin. **Decisión del
  proyecto: los tres premios se ELIMINAN de la base** (migración §0, que
  limpia primero las referencias en TituloGanado y ParticipantePartida).
  El módulo conserva además un filtro por nombre (guante de oro / yashin /
  arquero) como defensa si un administrador vuelve a crear uno.
- **Premios del Mundial** (Mejor Jugador, Bota de Oro, Mejor Joven, Guante):
  exigían convocatoria — ahora `convocadoConSeleccion` es obligatorio.
- **Goleadores**: ahora exigen un mínimo de goles de la temporada
  (`GOLES_MINIMOS_GOLEADOR = 8`) y la competición correcta (Champions → club
  europeo, Libertadores → club sudamericano, Mundial → convocado).
- **Juveniles**: Golden Boy, Trofeo Kopa y Mejor Jugador Joven ahora exigen
  ≤ 21 años (límite real de esos premios; antes 22 para "joven" y sin límite
  para Kopa/Golden Boy). Caso real corregido: participante 117 ganó el Kopa a
  los 24 años.
- **Golden Boy/Kopa exigen club europeo** (son premios de la prensa italiana
  y de France Football respectivamente, con planta europea).
- **Puskás** exige haber convertido al menos un gol.

### B4. Duplicados históricos re-sorteados
Los ids 1 ("Balón de Oro", 30 pts) y 3 ("Bota de Oro Europea", 22 pts)
duplican a 28 (Balón de Oro, 250→ver §5) y 31. Antes los DOS podían salir:
un jugador podía recibir "dos Balones de Oro" en carreras distintas por
escalas distintas. Ahora los históricos están congelados
(`EXCLUIDOS_DEL_SORTEO = {1, 3, 8, 16, 30}`), conservando el historial de
`TituloGanado` (la migración los renombra con el sufijo "(histórico)").

### B5. Supercopa sin clasificación
Antes la Supercopa Argentina salía del mismo bombo que la liga: cualquier club
argentino podía "ganarla" sin haber clasificado. Ahora exige haber sido
campeón (liga o copa del MISMO país) la temporada inmediatamente anterior.

### B6. Mundial de Clubes / Copa Intercontinental sin diferenciación
- 22 "Mundial de Clubes de la FIFA" → **formato anual clásico** (campeones
  continentales; renombrado "(formato anual)").
- 23 "Copa Intercontinental de la FIFA" → partido anual del campeón de la
  Libertadores vs el de la Champions (regla igual: campeón continental).
- 28 "Copa Mundial de Clubes" → **formato ampliado** (32 equipos, 2025+;
  renombrado "(formato ampliado)", mantiene jerarquia_minima 4).
Ambos 22 y 23 exigen ahora un título continental de clubes previo (24-27).

### B7. Finalissima y Olímpico sin requisitos
- **Finalissima (20)**: exige haber ganado un torneo continental de
  selecciones (ids 8, 11, 12, 14, 16, 18, 29, 30) — es campeón de América vs
  campeón de Europa.
- **Olímpico (3)**: exige ≤ 23 años (regla sub-23 del torneo).

### B8. Duplicación de registros en TituloGanado
`registrarTitulo` insertaba sin verificar: dos ejecuciones en la misma
temporada podían duplicar el título (y duplicar puntos). Ahora hay un
`SELECT COUNT` previo (mismo participante + temporada + título).

## 3. Nueva arquitectura de reglas

- **`backend/modulos/titulos.js`** (nuevo): funciones puras de elegibilidad,
  testeables sin base de datos:
  - `elegibleTituloColectivo({ titulo, ligaClub, jerarquia, titulosPrevios, temporada })`
  - `elegibleTituloInternacional({ titulo, continenteClub, idSeleccion, continenteSeleccion, titulosInternacionalesPrevios, edad })`
  - `elegibleTituloIndividual({ titulo, edad, ligaClub, continenteClub, golesNuevos, convocadoConSeleccion })`
  - `MAPA_LIGA_A_PAIS`, `EXCLUIDOS_DEL_SORTEO`, constantes documentadas.
- **`backend/index.js`**: `procesarTitulosTemporada` ahora consulta el
  historial del participante (una sola query) y delega el filtrado en el
  módulo. Las probabilidades y el mérito de sorteo NO cambiaron (no se toca
  el balance del juego, solo la elegibilidad).

## 4. Reglas de selecciones (resumen)

- Sin convocatoria real esa temporada (`idSeleccion` null desde el caller si
  no jugó) → ningún título de selecciones.
- Torneo continental: la confederación de la selección debe coincidir
  (Argentina no gana la Eurocopa).
- Mundial / Copa Árabe: cualquier selección convocada.
- Olímpico: sub-23. Finalissima: campeón continental vigente.

## 5. Puntuación y prestigio (correcciones justificadas)

Valores conservados salvo incoherencia demostrable en `TituloIndividual`
(solo si el premio no fue ganado todavía con el valor viejo — la migración
lo verifica, para no tocar historiales):

| id | premio | antes | ahora | justificación |
|----|--------|-------|-------|---------------|
| 26 | Goleador de la Liga (Pichichi) | 80 | 15 | daba MÁS que la Champions (20) y el Balón de Oro histórico (30); escalado como el resto de goleadores por liga (20/15) |
| 27 | Mejor Jugador de la Temporada | 120 | 22 | fuera de toda la escala del sistema (max 30) |
| 29 | Mejor Jugador Joven | 70 | 12 | idem; alineado con Golden Boy (15/12) |
| 30 | Mejor Arquero del Año | 70 | 12 | idem (premio congelado, valor solo para historiales futuros) |
| 31 | Bota de Oro | 150 | 22 | igualado a la Bota de Oro Europea (22) |

`Titulo` y `TituloInternacional` NO cambiaron puntos ni prestigio (no había
incoherencia demostrable).

## 6. Imágenes

- **Supercopa Argentina (id 10)**: tenía el escudo de la **Supercopa de
  España (RFEF)** — corregido con la imagen del trofeo real de la Supercopa
  Argentina (Wikimedia Commons, verificado 200 `image/png`).
- **Balón de Oro (ids 1 y 28)**: foto del trofeo en el museo del Real Madrid
  (CR7Museum) — es el trofeo real, se conserva.
- **Goleador de la Liga (id 26)**: la imagen era el **trofeo Pichichi**;
  renombrado "Máximo Goleador (Pichichi)" para que nombre e imagen coincidan.
- **Mejor Jugador Joven (id 29)**: foto de un futbolista (Lamine Yamal) →
  `NULL` en la migración pendiente de imagen verificada (fallback 🏆).
  Lo mismo para **Mejor Arquero del Año (id 30)** (foto de Unai Simón).
  Nota: Wikimedia limitó el sondeo automatizado (429) durante la auditoría,
  por lo que solo se actualizaron las URLs que se pudieron verificar con
  respuesta 200 image/*; el resto usa el fallback.
- **31 registros con imagen NULL** (la mayoría de los títulos nacionales y
  premios): muestran el fallback 🏆 en el frontend.
- **Fallback visual**: `PopupTitulo.js` ahora maneja `onError` del `<Image>`
  (`imagenRota` → 🏆), así una URL que deje de funcionar nunca rompe el perfil.

## 7. Base de datos (`docs/auditoria_titulos_migracion.sql`, idempotente)

- Aplicada y verificada contra `2026_5INF_G13`.
- No borra ni combina registros: renombra duplicados históricos (1, 3) y
  aclara los dos Mundiales de Clubes (22, 28) por sufijo.
- Rellena `Club.continente` faltante (0 clubes sin continente al finalizar).
- Ajustes de puntos condicionados a que el valor viejo no esté en historial.

## 8. Frontend

- `PopupTitulo.js`: fallback `onError` en el componente `Trofeo`.
- No se cambió el diseño ni textos existentes.

## 9. Pruebas (`backend/scripts/test_titulos.js` — 56/56 OK)

Nacionales, internacionales de clubes (confederaciones), selecciones
(convocatoria/continente/edad/Finalissima), individuales (goleadores,
arqueros, juveniles, Mundial, Puskás, duplicados), mapa liga→país.
Verificación contra el caso real de producción: participante 117
(Brasileirão + Champions, Kopa a los 24) → ambos escenarios ahora BLOQUEADOS.

## 10. Limitaciones documentadas

1. **Posición del futbolista no registrada**: los premios de arqueros fueron
   eliminados de la base (decisión del proyecto). Si en el futuro el modelo
   registra la posición, se pueden volver a crear con el filtro por nombre
   ya listo en el módulo de reglas.
2. **Comparación contra otros jugadores**: el modelo no lleva tabla de goles
   por competición; los premios de goleador exigen producción propia mínima
   (≥ 8 goles) y competición correcta, pero no comparan contra el resto.
3. **Cambio de asociación deportiva**: no modelado (el juego tiene una
   nacionalidad por partida).
4. **Sondeo de imágenes**: automatización limitada por rate-limiting de
   Wikimedia; las URLs no verificadas quedan en NULL con fallback.
5. **`requiere_titulo_id`**: la columna existe pero las dependencias se
   implementaron en código (módulo de reglas); la columna queda sin uso y
   sin datos, sin agregar complejidad.
6. **Participación efectiva en copas (posiciones de liga que clasifican)**:
   el juego no simula tablas de posiciones; la clasificación continental se
   aproxima con la jerarquía del club (jerarquia_minima) y la dependencia
   "campeón continental → Mundial de Clubes".
