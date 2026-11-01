// backend/models/prioridadModel.js
const { getConnection, closeConnection, oracledb } = require('../config/db');

async function getAll() {
    let connection;
    try {
        connection = await getConnection();
        const sql = `SELECT ID_PRIORIDAD, NOMBRE_PRIORIDAD
                     FROM ADMIN.PRIORIDAD_TICKET
                     ORDER BY ID_PRIORIDAD ASC`;
        const result = await connection.execute(sql);
        return result.rows;
    } catch (err) {
        console.error("Error en prioridadModel.getAll:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getById(idPrioridad) {
    let connection;
    const parsedId = parseInt(idPrioridad);
    if (isNaN(parsedId)) { return null; } // Devuelve null si el ID no es un número
    try {
        connection = await getConnection();
        const sql = `SELECT ID_PRIORIDAD, NOMBRE_PRIORIDAD
                     FROM ADMIN.PRIORIDAD_TICKET
                     WHERE ID_PRIORIDAD = :idPrioridadParam`;
        const result = await connection.execute(sql, { idPrioridadParam: parsedId });
        return result.rows.length ? result.rows[0] : null;
    } catch (err) {
        console.error(`Error en prioridadModel.getById para ID ${parsedId}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

// --- FUNCIÓN create MODIFICADA ---
async function create(nombrePrioridad) {
    let connection;
    try {
        connection = await getConnection();
        // No se selecciona explícitamente de la secuencia.
        // Se confía en el DEFAULT de la columna ID_PRIORIDAD en la tabla.
        const sql = `
            INSERT INTO ADMIN.PRIORIDAD_TICKET (NOMBRE_PRIORIDAD)
            VALUES (:nombre_param)
            RETURNING ID_PRIORIDAD INTO :out_id
        `;
        const binds = {
            nombre_param: nombrePrioridad,
            out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await connection.execute(sql, binds, { autoCommit: false });

        if (result.rowsAffected && result.outBinds && result.outBinds.out_id) {
            await connection.commit();
            return { 
                ID_PRIORIDAD: result.outBinds.out_id[0], 
                NOMBRE_PRIORIDAD: nombrePrioridad
            };
        } else {
            if (connection) { 
                try { await connection.rollback(); } catch (rollErr) { console.error("Error en rollback (inesperado) en prioridadModel.create:", rollErr); }
            }
            throw new Error("No se pudo crear la prioridad o no se retornó el ID.");
        }
    } catch (err) {
        if (connection && !err.transactionCommitted) { 
            try { await connection.rollback(); } catch (rollErr) { console.error("Error en rollback de prioridadModel.create:", rollErr); }
        }
        // El nombre de tu restricción UNIQUE para NOMBRE_PRIORIDAD es SYS_C008445
        if (err.errorNum && err.errorNum === 1 && err.message.toUpperCase().includes("SYS_C008445")) { 
            throw new Error(`La prioridad con nombre '${nombrePrioridad}' ya existe.`);
        }
        console.error("Error en prioridadModel.create:", err);
        throw err; 
    } finally {
        if (connection) {
            await closeConnection(connection);
        }
    }
}
// --- FIN FUNCIÓN create MODIFICADA ---

async function update(idPrioridad, nombrePrioridad) {
    let connection;
    const parsedId = parseInt(idPrioridad);
    if (isNaN(parsedId)) { throw new Error("El ID de prioridad para actualizar debe ser un número."); }
    try {
        connection = await getConnection();
        const currentPrioridad = await getById(parsedId); // Llama a la función getById de este mismo módulo
        if (!currentPrioridad) {
            const error = new Error(`Prioridad con ID ${parsedId} no encontrada para actualizar.`);
            error.statusCode = 404; throw error;
        }
        if (currentPrioridad.NOMBRE_PRIORIDAD === nombrePrioridad) {
            return { noChanges: true, prioridad: currentPrioridad };
        }

        const sql = `UPDATE ADMIN.PRIORIDAD_TICKET
                     SET NOMBRE_PRIORIDAD = :nombre
                     WHERE ID_PRIORIDAD = :id`;
        const binds = { nombre: nombrePrioridad, id: parsedId };
        const result = await connection.execute(sql, binds, { autoCommit: false });

        if (result.rowsAffected > 0) {
            await connection.commit();
            const updatedPrioridad = await getById(parsedId); // Llama a la función getById de este mismo módulo
            return { success: true, prioridad: updatedPrioridad };
        } else {
            await connection.rollback();
            throw new Error("No se pudo actualizar la prioridad o no se encontraron cambios donde se esperaban.");
        }
    } catch (err) {
        if (connection) await connection.rollback();
        if (err.errorNum && err.errorNum === 1 && err.message.toUpperCase().includes("SYS_C008445")) { // Nombre de constraint para NOMBRE_PRIORIDAD UNIQUE
            throw new Error(`Ya existe otra prioridad con el nombre '${nombrePrioridad}'.`);
        }
        console.error("Error en prioridadModel.update:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function remove(idPrioridad) {
    let connection;
    const parsedId = parseInt(idPrioridad);
    if (isNaN(parsedId)) { throw new Error("El ID de prioridad para eliminar debe ser un número.");}
    try {
        connection = await getConnection();
        // La FK_TICKET_PRIORIDAD la configuramos como RESTRICT (NO ACTION por defecto en Oracle)
        const result = await connection.execute(
            `DELETE FROM ADMIN.PRIORIDAD_TICKET WHERE ID_PRIORIDAD = :id`,
            { id: parsedId }, { autoCommit: true } // autoCommit: true es aceptable aquí
        );
        return result.rowsAffected > 0;
    } catch (err) {
        if (err.errorNum && err.errorNum === 2292) { // ORA-02292 (child record found)
            throw new Error("No se puede eliminar la prioridad porque está siendo utilizada por uno o más tickets.");
        }
        console.error("Error en prioridadModel.remove:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

module.exports = { getAll, getById, create, update, remove };