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
  const sql = fs.readFileSync('../docs/limpieza_titulos_selecciones.sql', 'utf8');
  await c.query(sql);
  const [s] = await c.query('SELECT * FROM Seleccion ORDER BY id_seleccion');
  console.log('SELECC', JSON.stringify(s));
  const [ti] = await c.query('SELECT id_titulo_internacional, nombre, puntos_campeon, tipo_seleccion, continente FROM TituloInternacional ORDER BY id_titulo_internacional');
  console.log('INTL', JSON.stringify(ti));
  const [fem] = await c.query("SELECT COUNT(*) n FROM TituloInternacional WHERE nombre LIKE '%emenin%'");
  console.log('FEM', JSON.stringify(fem));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
