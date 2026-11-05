-- ============================================================================
-- AUDITORÍA — PARTE 2: contexto futbolístico del participante.
-- Necesario para que los eventos de Selección y de competencias
-- internacionales respeten la confederación / el país.
--
-- - nacionalidad + convocatorias: sin eso no se puede distinguir
--   "convocado / suplente / titular / fuera de la lista / regreso".
--   La tabla Seleccion ya existe (una fila por país con liga).
-- - ClubesHistorico: "Vuelta a casa" requiere saber dónde jugó antes.
-- - Club.continente: ya existía en producción; acá se rellena si falta
--   para poder derivar la confederación del club.
-- ============================================================================

-- (La base se toma de la conexión: no se fuerza USE para que el script
--  funcione tanto en local (el_trayecto) como en el servidor del curso.)

SET SQL_SAFE_UPDATES = 0;

-- ----------------------------------------------------------------------------
-- 1. Historial de clubes por participante (los cambios de club ya existen
--    vía /cambioClub, pero no se registraban en ningún lado).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ClubesHistorico (
    id_club_historico INT AUTO_INCREMENT PRIMARY KEY,
    id_participante INT NOT NULL,
    id_club INT NOT NULL,
    temporada_inicio INT NOT NULL,
    temporada_fin INT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_club_hist_participante
        FOREIGN KEY (id_participante) REFERENCES ParticipantePartida(id_participante),
    CONSTRAINT fk_club_hist_club
        FOREIGN KEY (id_club) REFERENCES Club(id_club),
    INDEX ix_club_hist_participante (id_participante, id_club)
);

-- ----------------------------------------------------------------------------
-- 2. Nacionalidad y estado de Selección del participante.
--    id_seleccion ya era la "convocatoria"; ahora guarda la NACIONALIDAD
--    elegida al crear el jugador (se mantiene por compatibilidad: la
--    nacionalidad y la primera convocatoria suelen coincidir).
--    (Idempotente: cada columna/constraint se agrega solo si no existe.)
-- ----------------------------------------------------------------------------
SET @ddl = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ParticipantePartida'
      AND COLUMN_NAME = 'id_nacionalidad') = 0,
    'ALTER TABLE ParticipantePartida ADD COLUMN id_nacionalidad INT NULL',
    'SELECT "id_nacionalidad ya existe, se omite" AS aviso');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ParticipantePartida'
      AND CONSTRAINT_NAME = 'fk_participante_nacionalidad') = 0,
    'ALTER TABLE ParticipantePartida ADD CONSTRAINT fk_participante_nacionalidad FOREIGN KEY (id_nacionalidad) REFERENCES Seleccion(id_seleccion)',
    'SELECT "fk_participante_nacionalidad ya existe, se omite" AS aviso');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ParticipantePartida'
      AND COLUMN_NAME = 'convocatorias') = 0,
    'ALTER TABLE ParticipantePartida ADD COLUMN convocatorias INT NOT NULL DEFAULT 0, ADD COLUMN estado_seleccion VARCHAR(20) NOT NULL DEFAULT ''nunca'', ADD COLUMN temporadas_fuera_seleccion INT NOT NULL DEFAULT 0',
    'SELECT "columnas de selección ya existen, se omiten" AS aviso');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. Rellenar continente de Club para las ligas cargadas.
--    (El continente determina qué copas internacionales puede disputar el
--    club: Libertadores/Sudamericana en Sudamérica, Champions/Europa League
--    en Europa, etc.)
-- ----------------------------------------------------------------------------
UPDATE Club SET continente = 'América del Sur'
WHERE liga IN ('Liga Profesional Argentina', 'Primera Nacional', 'Brasileirão')
  AND (continente IS NULL OR continente = '');

UPDATE Club SET continente = 'Europa'
WHERE liga IN ('La Liga', 'Premier League', 'Serie A', 'Bundesliga', 'Ligue 1',
               'Primeira Liga', 'Eredivisie', 'Süper Lig', 'Scottish Premiership',
               'Belgian Pro League', 'Swiss Super League', 'Austrian Bundesliga')
  AND (continente IS NULL OR continente = '');

UPDATE Club SET continente = 'América del Norte'
WHERE liga IN ('Liga MX', 'MLS')
  AND (continente IS NULL OR continente = '');

UPDATE Club SET continente = 'Asia'
WHERE liga IN ('Saudi Pro League', 'J1 League')
  AND (continente IS NULL OR continente = '');

-- ----------------------------------------------------------------------------
-- 4. Si hay participantes con club elegido y sin nacionalidad, la deducimos
--    del continente/liga del club como aproximación (no destruye datos:
--    solo rellena NULLs). El jugador siempre puede corregirla al elegir club.
-- ----------------------------------------------------------------------------
UPDATE ParticipantePartida pp
  JOIN Club c ON c.id_club = pp.id_club
  JOIN Seleccion s ON s.nombre = CASE c.liga
        WHEN 'Liga Profesional Argentina' THEN 'Argentina'
        WHEN 'Brasileirão' THEN 'Brasil'
        WHEN 'La Liga' THEN 'España'
        WHEN 'Premier League' THEN 'Inglaterra'
        WHEN 'Serie A' THEN 'Italia'
        WHEN 'Bundesliga' THEN 'Alemania'
        WHEN 'Ligue 1' THEN 'Francia'
        WHEN 'Primeira Liga' THEN 'Portugal'
        WHEN 'Eredivisie' THEN 'Países Bajos'
        WHEN 'Süper Lig' THEN 'Turquía'
        WHEN 'Scottish Premiership' THEN 'Escocia'
        WHEN 'Belgian Pro League' THEN 'Bélgica'
        WHEN 'Swiss Super League' THEN 'Suiza'
        WHEN 'Austrian Bundesliga' THEN 'Austria'
        WHEN 'Liga MX' THEN 'México'
        WHEN 'MLS' THEN 'Estados Unidos'
        WHEN 'Saudi Pro League' THEN 'Arabia Saudita'
        WHEN 'J1 League' THEN 'Japón'
    END
SET pp.id_nacionalidad = s.id_seleccion
WHERE pp.id_nacionalidad IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Selección: convocatoria por país. id_seleccion del participante apuntará
--    a la selección (país) con la que fue convocado.
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS selecciones FROM Seleccion;

SET SQL_SAFE_UPDATES = 1;
