const mysql = require("mysql2/promise");

(async () => {
  const conexion = await mysql.createConnection({
    host: "10.1.5.205",
    user: "2026_5INF_G13",
    password: "ProyectoSocioComuniTARIO",
    database: "2026_5INF_G13"
  });

  const buscados = [
    "Golden Boy", "Kopa", "Ligue 1", "Premier League", "Serie A", "Liga MX",
    "J1 League", "Copa MX", "Saud", "Intercontinental", "Africana",
    "Árabe", "Arabe", "Copa Argentina", "Austrian"
  ];

  const tablas = [
    ["Titulo", "id_titulo", "nacional"],
    ["TituloInternacional", "id_titulo_internacional", "internacional"],
    ["TituloIndividual", "id_titulo_individual", "individual"]
  ];

  for (const [tabla, id, tipo] of tablas) {
    const [filas] = await conexion.query(`SELECT * FROM ${tabla}`);
    for (const f of filas) {
      if (f.imagen && buscados.some((b) => f.nombre.toLowerCase().includes(b.toLowerCase()))) {
        console.log(`[${tipo}] ${f.nombre} | ${f.imagen}`);
      }
    }
  }

  await conexion.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
