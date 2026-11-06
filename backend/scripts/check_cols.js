const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: '10.1.5.205', user: '2026_5INF_G13',
    password: 'ProyectoSocioComuniTARIO', database: '2026_5INF_G13'
  });
  const [cols] = await c.query("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema='2026_5INF_G13' AND table_name='TituloGanado' AND column_name='puntos_obtenidos'");
  console.log('puntos_obtenidos:', cols[0].n);
  const [ti] = await c.query("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema='2026_5INF_G13' AND table_name='TituloIndividual' AND column_name='pais'");
  console.log('TituloIndividual.pais:', ti[0].n);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
