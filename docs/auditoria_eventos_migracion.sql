-- ============================================================================
-- AUDITORÍA INTEGRAL DEL SISTEMA DE EVENTOS — "El Trayecto" (G13)
-- Migración + configuración contextual de los 36 eventos.
--
-- Ejecutar UNA sola vez sobre la base el_trayecto (o 2026_5INF_G13).
-- Es idempotente donde es posible: los ALTER fallarían si ya existen
-- (como el resto de las migraciones del proyecto, no se re-ejecutan).
--
-- Los eventos se identifican por nombre (los ids pueden variar entre bases).
-- ============================================================================

-- (La base se toma de la conexión: no se fuerza USE para que el script
--  funcione tanto en local (el_trayecto) como en el servidor del curso.)

SET SQL_SAFE_UPDATES = 0;

-- ----------------------------------------------------------------------------
-- 1. Identificador estable de evento.
--    Los filtros contextuales del backend y las dependencias históricas
--    necesitan reconocer cada evento sin depender de cadenas de texto frágiles
--    (acentos, mayúsculas). codigo_evento es la clave estable del evento.
--    (Idempotente: si la columna/índice ya existen, no falla el script.)
-- ----------------------------------------------------------------------------
SET @existe_col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Evento'
      AND COLUMN_NAME = 'codigo_evento');
SET @ddl = IF(@existe_col = 0,
    'ALTER TABLE Evento ADD COLUMN codigo_evento VARCHAR(50) NULL',
    'SELECT "codigo_evento ya existe, se omite" AS aviso');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe_idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Evento'
      AND INDEX_NAME = 'uq_evento_codigo');
SET @ddl = IF(@existe_idx = 0,
    'ALTER TABLE Evento ADD UNIQUE KEY uq_evento_codigo (codigo_evento)',
    'SELECT "uq_evento_codigo ya existe, se omite" AS aviso');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Evento SET codigo_evento = 'lesion_desgarro'       WHERE nombre = 'Desgarro muscular';
UPDATE Evento SET codigo_evento = 'lesion_esguince'       WHERE nombre = 'Esguince de tobillo';
UPDATE Evento SET codigo_evento = 'lesion_fractura'       WHERE nombre = 'Fractura inesperada';
UPDATE Evento SET codigo_evento = 'lesion_molestia'       WHERE nombre = 'Molestia muscular';
UPDATE Evento SET codigo_evento = 'lesion_recuperacion'   WHERE nombre = 'Recuperación exitosa';
UPDATE Evento SET codigo_evento = 'lesion_fin_carrera'    WHERE nombre = 'Muerta';
UPDATE Evento SET codigo_evento = 'club_oferta_primera'   WHERE nombre = 'Oferta de Primera';
UPDATE Evento SET codigo_evento = 'club_prestamo'         WHERE nombre = 'Préstamo inesperado';
UPDATE Evento SET codigo_evento = 'club_transferencia_intl' WHERE nombre = 'Transferencia internacional';
UPDATE Evento SET codigo_evento = 'club_vuelta_casa'      WHERE nombre = 'Vuelta a casa';
UPDATE Evento SET codigo_evento = 'club_rescision'        WHERE nombre = 'Rescisión de contrato';
UPDATE Evento SET codigo_evento = 'club_venta'            WHERE nombre = 'Venta inesperada';
UPDATE Evento SET codigo_evento = 'pos_figura_partido'    WHERE nombre = 'Figura del partido';
UPDATE Evento SET codigo_evento = 'pos_gol_agonico'       WHERE nombre = 'Gol agónico';
UPDATE Evento SET codigo_evento = 'pos_ovacion'           WHERE nombre = 'Ovación de la gente';
UPDATE Evento SET codigo_evento = 'pos_premio_rendimiento' WHERE nombre = 'Premio por rendimiento';
UPDATE Evento SET codigo_evento = 'pos_record_personal'   WHERE nombre = 'Récord personal';
UPDATE Evento SET codigo_evento = 'pos_premio_puskas'     WHERE nombre = 'Premio Puskás';
UPDATE Evento SET codigo_evento = 'aleatorio_lado_oscuro' WHERE nombre = 'Caída al lado oscuro';
UPDATE Evento SET codigo_evento = 'aleatorio_perezoso'    WHERE nombre = 'Perezoso';
UPDATE Evento SET codigo_evento = 'aleatorio_lam'         WHERE nombre = 'LAM';
UPDATE Evento SET codigo_evento = 'aleatorio_traicion'    WHERE nombre = 'Traición';
UPDATE Evento SET codigo_evento = 'aleatorio_caramelli'   WHERE nombre = 'Caramelli';
UPDATE Evento SET codigo_evento = 'aleatorio_senor_noche' WHERE nombre = 'Señor de la noche';
UPDATE Evento SET codigo_evento = 'seleccion_hereda_10'   WHERE nombre = 'Heredás la N°10';
UPDATE Evento SET codigo_evento = 'seleccion_titular'     WHERE nombre = 'Titular en la Selección';
UPDATE Evento SET codigo_evento = 'seleccion_gol'         WHERE nombre = 'Gol internacional';
UPDATE Evento SET codigo_evento = 'seleccion_figura'      WHERE nombre = 'Figura internacional';
UPDATE Evento SET codigo_evento = 'seleccion_fuera_lista' WHERE nombre = 'Quedás fuera de la lista';
UPDATE Evento SET codigo_evento = 'seleccion_regreso'     WHERE nombre = 'Regreso a la Selección';
UPDATE Evento SET codigo_evento = 'neg_perdida_gol'       WHERE nombre = 'Pérdida y gol';
UPDATE Evento SET codigo_evento = 'neg_expulsion'         WHERE nombre = 'Expulsión polémica';
UPDATE Evento SET codigo_evento = 'neg_mala_racha'        WHERE nombre = 'Mala racha';
UPDATE Evento SET codigo_evento = 'neg_penal_errado'      WHERE nombre = 'Penal errado';
UPDATE Evento SET codigo_evento = 'neg_vestuario_roto'    WHERE nombre = 'Vestuario roto';
UPDATE Evento SET codigo_evento = 'neg_derrota_clasico'   WHERE nombre = 'Derrota en el clásico';

-- ----------------------------------------------------------------------------
-- 2. Reemplazo del evento 6 "Muerta".
--    La muerte no tiene sentido en una carrera profesional: se convierte en
--    una lesión EXTREMADAMENTE grave que termina la carrera (retiro forzado).
--    El id (6) se conserva; solo cambian nombre, descripción, categoría,
--    efectos y la nueva bandera fin_carrera.
-- ----------------------------------------------------------------------------
ALTER TABLE Evento
    ADD COLUMN fin_carrera TINYINT(1) NOT NULL DEFAULT 0;

UPDATE Evento SET
    nombre = 'Retiro forzado',
    descripcion = 'La lesión fue mucho más grave de lo que se creía: tus médicos te recomiendan el retiro. Tu carrera profesional termina acá.',
    categoria = 'Lesión',
    efecto_fama = 15,          -- reconocimiento final por la carrera
    efecto_plata = -20,        -- se pierde la fuente de ingresos
    efecto_idolatria = 10,     -- el pueblo despide a su ídolo
    bloquea_avance = 1,        -- no avanza más por el tablero
    turnos_perdidos = 0,
    fin_carrera = 1,
    temporada_minima = 1, temporada_maxima = NULL,
    requiere_lesion = 1,       -- solo puede cerrar una lesión seria ya activa
    requiere_seleccion = 0,
    bloquea_si_lesionado = 0,
    cooldown_temporadas = 0,
    peso = 1
WHERE codigo_evento = 'lesion_fin_carrera';

-- ----------------------------------------------------------------------------
-- 2bis. "Muerta" vuelve a su identidad original (humor negro del proyecto).
--    Se conserva la validación nueva: fin_carrera = 1 -> termina la PARTIDA
--    COMPLETA para ambos jugadores (lo aplica el backend).
--    Solo cambia nombre/descripcion; el id (6) y codigo_evento no se tocan.
-- ----------------------------------------------------------------------------
UPDATE Evento SET
    nombre = 'Muerta',
    descripcion = 'Mala suerte: la lesión te costó la vida. Tu carrera —y la partida— terminan acá.',
    categoria = 'Lesión',
    efecto_fama = 15,          -- reconocimiento final por la carrera
    efecto_plata = -20,        -- se pierde la fuente de ingresos
    efecto_idolatria = 10,     -- el pueblo despide a su ídolo
    bloquea_avance = 1,        -- no avanza más por el tablero
    turnos_perdidos = 0,
    fin_carrera = 1,
    temporada_minima = 1, temporada_maxima = NULL,
    requiere_lesion = 1,       -- solo puede ocurrir sobre una lesión seria activa
    requiere_seleccion = 0,
    bloquea_si_lesionado = 0,
    cooldown_temporadas = 0,
    peso = 1
WHERE codigo_evento = 'lesion_fin_carrera';

-- ----------------------------------------------------------------------------
-- 3. Copia de seguridad de los registros existentes antes de tocarlos.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS EstadoCarreraEvento_backup_auditoria
    LIKE EstadoCarreraEvento;
INSERT INTO EstadoCarreraEvento_backup_auditoria
    SELECT * FROM EstadoCarreraEvento;

-- ----------------------------------------------------------------------------
-- 4. Configuración contextual de los 36 eventos (reemplaza a
--    configuracion_eventos_contextuales.sql, corrigiendo los problemas
--    de coherencia futbolística detectados en la auditoría).
-- ----------------------------------------------------------------------------

-- ===== LESIONES (1-6) =====
-- Ninguna lesión nueva mientras ya estás lesionado (incompatibles).
UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 3, peso = 6
WHERE codigo_evento = 'lesion_desgarro';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 3, peso = 5
WHERE codigo_evento = 'lesion_esguince';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 4, peso = 3
WHERE codigo_evento = 'lesion_fractura';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 2, peso = 6
WHERE codigo_evento = 'lesion_molestia';

-- Recuperación: depende de una lesión previa REAL (validación histórica:
-- debe existir un evento de lesión anterior en EstadoCarreraEvento).
UPDATE Evento SET temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 1, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 1, peso = 14
WHERE codigo_evento = 'lesion_recuperacion';

-- Retiro forzado: una vez en la vida, cierra una lesión seria activa.
UPDATE Evento SET peso = 1
WHERE codigo_evento = 'lesion_fin_carrera';

-- ===== CAMBIO DE CLUB (7-12) =====
-- Oferta de Primera: solo tiene sentido desde un club chico/modesto
-- (jerarquía 1 o 2) y rumbo a una categoría superior; temprano en la carrera.
UPDATE Evento SET temporada_minima = 3, temporada_maxima = 14,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 3, peso = 10
WHERE codigo_evento = 'club_oferta_primera';

UPDATE Evento SET temporada_minima = 2, temporada_maxima = 12,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 3, peso = 8
WHERE codigo_evento = 'club_prestamo';

-- Transferencia internacional: exige carrera hecha y un club de nivel medio
-- o alto (los clubes pequeños no exportan jugadores; el destino es otro país).
UPDATE Evento SET temporada_minima = 5, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 4, peso = 5
WHERE codigo_evento = 'club_transferencia_intl';

-- Vuelta a casa: depende de un club ANTERIOR (dependencia histórica
-- validada en el backend contra los clubes recorridos).
UPDATE Evento SET temporada_minima = 4, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 4, peso = 4
WHERE codigo_evento = 'club_vuelta_casa';

-- Rescisión: requiere contrato activo (club actual) y nivel de jugador
-- consistente con un club que puede rescindirte.
UPDATE Evento SET temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 3, peso = 7
WHERE codigo_evento = 'club_rescision';

-- Venta inesperada: solo desde un club de nivel medio/alto (jerarquía >= 3):
-- un club chico no "vende" a un jugador a una categoría inferior.
UPDATE Evento SET temporada_minima = 4, temporada_maxima = 20,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 3, peso = 6
WHERE codigo_evento = 'club_venta';

-- ===== POSITIVOS (13-18) =====
-- Figura del partido: hay que haber JUGADO (bloqueo por lesión) y con un
-- rendimiento mínimo (GRL); el "clásico" de la descripción se ajustó.
UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 12
WHERE codigo_evento = 'pos_figura_partido';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 10
WHERE codigo_evento = 'pos_gol_agonico';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 11
WHERE codigo_evento = 'pos_ovacion';

-- Premio por rendimiento: exige haber jugado esa temporada (sin lesión
-- grave) y un GRL que justifique un reconocimiento.
UPDATE Evento SET temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 3, peso = 7
WHERE codigo_evento = 'pos_premio_rendimiento';

UPDATE Evento SET temporada_minima = 5, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 4, peso = 5
WHERE codigo_evento = 'pos_record_personal';

-- Puskás: hay que HABER MARCADO GOLES (validación en backend: goles > 0)
-- y estar convocado a la Selección (un gol de suficienta calidad como para
-- ganar el Puskás suele ser internacional; se mantiene el requisito).
UPDATE Evento SET temporada_minima = 6, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 1,
  cooldown_temporadas = 5, peso = 2
WHERE codigo_evento = 'pos_premio_puskas';

-- ===== ALEATORIOS (19-24) =====
-- Caída al lado oscuro: apuestas ilegales. Exige temporada mínima (dinero)
-- y, como consecuencia lógica, el evento YA castiga fama/plata/idolatría.
UPDATE Evento SET temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 8
WHERE codigo_evento = 'aleatorio_lado_oscuro';

-- Perezoso / LAM / Traición / Señor de la noche: suponen concentración,
-- compañeros y vida social -> exigimos haber jugado esa temporada.
UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 10
WHERE codigo_evento = 'aleatorio_perezoso';

UPDATE Evento SET temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 9
WHERE codigo_evento = 'aleatorio_lam';

UPDATE Evento SET temporada_minima = 2, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 9
WHERE codigo_evento = 'aleatorio_traicion';

-- Caramelli: es una "recuperación" rápida -> incompatible con estar
-- lesionado (el jugador sano no recupera piernas).
UPDATE Evento SET temporada_minima = 3, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 3, peso = 7
WHERE codigo_evento = 'aleatorio_caramelli';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 10
WHERE codigo_evento = 'aleatorio_senor_noche';

-- ===== SELECCIÓN (25-30) =====
-- Heredás la N°10 / Titular: exigen estar convocado (id_seleccion != NULL):
-- no podés heredar la 10 ni ser titular sin estar en la lista.
-- (Antes: requiere_seleccion = 0, lo que permitía "titular sin convocatoria".)
UPDATE Evento SET temporada_minima = 5, temporada_maxima = 16,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 0,
  cooldown_temporadas = 0, peso = 3
WHERE codigo_evento = 'seleccion_hereda_10';

UPDATE Evento SET temporada_minima = 4, temporada_maxima = 17,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 6
WHERE codigo_evento = 'seleccion_titular';

-- Gol internacional / Figura internacional: convocado Y haber jugado
-- (bloquea_si_lesionado: un lesionado no disputa el encuentro).
UPDATE Evento SET temporada_minima = 4, temporada_maxima = 17,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 8
WHERE codigo_evento = 'seleccion_gol';

UPDATE Evento SET temporada_minima = 6, temporada_maxima = 16,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 1,
  cooldown_temporadas = 3, peso = 4
WHERE codigo_evento = 'seleccion_figura';

-- Quedás fuera de la lista: solo si estabas convocado (antes: 1).
UPDATE Evento SET temporada_minima = 4, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 1, bloquea_si_lesionado = 0,
  cooldown_temporadas = 1, peso = 7
WHERE codigo_evento = 'seleccion_fuera_lista';

-- Regreso a la Selección: el backend valida la dependencia histórica
-- (una convocatoria previa + un período sin convocatorias).
UPDATE Evento SET temporada_minima = 5, temporada_maxima = 18,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 0,
  cooldown_temporadas = 2, peso = 6
WHERE codigo_evento = 'seleccion_regreso';

-- ===== NEGATIVOS DEPORTIVOS (31-36) =====
-- Todos exigen haber participado de partidos (bloquea_si_lesionado = 1):
-- no podés perder una pelota, ser expulsado, fallar un penal o perder un
-- clásico si no jugás.
UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 11
WHERE codigo_evento = 'neg_perdida_gol';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 10
WHERE codigo_evento = 'neg_expulsion';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 8
WHERE codigo_evento = 'neg_mala_racha';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 2, peso = 9
WHERE codigo_evento = 'neg_penal_errado';

UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 10
WHERE codigo_evento = 'neg_vestuario_roto';

-- Derrota en el clásico: solo en ligas con clásico (liga con >1 club de
-- alta jerarquía: se valida en el backend contra los clubes de la liga).
UPDATE Evento SET temporada_minima = 1, temporada_maxima = NULL,
  requiere_lesion = 0, requiere_seleccion = 0, bloquea_si_lesionado = 1,
  cooldown_temporadas = 1, peso = 8
WHERE codigo_evento = 'neg_derrota_clasico';

-- ----------------------------------------------------------------------------
-- 5. Verificación.
-- ----------------------------------------------------------------------------
SELECT id_evento, codigo_evento, nombre, categoria, peso,
       temporada_minima, temporada_maxima, requiere_lesion, requiere_seleccion,
       bloquea_si_lesionado, cooldown_temporadas, fin_carrera
FROM Evento ORDER BY id_evento;

SET SQL_SAFE_UPDATES = 1;
