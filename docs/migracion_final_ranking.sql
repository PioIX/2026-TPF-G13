-- =====================================================================
-- MIGRACIÓN: FIN DE PARTIDA Y RANKING HISTÓRICO
--
-- Agrega las columnas que necesita la pantalla final (/finaljuego) y
-- el ranking histórico (/ranking):
--
--   ParticipantePartida.grl_maxima     → GRL más alto alcanzado en la carrera.
--   ParticipantePartida.puntaje_final  → puntaje con el que se cierra la carrera.
--
-- El puntaje se calcula en el backend (calcularPuntajeCarrera) y se
-- guarda al finalizar la partida, para que el ranking no dependa de
-- recalcular fórmulas sobre datos que podrían cambiar.
--
-- Ejecutar UNA sola vez sobre la base el_trayecto existente.
-- Si las columnas ya existen, los ALTER fallan: en ese caso comentarlos.
-- =====================================================================

-- GRL máximo de la carrera. Se inicializa con el GRL actual para que
-- las carreras ya jugadas tengan un valor coherente.
ALTER TABLE ParticipantePartida
    ADD COLUMN grl_maxima INT NOT NULL DEFAULT 57;

UPDATE ParticipantePartida
   SET grl_maxima = GREATEST(grl_maxima, COALESCE(grl, 57));

-- Puntaje final de la carrera (NULL mientras la partida no terminó).
ALTER TABLE ParticipantePartida
    ADD COLUMN puntaje_final INT NULL;

-- Índice para ordenar el ranking sin recorrer toda la tabla.
CREATE INDEX ix_participante_puntaje_final
    ON ParticipantePartida (puntaje_final);

-- Índice para listar rápido las partidas finalizadas.
CREATE INDEX ix_partida_estado
    ON Partida (estado);
