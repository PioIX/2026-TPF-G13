-- Migración propuesta para habilitar condiciones contextuales de Evento.
-- Según el esquema compartido, Evento ya tiene temporada_minima,
-- temporada_maxima, requiere_lesion, requiere_seleccion,
-- bloquea_si_lesionado y cooldown_temporadas.
-- Según el esquema compartido, ParticipantePartida ya tiene id_seleccion.
-- Hacer backup y confirmar que las columnas no existan antes de ejecutar.

-- Estado médico y GRL ya fueron agregados a ParticipantePartida.
-- No volver a ejecutar ALTER TABLE para esas columnas.
-- El nivel de club se consulta mediante Club.jerarquia y ParticipantePartida.id_club.

-- El nivel del club se obtiene de Club.jerarquia usando id_club;
-- no duplicarlo en ParticipantePartida.
-- GRL ya fue agregado a ParticipantePartida; no repetir ALTER TABLE.

-- Para consultar la jerarquía del club seleccionado:
-- SELECT pp.id_participante, c.jerarquia AS nivel_club
-- FROM ParticipantePartida pp
-- LEFT JOIN Club c ON c.id_club = pp.id_club;

-- Registro de eventos por participante/temporada para cooldown e historial contextual.
CREATE TABLE EstadoCarreraEvento (
    id_estado_carrera_evento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_participante INT NOT NULL,
    id_evento INT NOT NULL,
    temporada SMALLINT UNSIGNED NOT NULL,
    detalle JSON NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_estado_carrera_participante
        FOREIGN KEY (id_participante) REFERENCES ParticipantePartida(id_participante),
    CONSTRAINT fk_estado_carrera_evento
        FOREIGN KEY (id_evento) REFERENCES Evento(id_evento),
    INDEX ix_estado_carrera_participante_temporada (id_participante, temporada),
    INDEX ix_estado_carrera_evento_fecha (id_participante, id_evento, fecha)
);

-- La lista de 36 eventos compartida no incluye IDs estables en este esquema.
-- Por eso no se ejecutan UPDATE por id: los IDs pueden variar entre bases.
-- Después de confirmar los IDs, configurar por categoría/nombre o usar una
-- columna codigo_evento UNIQUE para identificar cada evento sin ambigüedad.

-- Regla conceptual a aplicar en el sorteo:
--   Evento.peso > 0
--   temporada >= temporada_minima
--   temporada <= temporada_maxima (cuando no es NULL)
--   requiere_lesion = 1 implica ParticipantePartida.lesionado = 1
--   requiere_seleccion = 1 implica participante convocado a la Seleccion
--   bloquea_si_lesionado = 1 excluye al participante si está lesionado
--   cooldown_temporadas excluye eventos recientes consultando EstadoCarreraEvento
--   peso se normaliza entre todos los eventos que pasen estos filtros.

-- Ya tenés id_seleccion en ParticipantePartida. Asegurate de que el backend
-- la establezca al convocar y la limpie cuando corresponda; tener la columna
-- por sí solo no mantiene el estado actualizado.
