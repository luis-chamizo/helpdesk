// backend/models/ticketModel.js
const { getConnection, closeConnection, oracledb } = require('../config/db');
const { readClob } = require('../utils/dbUtils');

// --- Funciones Auxiliares Internas del Modelo ---
async function processAndReadClobForRow(row) {
    const newRow = { ...row };
    if (newRow.DESCRIPCION) {
        newRow.DESCRIPCION = await readClob(newRow.DESCRIPCION);
    }
    return newRow;
}

async function processAndReadClobForRows(rows) {
    if (!rows || !rows.length) return [];
    return Promise.all(rows.map(row => processAndReadClobForRow(row)));
}

// --- Funciones Principales del Modelo ---
async function create(ticketData) {
    let connection;
    const { id_usuario, id_categoria, id_prioridad, titulo, descripcion, id_estado } = ticketData;
    const sql = id_estado
        ? `INSERT INTO ADMIN.TICKET (ID_USUARIO, ID_CATEGORIA, ID_PRIORIDAD, TITULO, DESCRIPCION, ID_ESTADO, FECHA_CREACION, FECHA_ACTUALIZACION)
           VALUES (:id_usuario_param, :id_categoria_param, :id_prioridad_param, :titulo_param, :descripcion_param, :id_estado_param, SYSDATE, SYSDATE)
           RETURNING ID_TICKET INTO :out_id_ticket`
        : `INSERT INTO ADMIN.TICKET (ID_USUARIO, ID_CATEGORIA, ID_PRIORIDAD, TITULO, DESCRIPCION, FECHA_CREACION, FECHA_ACTUALIZACION)
           VALUES (:id_usuario_param, :id_categoria_param, :id_prioridad_param, :titulo_param, :descripcion_param, SYSDATE, SYSDATE)
           RETURNING ID_TICKET INTO :out_id_ticket`;
    const binds = {
        id_usuario_param: parseInt(id_usuario),
        id_categoria_param: parseInt(id_categoria),
        id_prioridad_param: parseInt(id_prioridad),
        titulo_param: titulo,
        descripcion_param: descripcion,
        out_id_ticket: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };
    if (id_estado) { binds.id_estado_param = parseInt(id_estado); }
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds, { autoCommit: false }); 
        if (result.rowsAffected && result.outBinds && result.outBinds.out_id_ticket) {
            await connection.commit();
            return { ID_TICKET: result.outBinds.out_id_ticket[0], TITULO: titulo, ID_USUARIO: parseInt(id_usuario) }; 
        } else {
            await connection.rollback();
            throw new Error("No se pudo crear el ticket en la base de datos.");
        }
    } catch (err) {
        if (connection) { try { await connection.rollback(); } catch (rollErr) { console.error("Error rollback en ticketModel.create:", rollErr); }}
        console.error("Error detallado en ticketModel.create:", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getByIdWithDetails(idTicket) {
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    if (isNaN(parsedIdTicket)) { throw new Error("El ID del ticket proporcionado no es un número válido."); }
    const sql = `
        SELECT 
            t.ID_TICKET, t.TITULO, t.DESCRIPCION, t.FECHA_CREACION,
            t.FECHA_ACTUALIZACION, t.FECHA_CIERRE,
            cat.ID_CATEGORIA, cat.NOMBRE_CATEGORIA,  -- Usando alias 'cat' para CATEGORIA
            p.ID_PRIORIDAD, p.NOMBRE_PRIORIDAD, 
            e.ID_ESTADO, e.NOMBRE_ESTADO,
            u.ID_USUARIO, u.NOMBRE_COMPLETO AS NOMBRE_USUARIO_REPORTA, u.CORREO AS USUARIO_CORREO, u.AREA AS USUARIO_AREA, -- Usando alias 'u' para USUARIO
            tec.ID_TECNICO AS ID_TECNICO_ASIGNADO, COALESCE(tec.NOMBRE_COMPLETO, 'Sin asignar') AS NOMBRE_TECNICO_ASIGNADO, tec.CORREO AS TECNICO_CORREO
        FROM ADMIN.TICKET t
        JOIN ADMIN.CATEGORIA cat ON t.ID_CATEGORIA = cat.ID_CATEGORIA -- CORREGIDO a ADMIN.CATEGORIA con alias 'cat'
        JOIN ADMIN.PRIORIDAD_TICKET p ON t.ID_PRIORIDAD = p.ID_PRIORIDAD
        JOIN ADMIN.ESTADO_TICKET e ON t.ID_ESTADO = e.ID_ESTADO
        JOIN ADMIN.USUARIO u ON t.ID_USUARIO = u.ID_USUARIO -- CORREGIDO para usar ID_USUARIO de TICKET
        LEFT JOIN ADMIN.TECNICO tec ON t.ID_TECNICO_ASIGNADO = tec.ID_TECNICO
        WHERE t.ID_TICKET = :idTicketParam
    `;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idTicketParam: parsedIdTicket });
        if (result.rows.length > 0) {
            return await processAndReadClobForRow(result.rows[0]);
        }
        return null; 
    } catch (err) {
        console.error(`Error en ticketModel.getByIdWithDetails para ID ${parsedIdTicket}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getTicketsByUserId(idUsuario) { // Esta es la función que da el error
    let connection;
    const parsedIdUsuario = parseInt(idUsuario);
    if (isNaN(parsedIdUsuario)) { throw new Error("El ID de usuario proporcionado no es un número válido."); }
    const sql = `
        SELECT
            t.ID_TICKET, t.TITULO, t.DESCRIPCION, t.FECHA_CREACION, t.FECHA_ACTUALIZACION, t.FECHA_CIERRE,
            e.NOMBRE_ESTADO, e.ID_ESTADO, 
            p.NOMBRE_PRIORIDAD, p.ID_PRIORIDAD,
            cat.NOMBRE_CATEGORIA, cat.ID_CATEGORIA,
            COALESCE(tec.NOMBRE_COMPLETO, 'Sin asignar') AS NOMBRE_TECNICO_ASIGNADO,
            u.NOMBRE_COMPLETO AS NOMBRE_USUARIO_REPORTA 
        FROM ADMIN.TICKET t
        JOIN ADMIN.ESTADO_TICKET e ON t.ID_ESTADO = e.ID_ESTADO
        JOIN ADMIN.PRIORIDAD_TICKET p ON t.ID_PRIORIDAD = p.ID_PRIORIDAD
        JOIN ADMIN.CATEGORIA cat ON t.ID_CATEGORIA = cat.ID_CATEGORIA -- CORREGIDO a ADMIN.CATEGORIA con alias 'cat'
        JOIN ADMIN.USUARIO u ON t.ID_USUARIO = u.ID_USUARIO -- CORREGIDO para usar ID_USUARIO de TICKET
        LEFT JOIN ADMIN.TECNICO tec ON t.ID_TECNICO_ASIGNADO = tec.ID_TECNICO
        WHERE t.ID_USUARIO = :idUsuarioParam -- CORREGIDO para usar ID_USUARIO de TICKET
        ORDER BY t.FECHA_ACTUALIZACION DESC, t.FECHA_CREACION DESC
    `;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idUsuarioParam: parsedIdUsuario });
        return await processAndReadClobForRows(result.rows);
    } catch (err) {
        // El error que me mostraste apunta a esta función y esta línea
        console.error(`Error en ticketModel.getTicketsByUserId para usuario ID ${parsedIdUsuario}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getAllTicketsForAdmin(filtros = {}) {
    let connection;
    let whereClauses = [];
    const binds = {};
    // ... (lógica de filtros que ya te di, asegúrate que los nombres de tabla sean correctos)
    if (filtros.id_estado) { whereClauses.push("e.ID_ESTADO = :id_e"); binds.id_e = parseInt(filtros.id_estado); }
    if (filtros.id_prioridad) { whereClauses.push("p.ID_PRIORIDAD = :id_p"); binds.id_p = parseInt(filtros.id_prioridad); }
    if (filtros.id_categoria) { whereClauses.push("cat.ID_CATEGORIA = :id_c"); binds.id_c = parseInt(filtros.id_categoria); } // Usar alias 'cat'
    if (filtros.id_tecnico_asignado) { 
        if (String(filtros.id_tecnico_asignado).toLowerCase() === 'null') {
            whereClauses.push("t.ID_TECNICO_ASIGNADO IS NULL");
        } else {
            const idTecnico = parseInt(filtros.id_tecnico_asignado);
            if (!isNaN(idTecnico) && idTecnico > 0) {
                whereClauses.push("t.ID_TECNICO_ASIGNADO = :id_t");
                binds.id_t = idTecnico;
            }
        }
    }

    let sql = `
        SELECT
            t.ID_TICKET, t.TITULO, t.DESCRIPCION, t.FECHA_CREACION, t.FECHA_ACTUALIZACION, t.FECHA_CIERRE,
            cat.ID_CATEGORIA, cat.NOMBRE_CATEGORIA,  -- Usando alias 'cat'
            p.ID_PRIORIDAD, p.NOMBRE_PRIORIDAD, 
            e.ID_ESTADO, e.NOMBRE_ESTADO,
            u.ID_USUARIO, u.NOMBRE_COMPLETO AS NOMBRE_USUARIO_REPORTA, u.CORREO AS USUARIO_CORREO, u.AREA AS USUARIO_AREA, -- Usando alias 'u'
            tec.ID_TECNICO AS ID_TECNICO_ASIGNADO, COALESCE(tec.NOMBRE_COMPLETO, 'Sin asignar') AS NOMBRE_TECNICO_ASIGNADO
        FROM ADMIN.TICKET t
        JOIN ADMIN.CATEGORIA cat ON t.ID_CATEGORIA = cat.ID_CATEGORIA -- CORREGIDO a ADMIN.CATEGORIA con alias 'cat'
        JOIN ADMIN.PRIORIDAD_TICKET p ON t.ID_PRIORIDAD = p.ID_PRIORIDAD
        JOIN ADMIN.ESTADO_TICKET e ON t.ID_ESTADO = e.ID_ESTADO
        JOIN ADMIN.USUARIO u ON t.ID_USUARIO = u.ID_USUARIO -- CORREGIDO para usar ID_USUARIO de TICKET
        LEFT JOIN ADMIN.TECNICO tec ON t.ID_TECNICO_ASIGNADO = tec.ID_TECNICO
    `;
    if (whereClauses.length > 0) { sql += " WHERE " + whereClauses.join(" AND "); }
    sql += " ORDER BY t.FECHA_ACTUALIZACION DESC, t.FECHA_CREACION DESC";
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds);
        return await processAndReadClobForRows(result.rows); 
    } catch (err) {
        console.error("Error en ticketModel.getAllTicketsForAdmin (con filtros):", err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function getTicketsAssignedToTechnician(idTecnico) {
    let connection;
    const parsedIdTecnico = parseInt(idTecnico);
    if (isNaN(parsedIdTecnico)) { throw new Error("El ID de técnico proporcionado no es un número válido.");}
    const sql = `
        SELECT
            t.ID_TICKET, t.TITULO, t.DESCRIPCION, t.FECHA_CREACION, t.FECHA_ACTUALIZACION, t.FECHA_CIERRE,
            u.NOMBRE_COMPLETO AS NOMBRE_USUARIO_REPORTA, u.CORREO AS USUARIO_CORREO, u.AREA AS USUARIO_AREA, -- Usando alias 'u'
            cat.NOMBRE_CATEGORIA, p.NOMBRE_PRIORIDAD, e.NOMBRE_ESTADO, e.ID_ESTADO, -- Usando alias 'cat'
            tec.NOMBRE_COMPLETO AS NOMBRE_TECNICO_ASIGNADO
        FROM ADMIN.TICKET t
        JOIN ADMIN.CATEGORIA cat ON t.ID_CATEGORIA = cat.ID_CATEGORIA -- CORREGIDO a ADMIN.CATEGORIA con alias 'cat'
        JOIN ADMIN.PRIORIDAD_TICKET p ON t.ID_PRIORIDAD = p.ID_PRIORIDAD
        JOIN ADMIN.ESTADO_TICKET e ON t.ID_ESTADO = e.ID_ESTADO
        JOIN ADMIN.USUARIO u ON t.ID_USUARIO = u.ID_USUARIO -- CORREGIDO para usar ID_USUARIO de TICKET
        JOIN ADMIN.TECNICO tec ON t.ID_TECNICO_ASIGNADO = tec.ID_TECNICO
        WHERE t.ID_TECNICO_ASIGNADO = :idTecnicoParam
        ORDER BY t.FECHA_ACTUALIZACION DESC, t.FECHA_CREACION DESC`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idTecnicoParam: parsedIdTecnico });
        return await processAndReadClobForRows(result.rows);
    } catch (err) {
        console.error(`Error en ticketModel.getTicketsAssignedToTechnician para técnico ID ${parsedIdTecnico}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

// Renombrada de updateStatus a updateEstado para consistencia con la tabla
async function updateEstado(idTicket, idEstado) { 
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    const parsedIdEstado = parseInt(idEstado);
    if (isNaN(parsedIdTicket) || isNaN(parsedIdEstado)) { throw new Error("ID de ticket o estado no son válidos."); }
    const isClosingStatus = (parsedIdEstado === 3 || parsedIdEstado === 5);
    const sql = isClosingStatus
        ? `UPDATE ADMIN.TICKET SET ID_ESTADO = :idEstadoParam, FECHA_ACTUALIZACION = SYSDATE, FECHA_CIERRE = SYSDATE WHERE ID_TICKET = :idTicketParam`
        : `UPDATE ADMIN.TICKET SET ID_ESTADO = :idEstadoParam, FECHA_ACTUALIZACION = SYSDATE, FECHA_CIERRE = NULL WHERE ID_TICKET = :idTicketParam`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idEstadoParam: parsedIdEstado, idTicketParam: parsedIdTicket }, { autoCommit: true });
        return result.rowsAffected > 0;
    } catch (err) {
        console.error(`Error en ticketModel.updateEstado para ticket ID ${parsedIdTicket}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

// Renombrada de assignTechnician a assignTecnico para consistencia
async function assignTecnico(idTicket, idTecnico) {  
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    const parsedIdTecnico = idTecnico ? parseInt(idTecnico) : null;
    if (isNaN(parsedIdTicket) || (idTecnico !== null && isNaN(parsedIdTecnico))) { throw new Error("ID de ticket o técnico no válidos."); }
    const sql = `UPDATE ADMIN.TICKET SET ID_TECNICO_ASIGNADO = :idTecnicoParam, FECHA_ACTUALIZACION = SYSDATE WHERE ID_TICKET = :idTicketParam`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idTecnicoParam: parsedIdTecnico, idTicketParam: parsedIdTicket }, { autoCommit: true });
        return result.rowsAffected > 0;
    } catch (err) {
        console.error(`Error en ticketModel.assignTecnico para ticket ID ${parsedIdTicket}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

async function closeByUser(idTicket, idEstadoCerrado = 3) { 
    // Esta función ahora puede simplemente llamar a updateEstado
    return updateEstado(idTicket, idEstadoCerrado);
}

async function updateLastModified(idTicket) {
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    if (isNaN(parsedIdTicket)) { throw new Error("El ID de ticket para actualizar fecha no es válido."); }
    const sql = `UPDATE ADMIN.TICKET SET FECHA_ACTUALIZACION = SYSDATE WHERE ID_TICKET = :idTicketParam`;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idTicketParam: parsedIdTicket }, { autoCommit: true });
        return result.rowsAffected > 0;
    } catch (err) {
        console.error(`Error en ticketModel.updateLastModified para ticket ID ${parsedIdTicket}:`, err);
        throw err;
    } finally {
        await closeConnection(connection);
    }
}

module.exports = {
    create,
    getByIdWithDetails,
    getTicketsByUserId,
    getAllTicketsForAdmin,
    getTicketsAssignedToTechnician,
    updateEstado, // Renombrada
    assignTecnico, // Renombrada
    closeByUser,
    updateLastModified
};