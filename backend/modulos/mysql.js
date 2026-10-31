//Sección MySQL del código
const mySql = require("mysql2/promise");

/**
 * Objeto con la configuración de la base de datos MySQL a utilizar.
 */
const SQL_CONFIGURATION_DATA =
{
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DB,
	port: 3306,
	charset: 'UTF8_GENERAL_CI'

}

/**
 * Realiza una query a la base de datos MySQL indicada en el archivo "mysql.js".
 * @param {String} queryString Query que se desea realizar. Textual como se utilizaría en el MySQL Workbench.
 * @returns Respuesta de la base de datos. Suele ser un vector de objetos.
 */

exports.realizarQuery = async function (queryString, parametros = []) {
  let returnObject;
  let connection;

  try {
    connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);

    returnObject = await connection.query(
      queryString,
      parametros
    );
  } catch (err) {
    console.log(err);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  return returnObject[0];
};

//→ INSERT donde necesitamos obtener el ID generado.
exports.realizarQueryInsert = async function (queryString, parametros = []) {
    let connection;

    try {
        connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);

        const [resultado] = await connection.query(queryString, parametros);

        return resultado.insertId;

    } catch (err) {
        console.log(err);
    } finally {
        if (connection && connection.end) {
            connection.end();
        }
    }
}



exports.realizarTransaccion = async function (callback) {
    const connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);

    try {
        await connection.beginTransaction();

        const query = async (sql, parametros = []) => {
            const [resultado] = await connection.query(sql, parametros);
            return resultado;
        };

        const resultado = await callback(query);

        await connection.commit();
        return resultado;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
};

