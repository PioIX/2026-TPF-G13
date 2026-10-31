-- =====================================================================
-- Configuración contextual de los 36 eventos de "El Trayecto".

-- Safe update mode de MySQL Workbench rechaza UPDATE sin WHERE por
-- clave. Los WHERE de este script usan `nombre`, así que lo desactivamos
-- para este script y lo volvemos a activar al final.
SET SQL_SAFE_UPDATES = 0;

-- Columnas usadas:
--   temporada_minima / temporada_maxima : rango de casillas donde puede salir.
--   requiere_lesion  : solo puede ocurrir si el jugador está lesionado.
--   requiere_seleccion : solo puede ocurrir si el jugador está convocado.
--   bloquea_si_lesionado : no puede ocurrir si el jugador está lesionado.
--   cooldown_temporadas : mínimo de temporadas entre ocurrencias (0 = sin cooldown).
--   peso : probabilidad relativa dentro de los elegibles (más peso = más frecuente).
--
-- Se usa nombre_evento para identificar, no id_evento, porque los IDs
-- pueden variar entre bases.
-- =====================================================================

-- ---------------------------------------------------------------------
-- LESIONES (1-6)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,   -- no te lesionás estando ya lesionado
  cooldown_temporadas = 3,    -- no te lesionan dos temporadas seguidas
  peso = 6
WHERE nombre = 'Desgarro muscular';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 3,
  peso = 5
WHERE nombre = 'Esguince de tobillo';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 4,    -- grave y rara
  peso = 3
WHERE nombre = 'Fractura inesperada';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 2,
  peso = 6                    -- la molestia leve es la lesión más común
WHERE nombre = 'Molestia muscular';

UPDATE Evento SET
  temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 1,        -- SOLO puede salir si estás lesionado
  requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 1,
  peso = 14
WHERE nombre = 'Recuperación exitosa';

-- Muerte: humor negro, casi imposible pero posible (leyenda urbana).
UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 1,        -- solo si la lesión fue seria
  requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 0,
  peso = 1
WHERE nombre = 'Muerta';

-- ---------------------------------------------------------------------
-- CAMBIO DE CLUB (7-12)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 3, temporada_maxima = 15,  -- oferta de Primera tiene sentido temprano
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 3,
  peso = 10
WHERE nombre = 'Oferta de Primera';

UPDATE Evento SET
  temporada_minima = 2, temporada_maxima = 12,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 3,
  peso = 8
WHERE nombre = 'Préstamo inesperado';

UPDATE Evento SET
  temporada_minima = 5, temporada_maxima = NULL, -- tenés que tener prestigio primero
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 4,
  peso = 5
WHERE nombre = 'Transferencia internacional';

UPDATE Evento SET
  temporada_minima = 4, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 4,
  peso = 4
WHERE nombre = 'Vuelta a casa';

UPDATE Evento SET
  temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 3,
  peso = 7
WHERE nombre = 'Rescisión de contrato';

UPDATE Evento SET
  temporada_minima = 4, temporada_maxima = 20,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 3,
  peso = 6
WHERE nombre = 'Venta inesperada';

-- ---------------------------------------------------------------------
-- POSITIVOS (13-18)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,   -- estando lesionado no jugás el clásico
  cooldown_temporadas = 1,
  peso = 12
WHERE nombre = 'Figura del partido';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 10
WHERE nombre = 'Gol agónico';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 11
WHERE nombre = 'Ovación de la gente';

UPDATE Evento SET
  temporada_minima = 3, temporada_maxima = NULL, -- el premio llega tras temporadas buenas
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 3,
  peso = 7
WHERE nombre = 'Premio por rendimiento';

UPDATE Evento SET
  temporada_minima = 5, temporada_maxima = NULL, -- marca histórica requiere carrera hecha
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 4,
  peso = 5
WHERE nombre = 'Récord personal';

UPDATE Evento SET
  temporada_minima = 6, temporada_maxima = NULL, -- el Puskás es para consagrados
  requiere_lesion = 0, requiere_seleccion = 1,   -- se gana con gol internacional previo
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 5,
  peso = 2
WHERE nombre = 'Premio Puskás';

-- ---------------------------------------------------------------------
-- ALEATORIOS / VIDA (19-24)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 3, temporada_maxima = NULL, -- el jugador adulto tiene dinero para apostar
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 8
WHERE nombre = 'Caída al lado oscuro';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 10
WHERE nombre = 'Perezoso';

UPDATE Evento SET
  temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 9
WHERE nombre = 'LAM';

UPDATE Evento SET
  temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 9
WHERE nombre = 'Traición';

UPDATE Evento SET
  temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,   -- con pastillitas de menta no juega lesionado, chiste
  cooldown_temporadas = 3,
  peso = 7
WHERE nombre = 'Caramelli';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 10
WHERE nombre = 'Señor de la noche';

-- ---------------------------------------------------------------------
-- SELECCIÓN (25-30)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 5, temporada_maxima = 16,  -- la N°10 llega cuando ya demostraste
  requiere_lesion = 0, requiere_seleccion = 0,  -- este evento ES la convocatoria
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 0,    -- es único, pero sin repetición forzada
  peso = 3
WHERE nombre = 'Heredás la N°10';

UPDATE Evento SET
  temporada_minima = 4, temporada_maxima = 17,
  requiere_lesion = 0, requiere_seleccion = 0,  -- te convoca
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 6
WHERE nombre = 'Titular en la Selección';

UPDATE Evento SET
  temporada_minima = 4, temporada_maxima = 17,
  requiere_lesion = 0, requiere_seleccion = 1,  -- ya convocado, convertís con la camiseta
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 1,
  peso = 8
WHERE nombre = 'Gol internacional';

UPDATE Evento SET
  temporada_minima = 6, temporada_maxima = 16,
  requiere_lesion = 0, requiere_seleccion = 1,
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 3,
  peso = 4
WHERE nombre = 'Figura internacional';

UPDATE Evento SET
  temporada_minima = 4, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 1,  -- solo tiene sentido si estabas convocado
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 1,
  peso = 7
WHERE nombre = 'Quedás fuera de la lista';

UPDATE Evento SET
  temporada_minima = 5, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 0,  -- este evento vuelve a convocarte
  bloquea_si_lesionado = 0,
  cooldown_temporadas = 2,
  peso = 6
WHERE nombre = 'Regreso a la Selección';

-- ---------------------------------------------------------------------
-- NEGATIVOS DEPORTIVOS (31-36)
-- ---------------------------------------------------------------------
UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 11
WHERE nombre = 'Pérdida y gol';
-- DESACTUALIZADO
UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 10
WHERE nombre = 'Expulsión polémica';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,   -- si no jugás por lesión, no podés ser suplente gran parte del año
  cooldown_temporadas = 1,
  peso = 8
WHERE nombre = 'Mala racha';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 2,
  peso = 9
WHERE nombre = 'Penal errado';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 10
WHERE nombre = 'Vestuario roto';

UPDATE Evento SET
  temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0,
  bloquea_si_lesionado = 1,
  cooldown_temporadas = 1,
  peso = 8
WHERE nombre = 'Derrota en el clásico';

-- Verificación: nada debe quedar en NULL.
SELECT id_evento, nombre, peso, temporada_minima, temporada_maxima,
       requiere_lesion, requiere_seleccion, bloquea_si_lesionado,
       cooldown_temporadas
FROM Evento
ORDER BY id_evento;

SET SQL_SAFE_UPDATES = 1;
