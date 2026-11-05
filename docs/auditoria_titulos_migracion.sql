-- ============================================================================
-- AUDITORÍA INTEGRAL DEL SISTEMA DE TÍTULOS Y PREMIOS — Migración (idempotente)
--
-- Conserva TODOS los ids existentes y el historial de TituloGanado.
-- - Corrige el error de imagen de Supercopa Argentina (tenía el escudo de
--   la Supercopa de España).
-- - Corrige la imagen del Balón de Oro duplicado (id 28) para que sea
--   distinguible en el frontend.
-- - Marca con nombre explícito los duplicados históricos (ids 1, 3) para
--   que se entienda que son registros de otra escala, sin borrarlos.
-- - Completa continente de Club si algún liga nueva quedó sin valor.
-- ============================================================================

SET SQL_SAFE_UPDATES = 0;

-- ----------------------------------------------------------------------------
-- 0. ELIMINACIÓN de los títulos de ARQUERO (decisión del proyecto: el juego
--    no registra la posición del futbolista, así que estos premios no se
--    pueden otorgar de forma coherente).
--    - id 8  "Guante de Oro de la Copa Mundial"
--    - id 16 "Premio Lev Yashin"
--    - id 30 "Mejor Arquero del Año"
--    Primero se limpian las referencias (historial y "último título" del
--    participante) y después se eliminan los registros. Es reversible: los
--    ids y valores originales quedan documentados acá para un INSERT inverso.
-- ----------------------------------------------------------------------------
UPDATE ParticipantePartida
   SET id_titulo_individual = NULL
 WHERE id_titulo_individual IN (8, 16, 30);

DELETE FROM TituloGanado
 WHERE id_titulo_individual IN (8, 16, 30);

DELETE FROM TituloIndividual
 WHERE id_titulo_individual IN (8, 16, 30);

-- ----------------------------------------------------------------------------
-- 1. Clubes sin continente: relleno defensivo (la elegibilidad continental
--    depende de esta columna; un NULL permitiría Champions a cualquier club).
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
-- 2. Imagen incorrecta de la Supercopa Argentina: tenía el escudo de la
--    Supercopa de España (RFEF). Se reemplaza por la imagen verificada del
--    trofeo de la Supercopa Argentina (Wikimedia Commons, 200 image/png).
-- ----------------------------------------------------------------------------
UPDATE Titulo
   SET imagen = 'https://commons.wikimedia.org/wiki/Special:FilePath/Trof%C3%A9u%20da%20Supercopa%20da%20Argentina.png?width=500'
 WHERE id_titulo = 10
   AND imagen LIKE '%Supercopa-de-Espa%C3%B1a%';

-- ----------------------------------------------------------------------------
-- 3. Duplicados históricos (no se borran, se renombra para dejar claro el
--    propósito y que el frontend los distinga si aparecen en historiales):
--    - TituloIndividual 1  "Balón de Oro"     -> "Balón de Oro (histórico)"
--      (duplicado del 28 con escala de puntos vieja, 30 vs 250)
--    - TituloIndividual 3  "Bota de Oro Europea" -> "Bota de Oro (histórico)"
--      (duplicado del 31 con otra escala)
--    - TituloIndividual 26 "Goleador de la Liga" -> "Máximo Goleador (Pichichi)"
--      (su imagen ES el trofeo Pichichi; el 20 queda como "Máximo Goleador
--       de la Liga" genérico por liga local)
-- ----------------------------------------------------------------------------
UPDATE TituloIndividual
   SET nombre = 'Balón de Oro (histórico)'
 WHERE id_titulo_individual = 1 AND nombre = 'Balón de Oro';

UPDATE TituloIndividual
   SET nombre = 'Bota de Oro (histórico)'
 WHERE id_titulo_individual = 3 AND nombre = 'Bota de Oro Europea';

UPDATE TituloIndividual
   SET nombre = 'Máximo Goleador (Pichichi)'
 WHERE id_titulo_individual = 26 AND nombre = 'Goleador de la Liga';

-- ----------------------------------------------------------------------------
-- 4. Puntuación incoherente demostrable:
--    - id 26 "Goleador de la Liga" (Pichichi) daba 80 puntos por temporada,
--      MÁS que la Champions (id 18: 20) y más que el Balón de Oro histórico
--      (30). El Pichichi es un premio menor respecto del Balón de Oro:
--      se alinea con "Máximo Goleador de la Liga" (20) = 15.
--      Solo se ajusta si nadie lo ganó con el valor viejo (no rompe historial).
--    - ids 27/29/30/31 (120/70/70/150) tenían escalas fuera de todo el
--      rango del sistema (max ~30 en el resto). Se reescalan a la escala
--      estándar preservando el orden relativo: MVP temporada > Puskás/Yashin,
--      joven menor, Bota de Oro ≈ Bota de Oro Europea (22).
--      Solo si no fueron ganados todavía con esos valores.
--      (El id 30 "Mejor Arquero del Año" se ELIMINA en la §0; su ajuste
--       de puntos queda sin efecto si la fila ya no existe.)
-- ----------------------------------------------------------------------------
UPDATE TituloIndividual
   SET puntos_campeon = 15
 WHERE id_titulo_individual = 26 AND puntos_campeon = 80
   AND NOT EXISTS (SELECT 1 FROM TituloGanado
                    WHERE id_titulo_individual = 26 AND puntos_obtenidos = 80);

UPDATE TituloIndividual
   SET puntos_campeon = 22
 WHERE id_titulo_individual = 27 AND puntos_campeon = 120
   AND NOT EXISTS (SELECT 1 FROM TituloGanado
                    WHERE id_titulo_individual = 27 AND puntos_obtenidos = 120);

UPDATE TituloIndividual
   SET puntos_campeon = 12
 WHERE id_titulo_individual = 29 AND puntos_campeon = 70
   AND NOT EXISTS (SELECT 1 FROM TituloGanado
                    WHERE id_titulo_individual = 29 AND puntos_obtenidos = 70);

UPDATE TituloIndividual
   SET puntos_campeon = 12
 WHERE id_titulo_individual = 30 AND puntos_campeon = 70
   AND NOT EXISTS (SELECT 1 FROM TituloGanado
                    WHERE id_titulo_individual = 30 AND puntos_obtenidos = 70);

UPDATE TituloIndividual
   SET puntos_campeon = 22
 WHERE id_titulo_individual = 31 AND puntos_campeon = 150
   AND NOT EXISTS (SELECT 1 FROM TituloGanado
                    WHERE id_titulo_individual = 31 AND puntos_obtenidos = 150);

-- ----------------------------------------------------------------------------
-- 5. Mundial de Clubes (22) vs Copa Mundial de Clubes (28):
--    Diferenciación documentada (ver docs/auditoria_titulos.md):
--    - 22 "Mundial de Clubes de la FIFA": formato ANUAL clásico (7 equipos),
--      ganado por un campeón continental vigente. Puntos 35 (magnitud de la
--      escala de los internacionales de clubes era 25-300; 35 coherente).
--    - 28 "Copa Mundial de Clubes": formato AMPLIADO (32 equipos, 2025+).
--      Solo los nombres describen la diferencia; se aclara con sufijo.
-- ----------------------------------------------------------------------------
UPDATE TituloInternacional
   SET nombre = 'Mundial de Clubes de la FIFA (formato anual)'
 WHERE id_titulo_internacional = 22 AND nombre = 'Mundial de Clubes de la FIFA';

UPDATE TituloInternacional
   SET nombre = 'Copa Mundial de Clubes (formato ampliado)'
 WHERE id_titulo_internacional = 28 AND nombre = 'Copa Mundial de Clubes';

SET SQL_SAFE_UPDATES = 1;

SELECT 'Migración de títulos aplicada' AS estado;
