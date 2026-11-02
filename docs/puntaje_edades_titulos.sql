-- =====================================================================
-- MIGRACIÓN: PAÍS POR LIGA + SISTEMA DE PUNTAJE + EDAD EN TÍTULOS
-- 1. Columna pais en TituloIndividual y TituloGanado.puntos_obtenidos.
-- 2. Llena Titulo.pais faltante (Copa/Supercopa Argentina) y agrega
--    copas nacionales/supercopas para el resto de las ligas cargadas.
-- 3. TituloIndividual.pais para premiaciones por liga/país.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nuevas columnas.
-- ---------------------------------------------------------------------
ALTER TABLE TituloIndividual
    ADD COLUMN pais VARCHAR(100) NULL;

ALTER TABLE TituloGanado
    ADD COLUMN puntos_obtenidos INT NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- 2. Titulo: completar país de copas nacionales y agregar ligas/copas
--    de las ligas que hoy no tienen títulos nacionales.
-- ---------------------------------------------------------------------
UPDATE Titulo SET pais = 'Argentina'
WHERE pais IS NULL;

-- Ligas con clubs cargados pero sin título nacional en la tabla.
INSERT INTO Titulo (nombre, pais, puntos_campeon, prestigio)
SELECT x.nombre, x.pais, x.puntos_campeon, x.prestigio
FROM (
    SELECT 'Brasileirão Série A' AS nombre, 'Brasil' AS pais, 130 AS puntos_campeon, 3 AS prestigio
    UNION SELECT 'Liga MX', 'México', 100, 2
    UNION SELECT 'MLS Cup', 'Estados Unidos', 90, 2
    UNION SELECT 'Süper Lig', 'Turquía', 90, 2
    UNION SELECT 'Scottish Premiership', 'Escocia', 85, 2
    UNION SELECT 'Belgian Pro League', 'Bélgica', 85, 2
    UNION SELECT 'Swiss Super League', 'Suiza', 75, 1
    UNION SELECT 'Austrian Bundesliga', 'Austria', 75, 1
    UNION SELECT 'Saudi Pro League', 'Arabia Saudita', 80, 2
    UNION SELECT 'J1 League', 'Japón', 80, 2
) x
WHERE NOT EXISTS (
    SELECT 1 FROM Titulo t WHERE t.pais = x.pais
);

-- ---------------------------------------------------------------------
-- 3. Copas nacionales y supercopas por país (prestigio 1: las gana
--    cualquier club, incluso los chicos).
-- ---------------------------------------------------------------------
INSERT INTO Titulo (nombre, pais, puntos_campeon, prestigio)
SELECT x.nombre, x.pais, x.puntos_campeon, x.prestigio
FROM (
    SELECT 'Copa do Brasil' AS nombre, 'Brasil' AS pais, 60 AS puntos_campeon, 1 AS prestigio
    UNION SELECT 'Copa MX', 'México', 45, 1
    UNION SELECT 'US Open Cup', 'Estados Unidos', 40, 1
    UNION SELECT 'Copa del Rey de Turquía', 'Turquía', 40, 1
    UNION SELECT 'Scottish Cup', 'Escocia', 40, 1
    UNION SELECT 'Copa de Bélgica', 'Bélgica', 40, 1
    UNION SELECT 'Copa de Suiza', 'Suiza', 35, 1
    UNION SELECT 'Copa de Austria', 'Austria', 35, 1
    UNION SELECT 'Copa del Rey Saudí', 'Arabia Saudita', 40, 1
    UNION SELECT 'Copa del Emperador', 'Japón', 40, 1
) x
WHERE NOT EXISTS (
    SELECT 1 FROM Titulo t WHERE t.nombre = x.nombre
);

-- ---------------------------------------------------------------------
-- 4. Títulos individuales: pais (NULL = mundial, compite todo el mundo).
--    Goleador de la Liga y Mejor Arquero del Año son por liga local:
--    pais debe coincidir con el país del club del jugador.
--    Balón de Oro / Bota de Oro / MVP / Joven: pais NULL (mundiales),
--    la edad se controla desde el backend.
-- ---------------------------------------------------------------------
UPDATE TituloIndividual SET pais = NULL WHERE pais IS NULL;
