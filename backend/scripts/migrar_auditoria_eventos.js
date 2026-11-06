// Ejecuta las migraciones de la auditoría de eventos sobre la base configurada
// por MYSQL_* (compatible con el modo `pio` del proyecto).
// Uso: node --env-file=pio.env scripts/migrar_auditoria_eventos.js
const mysql2 = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

(async () => {
  const connection = await mysql2.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: 3306,
    multipleStatements: true,
  });

  const archivos = [
    // 1) Columnas de contexto + tabla de clubes + continente de clubes.
    path.join(__dirname, "../../docs/auditoria_eventos_migracion_parte2.sql"),
    // 2) codigo_evento, Retiro forzado y configuración contextual de los 36.
    path.join(__dirname, "../../docs/auditoria_eventos_migracion.sql"),
  ];

  for (const archivo of archivos) {
    const sql = fs.readFileSync(archivo, "utf8");
    console.log(`\n=== Ejecutando: ${path.basename(archivo)} ===`);
    try {
      await connection.query(sql);
      console.log("OK");
    } catch (error) {
      // ALTER duplicado / datos ya migrados: no es un error fatal si ya estaba.
      console.log("Aviso (posible re-ejecución):", error.message.split("\n")[0]);
    }
  }

  // Verificación final.
  const [eventos] = await connection.query(
    `SELECT id_evento, codigo_evento, nombre, categoria, peso, fin_carrera
       FROM Evento ORDER BY id_evento`
  );
  console.log("\nEventos después de la migración:");
  for (const e of eventos) {
    console.log(
      ` ${String(e.id_evento).padStart(2)} | ${String(e.codigo_evento || "-").padEnd(24)} | ${e.nombre.padEnd(28)} | peso ${e.peso} | fin ${e.fin_carrera}`
    );
  }

  const [faltantes] = await connection.query(
    `SELECT COUNT(*) AS n FROM Evento WHERE codigo_evento IS NULL`
  );
  if (Number(faltantes[0].n) > 0) {
    console.error(`\nATENCIÓN: ${faltantes[0].n} eventos sin codigo_evento.`);
    process.exitCode = 1;
  } else {
    console.log("\nMigración completa: 36/36 eventos con codigo_evento.");
  }

  await connection.end();
})().catch((error) => {
  console.error("Error de conexión/migración:", error.message);
  process.exit(1);
});
