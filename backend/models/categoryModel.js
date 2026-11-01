// backend/models/categoryModel.js
const { getConnection, closeConnection, oracledb } = require('../config/db');

async function getAll() {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT ID_CATEGORIA, NOMBRE_CATEGORIA, DESCRIPCION
             FROM ADMIN.CATEGORIA
             ORDER BY NOMBRE_CATEGORIA ASC`
        );
        return result.rows;
    } finally {
        await closeConnection(connection);
    }
}

async function getById(idCategoria) {
    let connection;
    const parsedId = parseInt(idCategoria);
    if (isNaN(parsedId)) { throw new Error("El ID de categoría debe ser un número."); }
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT ID_CATEGORIA, NOMBRE_CATEGORIA, DESCRIPCION
             FROM ADMIN.CATEGORIA
             WHERE ID_CATEGORIA = :idCategoriaParam`,
            { idCategoriaParam: parsedId }
        );
        return result.rows.length ? result.rows[0] : null;
    } finally {
        await closeConnection(connection);
    }
}

// --- FUNCIÓN create MODIFICADA ---
async function create(nombreCategoria, descripcion) {
    let connection;
    try {
        connection = await getConnection();
        // No se selecciona explícitamente de la secuencia.
        // Se confía en el DEFAULT de la columna ID_CATEGORIA en la tabla.
        const sql = `
            INSERT INTO ADMIN.CATEGORIA (NOMBRE_CATEGORIA, DESCRIPCION)
            VALUES (:nombre_param, :descripcion_param)
            RETURNING ID_CATEGORIA INTO :out_id
        `;
        const binds = {
            nombre_param: nombreCategoria,
            descripcion_param: descripcion,
            out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await connection.execute(sql, binds, { autoCommit: false });

        if (result.rowsAffected && result.outBinds && result.outBinds.out_id) {
            await connection.commit();
            return { 
                ID_CATEGORIA: result.outBinds.out_id[0], 
                NOMBRE_CATEGORIA: nombreCategoria, 
                DESCRIPCION: descripcion 
            };
        } else {
            // Si no hubo autoCommit y algo falló antes de retornar ID (poco probable aquí si el SQL es correcto)
            if (connection) { 
                try { await connection.rollback(); } catch (rollErr) { console.error("Error en rollback (inesperado):", rollErr); }
            }
            throw new Error("No se pudo crear la categoría o no se retornó el ID.");
        }
    } catch (err) {
        if (connection && !err.transactionCommitted) { // Solo hacer rollback si la conexión existe y no se hizo commit
            try { await connection.rollback(); } catch (rollErr) { console.error("Error en rollback de categoryModel.create:", rollErr); }
        }
        // El nombre de tu restricción UNIQUE para NOMBRE_CATEGORIA es UQ_NOMBRE_CATEGORIA
        // según tu DDL más reciente para la tabla CATEGORIA.
        // El SYS_C008448 podría ser de otra tabla o una versión anterior.
        if (err.errorNum && err.errorNum === 1 && err.message.toUpperCase().includes("UQ_NOMBRE_CATEGORIA")) { 
            throw new Error(`La categoría con nombre '${nombreCategoria}' ya existe.`);
        }
        // Si es ORA-00001 pero en PK_CATEGORIA, es un problema de secuencia si este código se usa incorrectamente.
        // Pero con este enfoque (dejando que el DEFAULT de la tabla funcione), no debería ocurrir en PK.
        console.error("Error en categoryModel.create:", err);
        throw err; 
    } finally {
        if (connection) {
            await closeConnection(connection);
        }
    }
}
// --- FIN FUNCIÓN create MODIFICADA ---

async function update(idCategoria, nombreCategoria, descripcion) {
    let connection;
    const parsedId = parseInt(idCategoria);
    if (isNaN(parsedId)) { throw new Error("El ID de categoría para actualizar debe ser un número."); }
    try {
        connection = await getConnection();
        const currentCategory = await getById(parsedId); // Llama a la función getById de este mismo módulo
        if (!currentCategory) {
            const error = new Error(`Categoría con ID ${parsedId} no encontrada para actualizar.`);
            error.statusCode = 404; throw error;
        }

        const finalName = nombreCategoria !== undefined ? nombreCategoria : currentCategory.NOMBRE_CATEGORIA;
        const finalDesc = descripcion !== undefined ? descripcion : currentCategory.DESCRIPCION;

        if (currentCategory.NOMBRE_CATEGORIA === finalName && currentCategory.DESCRIPCION === finalDesc) {
            return { noChanges: true, categoria: currentCategory };
        }

        const result = await connection.execute(
            `UPDATE ADMIN.CATEGORIA
             SET NOMBRE_CATEGORIA = :nombre, DESCRIPCION = :descripcion
             WHERE ID_CATEGORIA = :id`,
            { nombre: finalName, descripcion: finalDesc, id: parsedId },
            { autoCommit: false }
        );

        if (result.rowsAffected > 0) {
            await connection.commit();
            const updatedCategory = await getById(parsedId); // Llama a la función getById de este mismo módulo
            return { success: true, categoria: updatedCategory };
        } else {
            await connection.rollback();
            throw new Error("No se pudo actualizar la categoría o no se encontraron cambios donde se esperaban.");
        }
    } catch (err) {
        if (connection) await connection.rollback(); 
        // Usar el nombre correcto de la restricción UNIQUE para NOMBRE_CATEGORIA
        if (err.errorNum && err.errorNum === 1 && err.message.toUpperCase().includes("UQ_NOMBRE_CATEGORIA")) {
            throw new Error(`Ya existe otra categoría con el nombre '${finalName || nombreCategoria}'.`); // Usar finalName si está disponible
        }
        console.error("Error en categoryModel.update:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function remove(idCategoria) {
    let connection;
    const parsedId = parseInt(idCategoria);
    if (isNaN(parsedId)) { throw new Error("El ID de categoría para eliminar debe ser un número."); }
    try {
        connection = await getConnection();
        // El comentario sobre ON DELETE CASCADE es importante, pero la FK_TICKET_CATEGORIA la configuramos como RESTRICT (NO ACTION)
        const result = await connection.execute(
            `DELETE FROM ADMIN.CATEGORIA WHERE ID_CATEGORIA = :id`,
            { id: parsedId }, { autoCommit: true } // autoCommit: true es aceptable para un solo DELETE
        );
        return result.rowsAffected > 0;
    } catch(err) {
        // ORA-02292: child record found (si la FK FK_TICKET_CATEGORIA es RESTRICT/NO ACTION)
        if (err.errorNum && err.errorNum === 2292) { 
            throw new Error("No se puede eliminar la categoría porque está siendo utilizada por uno o más tickets.");
        }
        console.error("Error en categoryModel.remove:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

module.exports = { getAll, getById, create, update, remove };