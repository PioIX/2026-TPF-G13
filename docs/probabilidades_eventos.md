# Reglas y probabilidades de eventos
## Cómo se sortean las probabilidades
`Evento.peso` se interpreta como peso relativo entre los eventos elegibles en ese turno:

`probabilidad = peso del evento / suma de pesos elegibles × 100`

Los eventos con `peso = 0` quedan deshabilitados. Las probabilidades resultantes cambian según la temporada y el estado del jugador; no hay un porcentaje fijo por evento.

## Filtros aplicados por el backend
En `backend/index.js`, antes del sorteo, se consideran:

- `temporada_minima` y `temporada_maxima`, usando `posicion_actual` como temporada de juego.
- `requiere_lesion`, `bloquea_si_lesionado` y el fin de lesión guardado en `ParticipantePartida`.
- `requiere_seleccion`, usando `id_seleccion` si es distinto de `NULL`.
- `cooldown_temporadas`, consultando `EstadoCarreraEvento` por participante.
- Ajustes moderados del peso para hitos excepcionales según `grl` y `Club.jerarquia`.

El sorteo sigue siendo ponderado sobre esos eventos elegibles. Un peso ajustado nunca reemplaza los filtros.

## Actualización de estado
El backend guarda el evento elegido en `EstadoCarreraEvento` para cooldown, además del historial existente si esa tabla está instalada. Los eventos de categoría `Lesión` establecen un estado lesionado y una fecha de recuperación inicial de una temporada; `Recuperación exitosa` lo limpia. El GRL se ajusta moderadamente con eventos destacados y queda limitado a 1–99.

## Límites que todavía requieren una regla de producto
- En el flujo revisado no encontramos lógica que convoque a Selección y establezca `ParticipantePartida.id_seleccion`. Mientras siga `NULL`, los eventos con `requiere_seleccion = 1` nunca serán elegibles. Hay que decidir cuándo convocar (por ejemplo, temporada, GRL, fama, jerarquía del club) y persistirlo.
- Los eventos de cambio de club solo ajustan peso por jerarquía; no ejecutan una transferencia. Para que el suceso sea efectivo hay que definir cuándo cambia `id_club`, si requiere aceptar una oferta y qué significa cada evento.
- La duración de lesión es provisional; conviene que cada tipo de lesión tenga duración y que la recuperación ocurra por temporada o mediante un evento elegible.
- El ajuste de pesos por GRL/jerarquía en código es una heurística inicial. Debe calibrarse con partidas simuladas; el orden numérico de `Club.jerarquia` se asume menor = más fuerte.
- Los eventos de partido/temporada, como gol o expulsión, actualmente no se verifican contra una simulación real de un partido; sus nombres no generan por sí solos esas condiciones.

## Pesos iniciales sugeridos (para calibrar)

La lista compartida tenía peso 10 en todos los eventos. Propuesta para una primera prueba: lesiones comunes 8–12; recuperación 0 hasta validar estado de lesión; muerte 0; transferencias 2–6; positivos frecuentes 5–10; Puskás 1–2; eventos aleatorios 3–8; Selección 1–5 solo después de convocar; negativos 4–8. Son valores relativos, no porcentajes. Aplicarlos gradualmente y medir miles de tiradas por perfil antes de ajustar balance.
