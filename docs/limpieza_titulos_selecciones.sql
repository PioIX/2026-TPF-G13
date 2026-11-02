-- =====================================================================
-- MIGRACIÓN: SOLO FÚTBOL MASCULINO + SELECCIONES DE LOS PAÍSES CON LIGA
-- 1. Elimina TODOS los títulos femeninos (de cualquier tabla/categoría).
-- 2. Elimina registros duplicados de torneos internacionales (quedan los
--    normalizados con puntos_campeon altos y validaciones).
-- 3. Marca como tipo_seleccion = 1 los torneos que SOLO se ganan con la
--    selección (no con el club).
-- 4. Carga la tabla Seleccion con los países que tienen liga en Club.
--
-- Ejecutar UNA sola vez. Los DELETE/INSERT son idempotentes por nombre.
-- =====================================================================
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Baja de TODOS los títulos femeninos.
-- ---------------------------------------------------------------------
DELETE FROM TituloInternacional
WHERE nombre LIKE '%femenin%'
   OR nombre LIKE '%Femenin%'
   OR nombre LIKE '%W %';

DELETE FROM Titulo
WHERE nombre LIKE '%femenin%' OR nombre LIKE '%Femenin%';

DELETE FROM TituloIndividual
WHERE nombre LIKE '%femenin%' OR nombre LIKE '%Femenin%';

-- ---------------------------------------------------------------------
-- 2. Deduplicación de torneos internacionales.
--    Quedan las versiones "nuevas" (Copa Mundial de la FIFA -> Mundial
--    de Selecciones, Copa Mundial de Clubes, Copa América 180 pts,
--    Eurocopa 200 pts).
-- ---------------------------------------------------------------------
DELETE FROM TituloInternacional WHERE nombre = 'Copa Mundial Femenina de la FIFA';
DELETE FROM TituloInternacional WHERE nombre = 'Torneo Olímpico de Fútbol Femenino';
DELETE FROM TituloInternacional WHERE nombre = 'Copa América Femenina';
DELETE FROM TituloInternacional WHERE nombre = 'Eurocopa Femenina';
DELETE FROM TituloInternacional WHERE nombre = 'UEFA Nations League Femenina';
DELETE FROM TituloInternacional WHERE nombre = 'CONCACAF W Gold Cup';
DELETE FROM TituloInternacional WHERE nombre = 'Copa Africana de Naciones Femenina';
DELETE FROM TituloInternacional WHERE nombre = 'Copa Asiática Femenina de la AFC';
DELETE FROM TituloInternacional WHERE nombre = 'Copa de Naciones Femenina de la OFC';

-- Duplicados viejos (coexisten con los normalizados de la migración previa).
DELETE FROM TituloInternacional WHERE nombre = 'Copa Mundial de la FIFA';
DELETE FROM TituloInternacional WHERE nombre = 'Copa Mundial de Clubes' AND puntos_campeon = 35;
DELETE FROM TituloInternacional WHERE nombre = 'Copa América' AND puntos_campeon = 30;
DELETE FROM TituloInternacional WHERE nombre = 'Eurocopa' AND puntos_campeon = 30;

-- ---------------------------------------------------------------------
-- 3. Torneos que SOLO puede ganar con su selección.
-- ---------------------------------------------------------------------
UPDATE TituloInternacional SET tipo_seleccion = 1
WHERE nombre IN (
    'Mundial de Selecciones',
    'Copa América',
    'Eurocopa',
    'UEFA Nations League',
    'CONCACAF Gold Cup',
    'CONCACAF Nations League',
    'Copa Africana de Naciones',
    'Copa Asiática de la AFC',
    'Copa de Naciones de la OFC',
    'Finalissima',
    'Copa Árabe de la FIFA',
    'Torneo Olímpico de Fútbol Masculino'
);

-- ---------------------------------------------------------------------
-- 4. Selecciones: países con liga cargada en Club.
-- ---------------------------------------------------------------------
INSERT INTO Seleccion (nombre, convocado)
SELECT t.pais, 0
FROM (
    SELECT 'Argentina' AS pais UNION SELECT 'Inglaterra' UNION
    SELECT 'España' UNION SELECT 'Italia' UNION
    SELECT 'Alemania' UNION SELECT 'Francia' UNION
    SELECT 'Países Bajos' UNION SELECT 'Portugal' UNION
    SELECT 'Brasil' UNION SELECT 'México' UNION
    SELECT 'Estados Unidos' UNION SELECT 'Turquía' UNION
    SELECT 'Escocia' UNION SELECT 'Bélgica' UNION
    SELECT 'Suiza' UNION SELECT 'Austria' UNION
    SELECT 'Arabia Saudita' UNION SELECT 'Japón'
) t
WHERE NOT EXISTS (SELECT 1 FROM Seleccion s WHERE s.nombre = t.pais);

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;
