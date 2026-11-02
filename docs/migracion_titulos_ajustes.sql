-- =====================================================================
-- MIGRACIÓN: AJUSTE DE TÍTULOS (jerarquía → campeonatos, nombres de
-- liga real en las copas, validación de torneos de selecciones, e
-- imágenes reales de los trofeos vía URLs de Wikimedia).
--
-- Ejecutar UNA sola vez sobre la base el_trayecto existente.
-- NO volver a correr: los UPDATE de datos son idempotentes, pero los
-- ALTER TABLE fallarían si las columnas ya existen.
-- =====================================================================
USE el_trayecto;

-- Workbench (y otros clientes) traen el safe update mode activado,
-- que bloquea UPDATE sin WHERE por clave primaria. Lo desactivamos
-- solo para esta sesión.
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------
-- 1. Nuevas columnas de validación.
-- ---------------------------------------------------------------------

-- Torneo de clubes vs. torneo de selecciones.
ALTER TABLE TituloInternacional
    ADD COLUMN tipo_seleccion TINYINT(1) NOT NULL DEFAULT 0;

-- Torneo continental de clubes: qué continentes pueden disputarlo.
ALTER TABLE TituloInternacional
    ADD COLUMN continente_club VARCHAR(50) NULL;

-- Torneo internacional de clubes que exige cierta jerarquía de club.
ALTER TABLE TituloInternacional
    ADD COLUMN jerarquia_minima INT NULL;

-- Torneo de clubes que exige haber sido campeón de otra copa antes.
ALTER TABLE TituloInternacional
    ADD COLUMN requiere_titulo_id INT NULL;

-- ---------------------------------------------------------------------
-- 2. Metadatos de cada torneo internacional.
--    (Los nombres coinciden con los inserts de migraciones anteriores.)
-- ---------------------------------------------------------------------

UPDATE TituloInternacional SET tipo_seleccion = 0, continente_club = 'América del Sur', jerarquia_minima = 1, requiere_titulo_id = NULL
WHERE nombre = 'Copa Libertadores';

UPDATE TituloInternacional SET tipo_seleccion = 0, continente_club = 'América del Sur', jerarquia_minima = 1, requiere_titulo_id = NULL
WHERE nombre = 'Copa Sudamericana';

UPDATE TituloInternacional SET tipo_seleccion = 0, continente_club = 'Europa', jerarquia_minima = 3, requiere_titulo_id = NULL
WHERE nombre = 'UEFA Champions League';

UPDATE TituloInternacional SET tipo_seleccion = 0, continente_club = 'Europa', jerarquia_minima = 2, requiere_titulo_id = NULL
WHERE nombre = 'UEFA Europa League';

UPDATE TituloInternacional SET tipo_seleccion = 0, continente_club = NULL, jerarquia_minima = 4, requiere_titulo_id = NULL
WHERE nombre = 'Copa Mundial de Clubes';

-- Copa América: solo convocado a la selección (id_seleccion = 1) y,
-- además, hay que jugarla → exige seleccion al momento del sorteo.
UPDATE TituloInternacional SET tipo_seleccion = 1, continente_club = NULL, jerarquia_minima = NULL, requiere_titulo_id = NULL
WHERE nombre = 'Copa América';

-- Eurocopa: solo convocado a la selección europea.
UPDATE TituloInternacional SET tipo_seleccion = 1, continente_club = NULL, jerarquia_minima = NULL, requiere_titulo_id = NULL
WHERE nombre = 'Eurocopa';

-- Mundial de selecciones: hay que estar convocado y, encima, la
-- probabilidad de salir campeón es MUY baja (se regula desde el backend
-- con umbral de mérito; el registro solo marca quién puede competir).
UPDATE TituloInternacional SET tipo_seleccion = 1, continente_club = NULL, jerarquia_minima = NULL, requiere_titulo_id = NULL
WHERE nombre = 'Mundial de Selecciones';

-- ---------------------------------------------------------------------
-- 3. Nombres REALES de las copas nacionales y supercopas por país.
--    (Antes 'Copa Nacional' / 'Supercopa Nacional' eran genéricos.)
-- ---------------------------------------------------------------------

UPDATE Titulo SET nombre = 'Copa Argentina', imagen = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Copa_Argentina_logo.png/500px-Copa_Argentina_logo.png'
WHERE nombre = 'Copa Nacional' AND pais IS NULL;

UPDATE Titulo SET nombre = 'Supercopa Argentina', imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/f/fa/Supercopa-de-Espa%C3%B1a-RFEF.svg/500px-Supercopa-de-Espa%C3%B1a-RFEF.svg.png'
WHERE nombre = 'Supercopa Nacional' AND pais IS NULL;

-- ---------------------------------------------------------------------
-- 4. Ligas reales con imágenes de Wikimedia (se reemplaza la ruta
--    local /images/titulos/... por una URL absoluta que funciona
--    desde cualquier cliente).
-- ---------------------------------------------------------------------

UPDATE Titulo SET nombre = 'Liga Profesional de Fútbol', imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/6/64/Liga_Profesional_de_F%C3%BAtbol_%28Argentina%29_logo.svg/500px-Liga_Profesional_de_F%C3%BAtbol_%28Argentina%29_logo.svg.png'
WHERE pais = 'Argentina';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/500px-Premier_League_Logo.svg.png'
WHERE pais = 'Inglaterra';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/500px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png'
WHERE pais = 'España';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/a/ab/Serie_A_ENILIVE_logo.svg/500px-Serie_A_ENILIVE_logo.svg.png'
WHERE pais = 'Italia';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/500px-Bundesliga_logo_%282017%29.svg.png'
WHERE pais = 'Alemania';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Logo_Ligue_1_McDonald%27s_2024.svg/500px-Logo_Ligue_1_McDonald%27s_2024.svg.png'
WHERE pais = 'Francia';

UPDATE Titulo SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/VriendenLoterij_Eredivisie_Logo.png/500px-VriendenLoterij_Eredivisie_Logo.png'
WHERE pais = 'Países Bajos';

UPDATE Titulo SET nombre = 'Primeira Liga', imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Liga_Portugal_Betclic_logo.svg/500px-Liga_Portugal_Betclic_logo.svg.png'
WHERE pais = 'Portugal';

-- ---------------------------------------------------------------------
-- 5. Títulos individuales: imágenes reales + ajuste de dificultad
--    (el Balón de Oro y la Bota de Oro deberían salir muy poco).
-- ---------------------------------------------------------------------

UPDATE TituloIndividual SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Trofeo_Pichichi_CR7Museum.jpg/500px-Trofeo_Pichichi_CR7Museum.jpg'
WHERE nombre = 'Goleador de la Liga';

UPDATE TituloIndividual SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/2016_Ballon_dOr_CR7Museum.jpg/500px-2016_Ballon_dOr_CR7Museum.jpg'
WHERE nombre = 'Balón de Oro';

UPDATE TituloIndividual SET imagen = 'https://upload.wikimedia.org/wikipedia/en/2/2b/Golden_Shoe%2C_Lionel_Messi_2012-2013.jpg'
WHERE nombre = 'Bota de Oro';

UPDATE TituloIndividual SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Unai_Simon_Argentina_v_Spain_19_July_2026-078_%28cropped%29.jpg/500px-Unai_Simon_Argentina_v_Spain_19_July_2026-078_%28cropped%29.jpg'
WHERE nombre = 'Mejor Arquero del Año';

UPDATE TituloIndividual SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Lamine_Yamal_Argentina_v_Spain_19_July_2026-214_%28cropped_3%29.jpg/500px-Lamine_Yamal_Argentina_v_Spain_19_July_2026-214_%28cropped_3%29.jpg'
WHERE nombre = 'Mejor Jugador Joven';

UPDATE TituloIndividual SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/FIFA_Best_Award_2023.jpg/500px-FIFA_Best_Award_2023.jpg'
WHERE nombre = 'Mejor Jugador de la Temporada';

-- ---------------------------------------------------------------------
-- 6. Títulos internacionales: imágenes reales.
-- ---------------------------------------------------------------------

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/a/a1/Copa_Libertadores_logo.svg/500px-Copa_Libertadores_logo.svg.png'
WHERE nombre = 'Copa Libertadores';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/c/c2/CONMEBOL_Sudamericana_logo_%282017%29.svg/500px-CONMEBOL_Sudamericana_logo_%282017%29.svg.png'
WHERE nombre = 'Copa Sudamericana';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/en/thumb/f/f5/UEFA_Champions_League.svg/500px-UEFA_Champions_League.svg.png'
WHERE nombre = 'UEFA Champions League';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/UEFA_Europa_League_logo_%282024_version%29.svg/500px-UEFA_Europa_League_logo_%282024_version%29.svg.png'
WHERE nombre = 'UEFA Europa League';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/FIFA_Club_World_Cup_logo.svg/500px-FIFA_Club_World_Cup_logo.svg.png'
WHERE nombre = 'Copa Mundial de Clubes';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Copa_Am%C3%A9rica.JPG/500px-Copa_Am%C3%A9rica.JPG'
WHERE nombre = 'Copa América';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Coupe_Henri_Delaunay_2017.jpg/500px-Coupe_Henri_Delaunay_2017.jpg'
WHERE nombre = 'Eurocopa';

UPDATE TituloInternacional SET imagen = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/FIFA_World_Cup_Trophy_photo_by_Djuradj_Vujcic.jpg/500px-FIFA_World_Cup_Trophy_photo_by_Djuradj_Vujcic.jpg'
WHERE nombre = 'Mundial de Selecciones';
