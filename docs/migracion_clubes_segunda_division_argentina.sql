-- ============================================================================
-- CLUBES: SEGUNDA DIVISIÓN DE ARGENTINA (PRIMERA NACIONAL)
-- ============================================================================
--
-- Liga: "Primera Nacional" (segunda categoría del fútbol argentino,
-- por debajo de la Liga Profesional de Fútbol / Primera División).
--
-- Columnas de la tabla Club:
--   id_club            INT AUTO_INCREMENT PRIMARY KEY
--   nombre             VARCHAR(100) NOT NULL
--   liga               VARCHAR(100)
--   jerarquia          INT          -- 1 (más baja) .. 5 (más alta)
--   copa_internacional BOOLEAN      -- ¿disputa copas internacionales?
--   descripcion        TEXT
--
-- La jerarquía se asigna en 1: son clubes de la segunda categoría, los más
-- bajos del esquema actual (la jerarquía alimenta eventos y títulos).
-- copa_internacional = FALSE: la Primera Nacional no da acceso directo a
-- Libertadores ni Sudamericana.
--
-- Ejecutar sobre la base del proyecto. Es idempotente por nombre:
-- los clubes que ya existan con el mismo nombre se omiten.
-- ============================================================================

INSERT INTO Club (nombre, liga, jerarquia, copa_internacional, descripcion)
SELECT * FROM (
    SELECT 'Godoy Cruz'                     AS nombre, 'Primera Nacional' AS liga, 1 AS jerarquia, FALSE AS copa_internacional, 'Club mendocino con historia en Primera División. Participó varias temporadas en torneos de la máxima categoría del fútbol argentino.' AS descripcion UNION ALL
    SELECT 'Ferro Carril Oeste',              'Primera Nacional', 1, FALSE, 'Histórico club de Caballito. Campeón de Primera División en 1982 y 1984, y de la Copa de Honor en 1985.' UNION ALL
    SELECT 'Tristán Suárez',                  'Primera Nacional', 1, FALSE, 'Club de Ezeiza de tradición en el ascenso argentino.' UNION ALL
    SELECT 'Atlanta',                         'Primera Nacional', 1, FALSE, 'Club de Villa Crespo fundado por la colectividad italiana. Campeón de la Copa Suecia en 1958.' UNION ALL
    SELECT 'Deportivo Morón',                 'Primera Nacional', 1, FALSE, 'El Gallo de Morón, un clásico del ascenso del oeste bonaerense.' UNION ALL
    SELECT 'Temperley',                       'Primera Nacional', 1, FALSE, 'Gasolero de Turdera. Campeón de la Copa de Honor 1920 y de la Copa Beccar Varela 1924.' UNION ALL
    SELECT 'Deportivo Madryn',                'Primera Nacional', 1, FALSE, 'Club de Puerto Madryn, referente del fútbol chubutense.' UNION ALL
    SELECT 'Colón',                           'Primera Nacional', 1, FALSE, 'Sabalero de Santa Fe. Campeón de la Copa de la Liga Profesional 2021 y finalista de la Copa Sudamericana 2019.' UNION ALL
    SELECT 'Gimnasia y Esgrima (Jujuy)',      'Primera Nacional', 1, FALSE, 'El Lobo jujeño, uno de los clubes más convocantes del norte argentino.' UNION ALL
    SELECT 'Ferrocarril Midland',             'Primera Nacional', 1, FALSE, 'Club de Libertad, Merlo, con larga trayectoria en el ascenso.' UNION ALL
    SELECT 'Deportivo Maipú',                 'Primera Nacional', 1, FALSE, 'El Cruzado mendocino, con presencia histórica en el fútbol cuyano.' UNION ALL
    SELECT 'Colegiales',                      'Primera Nacional', 1, FALSE, 'Club de Munro, partido de Vicente López.' UNION ALL
    SELECT 'Gimnasia y Tiro (Salta)',         'Primera Nacional', 1, FALSE, 'Club salteño fundado en 1902, con tradición en torneos del interior.' UNION ALL
    SELECT 'San Martín (San Juan)',           'Primera Nacional', 1, FALSE, 'El Verdinegro sanjuanino, con paso por la máxima categoría.' UNION ALL
    SELECT 'Almirante Brown',                 'Primera Nacional', 1, FALSE, 'La Fragata de Isidro Casanova, uno de los clubes más populares del oeste.' UNION ALL
    SELECT 'Ciudad de Bolívar',               'Primera Nacional', 1, FALSE, 'Club de San Carlos de Bolívar, provincia de Buenos Aires.' UNION ALL
    SELECT 'Estudiantes (Buenos Aires)',      'Primera Nacional', 1, FALSE, 'El Pincha de Caseros, campeón de la Primera Nacional y con historia en la B Nacional.' UNION ALL
    SELECT 'San Martín (Tucumán)',            'Primera Nacional', 1, FALSE, 'El Santo tucumano, con paso por Primera División.' UNION ALL
    SELECT 'Chaco For Ever',                  'Primera Nacional', 1, FALSE, 'Club de Resistencia, referente del fútbol chaqueño.' UNION ALL
    SELECT 'Atlético Rafaela',                'Primera Nacional', 1, FALSE, 'La Crema rafaelina, varias temporadas en la máxima categoría.' UNION ALL
    SELECT 'Agropecuario',                    'Primera Nacional', 1, FALSE, 'Club de Carlos Casares, surgido en el fútbol del interior bonaerense.' UNION ALL
    SELECT 'Quilmes',                         'Primera Nacional', 1, FALSE, 'El Cervecero, campeón de la Primera División 1978 y con historia en Primera.' UNION ALL
    SELECT 'Los Andes',                       'Primera Nacional', 1, FALSE, 'El Milrayitas de Lomas de Zamora, con tradición en el fútbol metropolitano.' UNION ALL
    SELECT 'Almagro',                         'Primera Nacional', 1, FALSE, 'El Tricolor de José Mármol, con varias temporadas en la Primera Nacional.' UNION ALL
    SELECT 'San Telmo',                       'Primera Nacional', 1, FALSE, 'El Candombero de la Isla Maciel, club histórico del sur del conurbano.' UNION ALL
    SELECT 'Mitre (Santiago del Estero)',     'Primera Nacional', 1, FALSE, 'Club santiagueño surgido del interior del país.' UNION ALL
    SELECT 'Racing (Córdoba)',                'Primera Nacional', 1, FALSE, 'La Academia cordobesa, con historia en los torneos federales.' UNION ALL
    SELECT 'Chacarita Juniors',               'Primera Nacional', 1, FALSE, 'El Funebrero, campeón del Torneo Metropolitano 1969.' UNION ALL
    SELECT 'Defensores de Belgrano',          'Primera Nacional', 1, FALSE, 'El Dragón de Núñez, con larga trayectoria en el ascenso.' UNION ALL
    SELECT 'Central Norte',                   'Primera Nacional', 1, FALSE, 'El Cuervo salteño, referente del fútbol del norte argentino.' UNION ALL
    SELECT 'All Boys',                        'Primera Nacional', 1, FALSE, 'El Albo de Floresta, con varias temporadas en Primera División.' UNION ALL
    SELECT 'Patronato',                       'Primera Nacional', 1, FALSE, 'El Rojinegro paranaense, campeón de la Copa Argentina 2022.' UNION ALL
    SELECT 'Nueva Chicago',                   'Primera Nacional', 1, FALSE, 'El Torito de Mataderos, con pasos por la máxima categoría.' UNION ALL
    SELECT 'Acassuso',                        'Primera Nacional', 1, FALSE, 'Club de Boulogne, partido de San Isidro.' UNION ALL
    SELECT 'San Miguel',                      'Primera Nacional', 1, FALSE, 'El Trueno Verde del oeste bonaerense, con ascenso reciente.' UNION ALL
    SELECT 'Güemes (Santiago del Estero)',    'Primera Nacional', 1, FALSE, 'El Gaucho santiagueño, surgido del fútbol del interior.'
) AS nuevos
WHERE NOT EXISTS (
    SELECT 1 FROM Club c WHERE c.nombre = nuevos.nombre
);

-- Verificación: clubes cargados en la Liga.
-- SELECT id_club, nombre, liga, jerarquia, copa_internacional
-- FROM Club
-- WHERE liga = 'Primera Nacional'
-- ORDER BY nombre ASC;

UPDATE Club
SET descripcion = 'El Club Atlético Atlanta es una institución deportiva argentina fundada el 12 de octubre de 1904 en Buenos Aires, con sede histórica en el barrio de Villa Crespo. Su único título oficial en la Primera División de AFA es la Copa Suecia (1958/1960). Es apodado «Los Bohemios» debido a los constantes traslados de sus primeras canchas por motivos económicos'
WHERE nombre = 'Atlanta';

