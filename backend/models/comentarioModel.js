// backend/models/comentarioModel.js
const { getConnection, closeConnection, oracledb } = require('../config/db');
// IMPORTANTE: Importar readClob de tus utilidades de backend
const { readClob } = require('../utils/dbUtils'); // Ajusta la ruta si es necesario

async function create(idTicket, idAutor, textoComentario, tipoAutor) {
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    // idAutor ya debería ser un número del controlador (parsedIdAutorRealForModel)
    // pero una validación extra aquí no hace daño si se pasa directamente desde otra fuente.
    const parsedIdAutor = parseInt(idAutor); 

    if (isNaN(parsedIdTicket) || isNaN(parsedIdAutor)) { 
        // Este log es útil si el error persiste después de las validaciones del controlador
        console.error(`comentarioModel.create: IDs inválidos. Ticket: ${idTicket}, Autor: ${idAutor}`);
        throw new Error("IDs de ticket o autor no son válidos para el modelo."); 
    }

    const autorColumn = tipoAutor === 'usuario' ? 'ID_USUARIO' : 'ID_TECNICO';
    
    const insertCommentSql = `
        INSERT INTO ADMIN.COMENTARIO 
        (ID_TICKET, ${autorColumn}, COMENTARIO_TEXTO, FECHA_CREACION)
        VALUES (:idTicketParam, :idAutorParam, :textoComentarioParam, SYSDATE)
        RETURNING ID_COMENTARIO INTO :out_id_comentario
    `;
    const insertCommentBinds = {
        idTicketParam: parsedIdTicket,
        idAutorParam: parsedIdAutor,
        textoComentarioParam: textoComentario,
        out_id_comentario: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const updateTicketSql = `
        UPDATE ADMIN.TICKET 
        SET FECHA_ACTUALIZACION = SYSDATE 
        WHERE ID_TICKET = :idTicketParam
    `;
    const updateTicketBinds = { idTicketParam: parsedIdTicket };

    try {
        connection = await getConnection();
        const resultComment = await connection.execute(insertCommentSql, insertCommentBinds, { autoCommit: false });

        if (!resultComment.rowsAffected || !resultComment.outBinds || !resultComment.outBinds.out_id_comentario) {
            await connection.rollback();
            throw new Error("No se pudo insertar el comentario.");
        }
        const newCommentId = resultComment.outBinds.out_id_comentario[0];

        const resultTicketUpdate = await connection.execute(updateTicketSql, updateTicketBinds, { autoCommit: false });

        if (resultTicketUpdate.rowsAffected !== 1) {
            await connection.rollback();
            console.warn(`Fallo al actualizar fecha ticket ${parsedIdTicket} tras comentario ${newCommentId}. Rollback comentario.`);
            throw new Error(`No se pudo actualizar la fecha del ticket asociado (ID: ${parsedIdTicket}). El comentario no fue guardado.`);
        }
        await connection.commit();
        return { 
            ID_COMENTARIO: newCommentId, 
            ID_TICKET: parsedIdTicket,
            // Devuelve la estructura básica, el controlador puede añadir más si es necesario para la respuesta
        };
    } catch (err) {
        if (connection) { try { await connection.rollback(); } catch (rollErr) { console.error("Error rollback en comentarioModel.create:", rollErr); }}
        console.error(`Error en comentarioModel.create (tipo autor: ${tipoAutor}, idAutor: ${idAutor}):`, err);
        // Re-lanzar el error para que el controlador lo maneje
        if (err.message.includes("ORA-02291")) { // Parent key not found (FK violation)
             throw new Error(`No se pudo crear el comentario: El ticket, usuario o técnico especificado no existe. Detalles: ${err.message}`);
        }
        throw err; 
    } finally {
        if (connection) {
            await closeConnection(connection);
        }
    }
}

// --- FUNCIÓN getByTicketId MODIFICADA ---
async function getByTicketId(idTicket) {
    let connection;
    const parsedIdTicket = parseInt(idTicket);
    if (isNaN(parsedIdTicket)) { throw new Error("El ID del ticket para obtener comentarios debe ser un número válido."); }
    
    const sql = `
        SELECT c.ID_COMENTARIO, c.COMENTARIO_TEXTO, c.FECHA_CREACION,
               c.ID_USUARIO, u.NOMBRE_COMPLETO AS NOMBRE_AUTOR_USUARIO, u.USUARIO_LOGIN AS LOGIN_AUTOR_USUARIO, u.ROL AS ROL_AUTOR_USUARIO,
               c.ID_TECNICO, tec.NOMBRE_COMPLETO AS NOMBRE_AUTOR_TECNICO, tec.USUARIO_LOGIN AS LOGIN_AUTOR_TECNICO
        FROM ADMIN.COMENTARIO c
        LEFT JOIN ADMIN.USUARIO u ON c.ID_USUARIO = u.ID_USUARIO
        LEFT JOIN ADMIN.TECNICO tec ON c.ID_TECNICO = tec.ID_TECNICO
        WHERE c.ID_TICKET = :idTicketParam
        ORDER BY c.FECHA_CREACION ASC`;
    
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { idTicketParam: parsedIdTicket });

        if (result.rows && result.rows.length > 0) {
            // Procesar CLOBs aquí, mientras la conexión está abierta
            const processedRows = await Promise.all(result.rows.map(async (row) => {
                const newRow = { ...row }; // Crear una copia para no mutar el original
                if (newRow.COMENTARIO_TEXTO) {
                    // Usar la función readClob importada de dbUtils
                    newRow.COMENTARIO_TEXTO = await readClob(newRow.COMENTARIO_TEXTO);
                }
                return newRow;
            }));
            return processedRows; // Devolver filas con el contenido del CLOB ya como string
        }
        return []; // Devolver un array vacío si no hay comentarios
    } catch (err) {
        console.error(`Error en comentarioModel.getByTicketId para ticket ID ${parsedIdTicket}:`, err);
        throw err;
    } finally {
        if (connection) {
            await closeConnection(connection); // Cerrar la conexión después de procesar todo
        }
    }
}
// --- FIN FUNCIÓN getByTicketId MODIFICADA ---

module.exports = { create, getByTicketId };