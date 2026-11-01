// backend/models/estadoTicketModel.js
const { getConnection, closeConnection } = require('../config/db');

async function getAll() {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT ID_ESTADO, NOMBRE_ESTADO FROM ADMIN.ESTADO_TICKET ORDER BY ID_ESTADO ASC`
        );
        return result.rows;
    } catch (err) {
        console.error("Error en estadoTicketModel.getAll:", err);
        throw err;
    } finally {
        if (connection) {
            try {
                await closeConnection(connection);
            } catch (closeErr) {
                console.error("Error cerrando conexión en estadoTicketModel.getAll:", closeErr);
            }
        }
    }
}

module.exports = { getAll };