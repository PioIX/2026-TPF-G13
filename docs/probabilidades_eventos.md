# Probabilidad y disponibilidad de eventos
## Regla de sorteo
`Evento.peso` se usa como peso relativo entre los eventos que sean elegibles en ese turno. No es un porcentaje individual ni hace que todos los eventos tengan la misma probabilidad.

La probabilidad de un evento elegible es:

`peso del evento / suma de pesos de todos los eventos elegibles × 100`

Por ejemplo, si tres eventos elegibles tienen peso `10`, `10` y `5`, sus chances son aproximadamente `40 %`, `40 %` y `20 %`. `peso = 0` deshabilita el evento; cuanto mayor el peso, más frecuente resulta comparado con los otros elegibles.

## Filtro implementado ahora
- Al comienzo, todos los eventos con peso positivo pueden salir, salvo categoría `Selección` y los eventos 25–30.
- Los eventos de Selección se habilitan desde la posición/temporada 5.
- Se aplica el sorteo ponderado después del filtro.

El límite de temporada 5 es una regla inicial configurable en la consulta de `backend/index.js`, no una conclusión futbolística definitiva.

## Lectura de los eventos actuales y pesos iniciales sugeridos
La lista que compartieron tiene peso `10` para los 36 eventos. Como propuesta inicial, mantengan los eventos comunes en 10 y ajusten los excepcionales; las sugerencias no se aplican automáticamente a la base:

| IDs | Grupo / interpretación | Peso inicial sugerido |
|---|---|---:|
| 1–4 | Lesiones comunes o leves | 8–12 |
| 5 | Recuperación exitosa (requiere haber tenido lesión) | 0 por ahora; requiere historial/estado de lesión |
| 6 | Muerte | 0 (evento de humor extremo, interrumpe el juego y no tiene efecto implementado) |
| 7–12 | Transferencias | 2–6; 0 hasta definir consecuencias reales de cambio de club |
| 13–17 | Rendimiento positivo notable | 5–10 |
| 18 | Premio Puskás, muy excepcional | 1–2 |
| 19–24 | Eventos aleatorios / humorísticos | 3–8 |
| 25–30 | Selección | 0 hasta temporada 5; luego 1–5 según rareza |
| 31–36 | Resultados negativos de partido | 4–8 |

Estos valores solo definen frecuencia relativa; los porcentajes cambian cuando se filtra la lista según el contexto. Para un primer balance es mejor medir varias partidas y ajustar los pesos con datos observados.

 Estado de la base y lo que falta para una personalización futbolística realista
La tabla `Evento` ya tiene `temporada_minima`, `temporada_maxima`, `requiere_lesion`, `requiere_seleccion`, `bloquea_si_lesionado` y `cooldown_temporadas`. `ParticipantePartida` ya tiene `id_seleccion`, pero no registra lesión ni su duración. **No agregues otra vez las columnas que ya existen.** La migración propuesta ahora añade lesión/duración y un historial de eventos para cooldown; los niveles de jugador/club son opcionales.

El estado actual que el backend carga durante la jugada no incluye todavía todos los valores de contexto. Por eso no se puede implementar correctamente todavía:

- `Recuperación exitosa` solo después de una lesión anterior.
- Ofertas/ventas/préstamos solo si hay resolución de transferencia y cambio persistente de club.
- Eventos de Selección solo estando convocado; existe `id_seleccion`, pero el flujo actual del backend no lo carga ni lo actualiza al convocar.
- Evitar repetición de eventos seguidos (se necesita consultar el historial reciente de eventos).
- Ponderar según nivel del jugador/club: la tabla/estado leído en la tirada no expone GRL ni forma deportiva.

La selección actual implementa únicamente el filtro temporal de Selección. Para ampliar las condiciones sin codificar reglas por ID, conviene agregar columnas como `temporada_minima`, `temporada_maxima`, `requiere_lesion`, `requiere_seleccion`, o una tabla de reglas/eventos por condición; y mantener `peso` como frecuencia dentro de los eventos elegibles.
