// backend/models/tecnicoModel.js
const { getConnection, closeConnection, oracledb } = require('../config/db');

async function create(tecnicoData) {
    let connection;
    const { nombre_completo, correo, especialidad, usuario_login, contrasena_hash, activo } = tecnicoData;
    const sql = `
        INSERT INTO ADMIN.TECNICO 
        (NOMBRE_COMPLETO, CORREO, ESPECIALIDAD, USUARIO_LOGIN, CONTRASENA, FECHA_CREACION, ACTIVO)
        VALUES (:nombre_completo, :correo, :especialidad, :usuario_login, :contrasena_hash, SYSDATE, :activo_param)
        RETURNING ID_TECNICO INTO :out_id_tecnico
    `;
    const binds = {
        nombre_completo, correo, especialidad, usuario_login, contrasena_hash,
        activo_param: activo !== undefined ? String(activo).toUpperCase() : 'S',
        out_id_tecnico: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds, { autoCommit: false });
        if (result.rowsAffected && result.outBinds && result.outBinds.out_id_tecnico) {
            await connection.commit();
            const newTecnicoId = result.outBinds.out_id_tecnico[0];
            return { ID_TECNICO: newTecnicoId, USUARIO_LOGIN: usuario_login, NOMBRE_COMPLETO: nombre_completo, ACTIVO: binds.activo_param };
        } else {
            await connection.rollback();
            throw new Error("No se pudo crear el técnico.");
        }
    } catch (err) {
        if (connection) await connection.rollback();
        if (err.errorNum && err.errorNum === 1) {
            if (err.message.toUpperCase().includes("UK_TECNICO_CORREO") || err.message.toUpperCase().includes("SYS_C008469")) { 
                throw new Error(`El correo '${correo}' ya está registrado para otro técnico.`);
            }
            if (err.message.toUpperCase().includes("UK_TECNICO_LOGIN") || err.message.toUpperCase().includes("SYS_C008470")) { 
                throw new Error(`El nombre de usuario '${usuario_login}' ya está en uso por otro técnico.`);
            }
        }
        console.error("Error en tecnicoModel.create:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function findByLogin(usuario_login) {
    let connection;
    const sql = `SELECT ID_TECNICO, USUARIO_LOGIN, CONTRASENA, NOMBRE_COMPLETO, CORREO, ESPECIALIDAD, ACTIVO FROM ADMIN.TECNICO WHERE USUARIO_LOGIN = :usuario_login_param`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { usuario_login_param: usuario_login });
        return result.rows.length ? result.rows[0] : null;
    } catch (err) {
        console.error(`Error en tecnicoModel.findByLogin para ${usuario_login}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getById(idTecnico) {
    let connection;
    const parsedId = parseInt(idTecnico);
    if (isNaN(parsedId)) { throw new Error("El ID de técnico debe ser un número válido."); }
    const sql = `SELECT ID_TECNICO, NOMBRE_COMPLETO, CORREO, ESPECIALIDAD, USUARIO_LOGIN, ACTIVO, FECHA_CREACION, FECHA_MODIFICACION FROM ADMIN.TECNICO WHERE ID_TECNICO = :id_tecnico_param`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { id_tecnico_param: parsedId });
        return result.rows.length ? result.rows[0] : null;
    } catch (err) {
        console.error(`Error en tecnicoModel.getById para ID ${parsedId}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getAll() {
    let connection;
    const sql = `SELECT ID_TECNICO, NOMBRE_COMPLETO, CORREO, ESPECIALIDAD, USUARIO_LOGIN, ACTIVO FROM ADMIN.TECNICO ORDER BY NOMBRE_COMPLETO ASC`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql);
        return result.rows;
    } catch (err) {
        console.error("Error en tecnicoModel.getAll:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function update(idTecnico, tecnicoData) {
    let connection;
    const parsedIdTecnico = parseInt(idTecnico);
    if (isNaN(parsedIdTecnico)) { throw new Error("El ID de técnico para actualizar debe ser un número."); }
    
    let fieldsToUpdate = [];
    const binds = { id_tecnico_param: parsedIdTecnico, fecha_modificacion: new Date() };

    if (tecnicoData.nombre_completo !== undefined) {
        fieldsToUpdate.push("NOMBRE_COMPLETO = :nombre_completo_param");
        binds.nombre_completo_param = tecnicoData.nombre_completo;
    }
    if (tecnicoData.correo !== undefined) {
        fieldsToUpdate.push("CORREO = :correo_param");
        binds.correo_param = tecnicoData.correo;
    }
    if (tecnicoData.especialidad !== undefined) {
        fieldsToUpdate.push("ESPECIALIDAD = :especialidad_param");
        binds.especialidad_param = tecnicoData.especialidad;
    }
    if (tecnicoData.activo !== undefined) {
        const activoUpper = String(tecnicoData.activo).toUpperCase();
        if (['S', 'N'].includes(activoUpper)) {
            fieldsToUpdate.push("ACTIVO = :activo_param");
            binds.activo_param = activoUpper;
        } else {
            throw new Error("El valor para 'activo' debe ser 'S' o 'N'.");
        }
    }
    if (tecnicoData.contrasena_hash !== undefined) {
        fieldsToUpdate.push("CONTRASENA = :contrasena_hash_param");
        binds.contrasena_hash_param = tecnicoData.contrasena_hash;
    }
    
    if (fieldsToUpdate.length === 0) {
        const currentTecnico = await getById(parsedIdTecnico); // Obtener el técnico actual para devolverlo
        if (!currentTecnico) throw new Error(`Técnico con ID ${parsedIdTecnico} no encontrado.`); // Si no existe, no hay "noChanges"
        return { noChanges: true, tecnico: currentTecnico };
    }
    
    fieldsToUpdate.push("FECHA_MODIFICACION = :fecha_modificacion");
    const sql = `UPDATE ADMIN.TECNICO SET ${fieldsToUpdate.join(', ')} WHERE ID_TECNICO = :id_tecnico_param`;

    try {
        connection = await getConnection();
        const currentTecnicoBeforeUpdate = await getById(parsedIdTecnico); // Verificar existencia antes de update
        if (!currentTecnicoBeforeUpdate) {
             throw new Error(`Técnico con ID ${parsedIdTecnico} no encontrado para actualizar.`);
        }

        const result = await connection.execute(sql, binds, { autoCommit: false });
        
        if (result.rowsAffected > 0) {
            await connection.commit();
            const updatedTecnico = await getById(parsedIdTecnico); // Devolver el técnico actualizado
            return { success: true, tecnico: updatedTecnico };
        } else {
            // Si no afectó filas, pero sabemos que existía, es que los datos eran idénticos (ya manejado por noChanges)
            // O un error muy raro.
            await connection.rollback(); 
            return { noChanges: true, tecnico: currentTecnicoBeforeUpdate, message: "Los datos proporcionados eran idénticos a los existentes." };
        }
    } catch (err) {
        if (connection) await connection.rollback();
        if (err.errorNum && err.errorNum === 1) { 
            throw new Error("Error de constraint único al actualizar técnico (correo o login probablemente duplicado).");
        }
        console.error("Error en tecnicoModel.update:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function remove(idTecnico) {
    let connection;
    const parsedId = parseInt(idTecnico);
    if (isNaN(parsedId)) { throw new Error("El ID de técnico para eliminar debe ser un número."); }
    const sql = `DELETE FROM ADMIN.TECNICO WHERE ID_TECNICO = :id_tecnico_param`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { id_tecnico_param: parsedId }, { autoCommit: true });
        return result.rowsAffected > 0;
    } catch (err) {
        console.error("Error en tecnicoModel.remove:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

module.exports = { create, findByLogin, getById, getAll, update, remove };