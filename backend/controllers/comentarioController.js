// backend/controllers/comentarioController.js
const comentarioModel = require('../models/comentarioModel');
const ticketModel = require('../models/ticketModel');
const { readClob } = require('../utils/dbUtils'); // Asumiendo que esta utilidad existe y es correcta
const { validationResult, param } = require('express-validator');

// --- Función Auxiliar del Controlador para procesar filas de comentarios ---
async function processCommentRows(rows) {
    if (!rows || !rows.length) return [];
    return Promise.all(rows.map(async (row) => {
        const processedRow = { ...row };
        if (processedRow.COMENTARIO_TEXTO) {
            processedRow.COMENTARIO_TEXTO = await readClob(processedRow.COMENTARIO_TEXTO);
        }
        if (row.ID_USUARIO) {
            processedRow.TIPO_AUTOR = row.ROL_AUTOR_USUARIO || 'usuario';
            processedRow.AUTOR_NOMBRE = row.NOMBRE_AUTOR_USUARIO;
            processedRow.AUTOR_LOGIN = row.LOGIN_AUTOR_USUARIO;
        } else if (row.ID_TECNICO) {
            processedRow.TIPO_AUTOR = 'tecnico';
            processedRow.AUTOR_NOMBRE = row.NOMBRE_AUTOR_TECNICO;
            processedRow.AUTOR_LOGIN = row.LOGIN_AUTOR_TECNICO;
        } else {
            processedRow.TIPO_AUTOR = 'desconocido';
            processedRow.AUTOR_NOMBRE = 'Sistema/Desconocido';
            processedRow.AUTOR_LOGIN = 'sistema';
        }
        delete processedRow.NOMBRE_AUTOR_USUARIO; 
        delete processedRow.LOGIN_AUTOR_USUARIO;
        delete processedRow.ROL_AUTOR_USUARIO; 
        delete processedRow.NOMBRE_AUTOR_TECNICO;
        delete processedRow.LOGIN_AUTOR_TECNICO;
        return processedRow;
    }));
}

// GET /api/v1/comentarios/ticket/:idTicket (Obtener comentarios de un ticket)
exports.getCommentsForTicket = [
    param('idTicket').isInt({ gt: 0 }).withMessage('El ID del ticket debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación en parámetros.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }

        const { idTicket } = req.params;
        const { id: userIdFromToken, rol: userRoleFromToken, nombre_completo: userNameFromToken } = req.user; // Del token JWT

        try {
            const ticket = await ticketModel.getByIdWithDetails(idTicket); // 'ticket' es el resultado aquí
            if (!ticket) {
                const error = new Error(`Ticket con ID ${idTicket} no encontrado.`);
                error.statusCode = 404; 
                return next(error);
            }

            // --- INICIO DE LOGS DE DEPURACIÓN ---
            console.log('--------------------------------------------------');
            console.log('DEBUG: Permisos para VER comentarios en comentarioController.js');
            console.log('Usuario del Token (req.user.id):', userIdFromToken, '| Rol:', userRoleFromToken, '| Nombre:', userNameFromToken);
            console.log('ID del Ticket Solicitado:', idTicket);
            // ticketModel.getByIdWithDetails devuelve el ticket con detalles, incluyendo ID_USUARIO y ID_TECNICO_ASIGNADO
            console.log('Ticket Obtenido (ticket.ID_USUARIO que reportó):', ticket.ID_USUARIO); 
            console.log('Ticket Obtenido (ticket.ID_TECNICO_ASIGNADO):', ticket.ID_TECNICO_ASIGNADO);
            console.log('--------------------------------------------------');
            // --- FIN DE LOGS DE DEPURACIÓN ---

            let canView = false;
            if (userRoleFromToken === 'admin') {
                canView = true;
                console.log('DEBUG: Permiso concedido por rol ADMIN');
            } else if (userRoleFromToken === 'tecnico') {
                // userIdFromToken para un técnico ES su ID_TECNICO
                if (ticket.ID_TECNICO_ASIGNADO === null) {
                    canView = true;
                    console.log('DEBUG: Permiso concedido a TÉCNICO (ticket no asignado)');
                } else if (ticket.ID_TECNICO_ASIGNADO === userIdFromToken) {
                    canView = true;
                    console.log('DEBUG: Permiso concedido a TÉCNICO (ticket asignado a él)');
                }
                // Opcional: si un técnico también es el que reportó el ticket (poco común para este flujo, pero posible)
                // No se incluye aquí porque userIdFromToken para técnico es ID_TECNICO, no ID_USUARIO.
            } else if (userRoleFromToken === 'usuario') {
                // userIdFromToken para un usuario ES su ID_USUARIO.
                // ticket.ID_USUARIO es el ID del usuario que creó/reportó el ticket.
                if (ticket.ID_USUARIO === userIdFromToken) {
                    canView = true;
                    console.log('DEBUG: Permiso concedido a USUARIO (es su propio ticket)');
                }
            }

            if (!canView) {
                console.log('DEBUG: Permiso DENEGADO para ver comentarios. Rol:', userRoleFromToken, 'Ticket User:', ticket.ID_USUARIO, 'Ticket Tech:', ticket.ID_TECNICO_ASIGNADO, 'User ID from Token:', userIdFromToken);
                const error = new Error('No tienes permiso para ver los comentarios de este ticket.');
                error.statusCode = 403; 
                return next(error);
            }

            const rawComments = await comentarioModel.getByTicketId(idTicket);
            const comments = await processCommentRows(rawComments);
            
            res.json(comments);
        } catch (error) {
            next(error);
        }
    }
];