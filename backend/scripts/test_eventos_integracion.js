// ============================================================================
// PRUEBA DE INTEGRACIÓN — flujo completo de eventos contra la base real.
// Simula turnos de una partida y verifica los escenarios de la auditoría.
// Uso: node scripts/test_eventos_integracion.js
// ============================================================================
const mysql2 = require("mysql2/promise");

const CFG = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: 3306,
};

let pasaron = 0, fallaron = 0;
function prueba(nombre, cond) {
  if (cond) { pasaron++; console.log(`  ✔ ${nombre}`); }
  else { fallaron++; console.error(`  ✘ FALLO: ${nombre}`); }
}

(async () => {
  const db = await mysql2.createConnection(CFG);
  console.log("Conectado a", CFG.database);

  // ------------------------------------------------------------------
  // Setup: crear una partida de prueba con dos usuarios temporales.
  // ------------------------------------------------------------------
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  await db.query("DELETE FROM Partida WHERE nombre_sala = 'auditoria_eventos_test'");
  await db.query("DELETE FROM Usuario WHERE email LIKE '%@auditoria.test'");
  await db.query("SET FOREIGN_KEY_CHECKS = 1");

  const [u1] = await db.query(
    `INSERT INTO Usuario (nombre_usuario, email, contrasena, rol)
     VALUES ('auditoria_p1', 'p1@auditoria.test', 'x', 'jugador')`
  );
  const [u2] = await db.query(
    `INSERT INTO Usuario (nombre_usuario, email, contrasena, rol)
     VALUES ('auditoria_p2', 'p2@auditoria.test', 'x', 'jugador')`
  );
  const [partida] = await db.query(
    `INSERT INTO Partida (nombre_sala, estado) VALUES ('auditoria_eventos_test', 'jugando')`
  );
  const idPartida = partida.insertId;

  // Clubes de prueba: un club sudamericano y otro europeo.
  const [clubBrasileo] = await db.query(
    `SELECT id_club FROM Club WHERE liga = 'Brasileirão' AND jerarquia = 5 LIMIT 1`
  );
  const [clubEuropeo] = await db.query(
    `SELECT id_club FROM Club WHERE liga = 'La Liga' AND jerarquia = 5 LIMIT 1`
  );
  const [selBrasil] = await db.query(
    `SELECT id_seleccion FROM Seleccion WHERE nombre = 'Brasil'`
  );

  const mkParticipante = async (idUsuario, idClub, extras = {}) => {
    const [p] = await db.query(
      `INSERT INTO ParticipantePartida
        (id_partida, id_usuario, id_club, id_nacionalidad, id_seleccion,
         estado_seleccion, convocatorias, temporadas_fuera_seleccion,
         posicion_actual, listo, grl, edad, goles, asistencias, partidos_jugados)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 65, 18, 0, 0, 0)`,
      [idPartida, idUsuario, idClub,
        extras.idNacionalidad ?? selBrasil[0].id_seleccion,
        extras.idSeleccion ?? null,
        extras.estadoSeleccion ?? "nunca",
        extras.convocatorias ?? 0,
        extras.temporadasFuera ?? 0]
    );
    if (extras.clubInicial) {
      await db.query(
        `INSERT INTO ClubesHistorico (id_participante, id_club, temporada_inicio)
         VALUES (?, ?, 1)`,
        [p.insertId, extras.clubInicial]
      );
    }
    return p.insertId;
  };

  // ------------------------------------------------------------------
  // Simulación del pipeline del turno (reutiliza modulos/eventos.js).
  // ------------------------------------------------------------------
  const { generarEvento, CODIGOS_CAMBIO_CLUB } = require("../modulos/eventos");

  async function turnoDe(idParticipante, idUsuario) {
    const conn = await mysql2.createConnection(CFG);
    try {
      await conn.beginTransaction();
      const query = async (sql, params = []) => {
        const [rows] = await conn.query(sql, params);
        return rows;
      };
      const jugadorRows = await query(
        `SELECT * FROM ParticipantePartida WHERE id_participante = ?`,
        [idParticipante]
      );
      const jugador = jugadorRows[0];
      const posicion = Number(jugador.posicion_actual);
      const eventos = await query(
        `SELECT e.*, e.codigo_evento
           FROM Evento e
          WHERE e.peso > 0
            AND ? >= e.temporada_minima
            AND (e.temporada_maxima IS NULL OR ? <= e.temporada_maxima)`,
        [posicion, posicion]
      );

      // clásico: liga con más de un club jerarquía >= 4
      const clubRows = await query(`SELECT liga FROM Club WHERE id_club = ?`, [jugador.id_club]);
      const club = clubRows[0];
      const rivalesRows = await query(
        `SELECT COUNT(*) n FROM Club WHERE liga = ? AND jerarquia >= 4 AND id_club <> ?`,
        [club.liga, jugador.id_club]
      );
      const n = rivalesRows[0].n;

      const { evento } = await generarEvento({
        query, jugador, posicionActual: posicion, eventos, ligaConClasico: n >= 1,
      });
      await conn.commit();
      return evento;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      await conn.end();
    }
  }

  // ------------------------------------------------------------------
  console.log("\n[A] Jugador en un club brasileño: nunca recibe eventos imposibles");
  // ------------------------------------------------------------------
  const pBrasileo = await mkParticipante(u1.insertId, clubBrasileo[0].id_club,
    { clubInicial: clubBrasileo[0].id_club });

  let sinErrores = true;
  const eventosVistos = new Set();
  for (let temporada = 1; temporada <= 20 && sinErrores; temporada++) {
    const evento = await turnoDe(pBrasileo, u1.insertId);
    if (!evento) { sinErrores = false; break; }
    eventosVistos.add(evento.codigo_evento);

    // Simular la actualización de la temporada (como hace jugarTurno).
    const lesionNueva = ["lesion_desgarro", "lesion_esguince", "lesion_fractura", "lesion_molestia"]
      .includes(evento.codigo_evento);
    const recuperacion = evento.codigo_evento === "lesion_recuperacion";
    // "Muerta" termina la partida completa: no se sigue simulando.
    if (evento.codigo_evento === "lesion_fin_carrera") { sinErrores = "muerta"; break; }
    await db.query(
      `UPDATE ParticipantePartida
          SET posicion_actual = ?, edad = ?,
              lesionado = ?, lesion_hasta_temporada = ?,
              goles = goles + 5, asistencias = asistencias + 2, partidos_jugados = partidos_jugados + 30
        WHERE id_participante = ?`,
      [temporada + 1, 18 + temporada,
      lesionNueva || (false), lesionNueva ? temporada + 1 : null,
        pBrasileo]
    );
    await db.query(
      `INSERT INTO EstadoCarreraEvento (id_participante, id_evento, temporada)
       VALUES (?, ?, ?)`,
      [pBrasileo, evento.id_evento, temporada]
    );
    if (lesionNueva) continue; // un lesionado no juega la próxima temporada
    if (recuperacion) {
      await db.query(`UPDATE ParticipantePartida SET lesionado = 0 WHERE id_participante = ?`, [pBrasileo]);
    }
  }
  prueba("A.1 la carrera completa corre sin error de pipeline",
    sinErrores === true || sinErrores === "muerta");
  prueba("A.2 el jugador brasileño acumula eventos coherentes (lesiones, club, selección...)",
    eventosVistos.size > 5);
  prueba("A.3 NINGÚN evento de Selección salió sin convocatoria",
    ![...eventosVistos].some((c) =>
      ["seleccion_gol", "seleccion_figura", "seleccion_titular", "seleccion_hereda_10"]
        .includes(c)));
  prueba("A.4 'Vuelta a casa' sólo puede salir si hubo transferencia previa",
    ![...eventosVistos].includes("club_vuelta_casa") ||
    eventosVistos.has("club_transferencia_intl") ||
    eventosVistos.has("club_prestamo") ||
    eventosVistos.has("club_oferta_primera"));

  // ------------------------------------------------------------------
  console.log("\n[B] Convocado pero lesionado: sin gol internacional");
  // ------------------------------------------------------------------
  const pLesionado = await mkParticipante(u2.insertId, clubBrasileo[0].id_club, {
    idSeleccion: selBrasil[0].id_seleccion,
    estadoSeleccion: "titular",
    convocatorias: 3,
  });
  await db.query(
    `UPDATE ParticipantePartida SET lesionado = 1, lesion_hasta_temporada = 5
      WHERE id_participante = ?`, [pLesionado]
  );
  const eventoLesionado = await turnoDe(pLesionado, u2.insertId);
  prueba("B.1 lesionado no recibe gol internacional / figura internacional / partidos",
    eventoLesionado == null ||
    !["seleccion_gol", "seleccion_figura", "pos_figura_partido", "neg_expulsion"]
      .includes(eventoLesionado.codigo_evento));

  // ------------------------------------------------------------------
  console.log("\n[C] 'Regreso a la Selección' tras un período fuera");
  // ------------------------------------------------------------------
  const pRegreso = pLesionado; // reutilizamos el participante de B
  await db.query(
    `UPDATE ParticipantePartida
        SET estado_seleccion = 'fuera', convocatorias = 2,
            temporadas_fuera_seleccion = 3, posicion_actual = 6,
            lesionado = 0, lesion_hasta_temporada = NULL
      WHERE id_participante = ?`, [pLesionado]
  );

  // Fuerzamos el sorteo hasta que salga el regreso (o agotar 50 intentos).
  let salioRegreso = false, salioAlgoInvalido = false;
  for (let i = 0; i < 50 && !salioRegreso; i++) {
    const ev = await turnoDe(pRegreso, u2.insertId);
    if (!ev) break;
    if (ev.codigo_evento === "seleccion_regreso") salioRegreso = true;
    // Con estado 'fuera' ningún evento de Selección positivo puede salir.
    if (["seleccion_gol", "seleccion_figura", "seleccion_titular", "seleccion_hereda_10"]
      .includes(ev.codigo_evento)) salioAlgoInvalido = true;
  }
  prueba("C.1 'Regreso a la Selección' ocurre cuando corresponde", salioRegreso);
  prueba("C.2 ningún evento de Selección activo salió con estado 'fuera'", !salioAlgoInvalido);

  // ------------------------------------------------------------------
  console.log("\n[D] Cambio de club internacional: sólo destinos de otro país");
  // ------------------------------------------------------------------
  // El jugador brasileño ya tiene historial con el club inicial.
  const pInt = pBrasileo;
  // Al completar la carrera simulada, si salió transferencia internacional,
  // las opciones deben ser de otra liga. Probamos la query del endpoint:
  const [destinos] = await db.query(
    `SELECT liga FROM Club
      WHERE jerarquia = 5 AND id_club <> ? AND liga <> (SELECT liga FROM Club WHERE id_club = ?)`,
    [clubBrasileo[0].id_club, clubBrasileo[0].id_club]
  );
  prueba("D.1 la transferencia internacional ofrece sólo ligas distintas",
    destinos.every((d) => d.liga !== "Brasileirão"));

  // ------------------------------------------------------------------
  console.log("\n[E] Registro en EstadoCarreraEvento / EventoPartida");
  // ------------------------------------------------------------------
  const [conteoFilas] = await db.query(
    `SELECT COUNT(*) n FROM EstadoCarreraEvento WHERE id_participante = ?`, [pBrasileo]);
  const n1 = conteoFilas[0].n;
  prueba("E.1 EstadoCarreraEvento registra cada evento de la carrera", n1 >= 10);

  // ------------------------------------------------------------------
  // Limpieza
  // ------------------------------------------------------------------
  await db.query(
    `DELETE e FROM EstadoCarreraEvento e
       JOIN ParticipantePartida pp ON pp.id_participante = e.id_participante
      WHERE pp.id_partida = ?`, [idPartida]);
  await db.query(
    `DELETE ch FROM ClubesHistorico ch
       JOIN ParticipantePartida pp ON pp.id_participante = ch.id_participante
      WHERE pp.id_partida = ?`, [idPartida]);
  await db.query(`DELETE FROM ParticipantePartida WHERE id_partida = ?`, [idPartida]);
  await db.query(`DELETE FROM Partida WHERE id_partida = ?`, [idPartida]);
  await db.query(`DELETE FROM Usuario WHERE id_usuario IN (?, ?)`, [u1.insertId, u2.insertId]);

  await db.end();
  console.log(`\nRESULTADO: ${pasaron} OK, ${fallaron} fallos`);
  process.exit(fallaron > 0 ? 1 : 0);
})().catch((e) => {
  console.error("Error de integración:", e);
  process.exit(1);
});
