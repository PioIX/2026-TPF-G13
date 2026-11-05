// Restaura el evento "Muerta" (id 6) con la validación de fin de partida.
const mysql2 = require("mysql2/promise");

(async () => {
  const c = await mysql2.createConnection({
    host: "10.1.5.205", user: "2026_5INF_G13",
    password: "ProyectoSocioComuniTARIO", database: "2026_5INF_G13",
  });

  await c.query(
    `UPDATE Evento SET
        nombre = 'Muerta',
        descripcion = 'Mala suerte: la lesión te costó la vida. Tu carrera —y la partida— terminan acá.',
        categoria = 'Lesión',
        efecto_fama = 15,
        efecto_plata = -20,
        efecto_idolatria = 10,
        bloquea_avance = 1,
        turnos_perdidos = 0,
        fin_carrera = 1,
        temporada_minima = 1, temporada_maxima = NULL,
        requiere_lesion = 1,
        requiere_seleccion = 0,
        bloquea_si_lesionado = 0,
        cooldown_temporadas = 0,
        peso = 1
      WHERE codigo_evento = 'lesion_fin_carrera'`
  );

  const [r] = await c.query(
    `SELECT id_evento, codigo_evento, nombre, descripcion, categoria,
            efecto_fama, efecto_plata, efecto_idolatria, peso, fin_carrera,
            requiere_lesion
       FROM Evento WHERE codigo_evento = 'lesion_fin_carrera'`
  );
  console.log(JSON.stringify(r, null, 1));
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
