// backend/config/db.js
const oracledb = require('oracledb');
require('dotenv').config(); // Asegura que JWT_SECRET y otras variables de entorno se carguen si se necesitan aquí también

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// Considera aumentar el tamaño del pool si esperas muchos usuarios concurrentes,
// pero el valor predeterminado suele estar bien para cargas moderadas.
// oracledb.poolMin = 4;
// oracledb.poolMax = 10;
// oracledb.poolIncrement = 1;

async function getConnection() {
  try {
    return await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });
  } catch (err) {
    console.error("FATAL: Error al obtener la conexión de la base de datos:", err);
    // En una aplicación real, podrías querer terminar o tener un mecanismo de reintento si la BD está caída.
    // Por ahora, relanzar permite que el llamador (y eventualmente errorHandler) lo maneje.
    throw err;
  }
}

// Utilidad para cerrar una conexión de forma controlada
async function closeConnection(connection) {
    if (connection) {
        try {
            await connection.close();
            // console.log("Conexión a BD cerrada exitosamente."); // Opcional: para depuración
        } catch (err) {
            console.error("Error al cerrar la conexión de la BD:", err);
        }
    }
}

module.exports = { getConnection, closeConnection, oracledb }; // Exporta oracledb para constantes BIND_OUT