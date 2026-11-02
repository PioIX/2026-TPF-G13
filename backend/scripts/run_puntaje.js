const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const c = await mysql.createConnection({
    host: '10.1.5.205',
    user: '2026_5INF_G13',
    password: 'ProyectoSocioComuniTARIO',
    database: '2026_5INF_G13',
    multipleStatements: true
  });
  const sql = fs.readFileSync('../docs/puntaje_edades_titulos.sql', 'utf8');
  await c.query(sql);
  const [t] = await c.query('SELECT id_titulo, nombre, pais, puntos_campeon, prestigio FROM Titulo ORDER BY pais, prestigio DESC');
  console.log('TITULOS', JSON.stringify(t, null, 1));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
