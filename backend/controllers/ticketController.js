// backend/controllers/ticketController.js
const ticketModel = require('../models/ticketModel');
const comentarioModel = require('../models/comentarioModel');
const tecnicoModel = require('../models/tecnicoModel');
const { readClob } = require('../utils/dbUtils'); // Asumo que utils/dbUtils.js y readClob existen
const { validationResult, body, param, query } = require('express-validator');

// --- Funciones Auxiliares del Controlador (si las tienes, mantenlas) ---
async function processTicketRows(rows) {
    if (!rows || !rows.length) return [];
    return Promise.all(rows.map(async (row) => {
        const processedRow = { ...row };
        if (row.DESCRIPCION) {
            processedRow.DESCRIPCION = await readClob(row.DESCRIPCION);
        }
        return processedRow;
    }));
}

async function processSingleTicketRow(row) {
    if (!row) return null;
    const processedRow = { ...row };
    if (row.DESCRIPCION) {
        processedRow.DESCRIPCION = await readClob(row.DESCRIPCION);
    }
    return processedRow;
}

// --- CONTROLADORES DE TICKETS (Definidos como constantes) ---

const createTicket = [
    body('titulo').trim().notEmpty().withMessage('El título es requerido.').isLength({ min: 5, max: 100 }).withMessage('El título debe tener entre 5 y 100 caracteres.'),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida.').isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres.'),
    body('id_categoria').isInt({ gt: 0 }).withMessage('Debe seleccionar una categoría válida.'),
    body('id_prioridad').isInt({ gt: 0 }).withMessage('Debe seleccionar una prioridad válida.'),
    body('id_estado').optional().isInt({ gt: 0 }).withMessage('El ID de estado debe ser un entero positivo si se provee.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al crear el ticket.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        try {
            const id_usuario_creador = req.user.id; 
            if (req.user.rol !== 'usuario') { 
                const error = new Error('Solo los usuarios pueden crear tickets a través de esta función.');
                error.statusCode = 403; return next(error);
            }
            const { titulo, descripcion, id_categoria, id_prioridad, id_estado } = req.body;
            const ticketData = {
                id_usuario: id_usuario_creador, titulo, descripcion,
                id_categoria: parseInt(id_categoria), id_prioridad: parseInt(id_prioridad),
                ...(id_estado && { id_estado: parseInt(id_estado) })
            };
            const nuevoTicketInfo = await ticketModel.create(ticketData);
            const ticketCompleto = await ticketModel.getByIdWithDetails(nuevoTicketInfo.ID_TICKET);
            const ticketProcesado = await processSingleTicketRow(ticketCompleto);
            res.status(201).json({ message: 'Ticket creado exitosamente.', ticket: ticketProcesado });
        } catch (error) { next(error); }
    }
];

const getTicketsForUserDashboard = async (req, res, next) => {
    try {
        const userIdFromToken = req.user.id;
        const rawTickets = await ticketModel.getTicketsByUserId(userIdFromToken);
        const tickets = await processTicketRows(rawTickets);
        res.json(tickets);
    } catch (error) { next(error); }
};

const closeTicketByUser = [
    param('idTicket').isInt({ gt: 0 }).withMessage('El ID del ticket debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación en parámetros.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idTicket } = req.params;
        const userIdFromToken = req.user.id;
        const ID_ESTADO_CERRADO = 3; 
        try {
            const ticket = await ticketModel.getByIdWithDetails(idTicket);
            if (!ticket) { const error = new Error('Ticket no encontrado.'); error.statusCode = 404; return next(error); }
            if (ticket.ID_USUARIO !== userIdFromToken) { 
                const error = new Error('No tienes permiso para cerrar este ticket.'); error.statusCode = 403; return next(error);
            }
            if (ticket.ID_ESTADO === ID_ESTADO_CERRADO) { const error = new Error('El ticket ya se encuentra cerrado.'); error.statusCode = 400; return next(error); }
            const actualizado = await ticketModel.closeByUser(idTicket, ID_ESTADO_CERRADO);
            if (!actualizado) { const error = new Error('No se pudo cerrar el ticket.'); error.statusCode = 500; return next(error); }
            const ticketActualizado = await ticketModel.getByIdWithDetails(idTicket);
            const ticketProcesado = await processSingleTicketRow(ticketActualizado);
            res.json({ message: `Ticket #${idTicket} cerrado exitosamente.`, ticket: ticketProcesado });
        } catch (error) { next(error); }
    }
];

const getTicketDetailsById = [
    param('idTicket').isInt({ gt: 0 }).withMessage('El ID del ticket debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) { const error = new Error('Error de validación.'); error.statusCode = 400; error.errors = errors.array(); return next(error); }
        const { idTicket } = req.params;
        const { id: userIdFromToken, rol: userRoleFromToken } = req.user;
        try {
            const rawTicket = await ticketModel.getByIdWithDetails(idTicket);
            if (!rawTicket) { const error = new Error(`Ticket con ID ${idTicket} no encontrado.`); error.statusCode = 404; return next(error); }
            let canView = false;
            if (userRoleFromToken === 'admin') canView = true;
            else if (userRoleFromToken === 'tecnico' && (rawTicket.ID_TECNICO_ASIGNADO === null || rawTicket.ID_TECNICO_ASIGNADO === userIdFromToken)) canView = true;
            else if (userRoleFromToken === 'usuario' && rawTicket.ID_USUARIO === userIdFromToken) canView = true;
            if (!canView) { const error = new Error('No tienes permiso para ver este ticket.'); error.statusCode = 403; return next(error); }
            const ticketDetails = await processSingleTicketRow(rawTicket);
            res.json(ticketDetails);
        } catch (error) { next(error); }
    }
];

const getAllTickets = [
    query('id_estado').optional().isInt({ gt: 0 }).withMessage('ID de estado inválido.'),
    query('id_prioridad').optional().isInt({ gt: 0 }).withMessage('ID de prioridad inválido.'),
    query('id_categoria').optional().isInt({ gt: 0 }).withMessage('ID de categoría inválido.'),
    query('id_tecnico_asignado').optional().custom(value => {
        if (String(value).toLowerCase() === 'null' || (Number.isInteger(parseInt(value)) && parseInt(value) > 0)) return true;
        throw new Error('ID de técnico asignado inválido.');
    }).customSanitizer(value => (typeof value === 'string' && value.toLowerCase() === 'null') ? 'null' : (Number.isInteger(parseInt(value)) ? parseInt(value) : value)),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) { const error = new Error('Errores de validación en filtros.'); error.statusCode = 400; error.errors = errors.array(); return next(error); }
        try {
            const filtros = {};
            if (req.query.id_estado) filtros.id_estado = req.query.id_estado;
            if (req.query.id_prioridad) filtros.id_prioridad = req.query.id_prioridad;
            if (req.query.id_categoria) filtros.id_categoria = req.query.id_categoria;
            if (req.query.id_tecnico_asignado) filtros.id_tecnico_asignado = req.query.id_tecnico_asignado;
            const rawTickets = await ticketModel.getAllTicketsForAdmin(filtros); 
            const tickets = await processTicketRows(rawTickets);
            res.json(tickets);
        } catch (error) { next(error); }
    }
];

const getTicketsAssignedToTechnicianDashboard = async (req, res, next) => {
    try {
        const idTecnicoFromToken = req.user.id;
        const rawTickets = await ticketModel.getTicketsAssignedToTechnician(idTecnicoFromToken);
        const tickets = await processTicketRows(rawTickets);
        res.json(tickets);
    } catch (error) { next(error); }
};

const updateTicketStatus = [ 
    param('idTicket').isInt({ gt: 0 }).withMessage('El ID del ticket es inválido.'),
    body('id_estado').isInt({ gt: 0 }).withMessage('El ID de estado es requerido y válido.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) { const error = new Error('Errores de validación.'); error.statusCode = 400; error.errors = errors.array(); return next(error); }
        const { idTicket } = req.params;
        const { id_estado } = req.body;
        const { id: idActor, rol: rolActor } = req.user;
        try {
            const ticket = await ticketModel.getByIdWithDetails(idTicket);
            if (!ticket) { const error = new Error('Ticket no encontrado.'); error.statusCode = 404; return next(error); }
            if (rolActor === 'tecnico' && ticket.ID_TECNICO_ASIGNADO !== null && ticket.ID_TECNICO_ASIGNADO !== idActor) {
                 const error = new Error('Como técnico, no puedes modificar el estado de un ticket que no te concierne directamente.'); error.statusCode = 403; return next(error);
            }
            const validStatusIds = [1, 2, 3, 4, 5]; 
            if (!validStatusIds.includes(parseInt(id_estado))) { const error = new Error(`ID de estado '${id_estado}' no válido.`); error.statusCode = 400; return next(error); }
            const actualizado = await ticketModel.updateEstado(idTicket, id_estado);
            if (!actualizado) { const error = new Error('No se pudo actualizar el estado.'); error.statusCode = 500; return next(error); }
            const ticketActualizado = await ticketModel.getByIdWithDetails(idTicket);
            const ticketProcesado = await processSingleTicketRow(ticketActualizado);
            res.json({ message: `Estado del ticket #${idTicket} actualizado.`, ticket: ticketProcesado });
        } catch (error) { next(error); }
    }
];

const assignTicketToTechnician = [ 
    param('idTicket').isInt({ gt: 0 }).withMessage('ID de ticket inválido.'),
    body('id_tecnico_asignado').custom(value => {
        if (value === null || (typeof value === 'string' && value.toLowerCase() === 'null') || (Number.isInteger(value) && value > 0)) return true;
        throw new Error('ID de técnico asignado debe ser número positivo o null.');
    }).customSanitizer(value => (typeof value === 'string' && value.toLowerCase() === 'null') ? null : (value === null ? null : parseInt(value))),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) { const error = new Error('Errores de validación.'); error.statusCode = 400; error.errors = errors.array(); return next(error); }
        const { idTicket } = req.params;
        let { id_tecnico_asignado } = req.body; 
        const { id: idActor, rol: rolActor } = req.user;
        try {
            const ticket = await ticketModel.getByIdWithDetails(idTicket);
            if (!ticket) { const error = new Error('Ticket no encontrado.'); error.statusCode = 404; return next(error); }
            if (id_tecnico_asignado !== null) {
                const tecnico = await tecnicoModel.getById(id_tecnico_asignado); 
                if (!tecnico || tecnico.ACTIVO !== 'S') { const error = new Error(`Técnico ID ${id_tecnico_asignado} no existe o inactivo.`); error.statusCode = 404; return next(error); }
            }
            if (rolActor === 'tecnico') { 
                if (id_tecnico_asignado !== null && id_tecnico_asignado !== idActor) { const error = new Error('Como técnico, solo puedes asignarte tickets a ti mismo.'); error.statusCode = 403; return next(error); }
                if (id_tecnico_asignado === null && ticket.ID_TECNICO_ASIGNADO !== idActor) { const error = new Error('No puedes desasignar un ticket que no te pertenece.'); error.statusCode = 403; return next(error); }
            }
            const asignado = await ticketModel.assignTecnico(idTicket, id_tecnico_asignado);
            if (!asignado) { const error = new Error('No se pudo realizar la asignación.'); error.statusCode = 500; return next(error); }
            const ticketActualizado = await ticketModel.getByIdWithDetails(idTicket);
            const ticketProcesado = await processSingleTicketRow(ticketActualizado);
            const message = id_tecnico_asignado === null ? `Ticket #${idTicket} desasignado.` : `Ticket #${idTicket} asignado al técnico ID ${id_tecnico_asignado}.`;
            res.json({ message, ticket: ticketProcesado });
        } catch (error) { next(error); }
    }
];

const addCommentToTicket = [ // Esta es la función que incluye los LOGS y la LÓGICA DE PERMISOS MEJORADA
    param('idTicket').isInt({ gt: 0 }).withMessage('El ID del ticket para comentar es inválido.'),
    body('comentario_texto').trim().notEmpty().withMessage('El texto del comentario no puede estar vacío.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al añadir comentario.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }

        const { id: idActor, rol: rolActor, nombre_completo: nombreActorCompleto, usuario_login: loginActor } = req.user;
        const { idTicket } = req.params; 
        const { comentario_texto } = req.body;

        console.log('----------------------------------------------------');
        console.log('Endpoint addCommentToTicket - DEBUGGING IDs:');
        console.log('Ticket ID (from req.params):', idTicket, '| Tipo:', typeof idTicket);
        console.log('Actor ID (from req.user.id):', idActor, '| Tipo:', typeof idActor);
        console.log('Actor Rol (from req.user.rol):', rolActor);
        console.log('Texto del Comentario (primeros 50 chars):', comentario_texto ? comentario_texto.substring(0, 50) + "..." : "VACÍO");
        console.log('----------------------------------------------------');

        let tipoAutorParaModelo;
        let idAutorParaModelo = idActor; 

        if (rolActor === 'admin') {
            tipoAutorParaModelo = 'usuario'; 
        } else if (rolActor === 'tecnico') {
            tipoAutorParaModelo = 'tecnico';
        } else if (rolActor === 'usuario') {
            tipoAutorParaModelo = 'usuario';
        } else {
            const error = new Error('Rol de usuario no válido para comentar.');
            error.statusCode = 403; 
            return next(error);
        }
        
        const parsedIdTicketForModel = parseInt(idTicket);
        const parsedIdAutorRealForModel = parseInt(idAutorParaModelo);

        if (isNaN(parsedIdTicketForModel) || isNaN(parsedIdAutorRealForModel)) {
           console.error('ERROR CRÍTICO EN ticketController: idTicket o idAutorParaModelo NO SON NUMÉRICOS ANTES DE LLAMAR AL MODELO');
           console.error('parsedIdTicketForModel:', parsedIdTicketForModel, ' (original req.params.idTicket:', idTicket, ')');
           console.error('parsedIdAutorRealForModel:', parsedIdAutorRealForModel, ' (original idAutorParaModelo:', idAutorParaModelo, ')');
           const error = new Error('Error interno: IDs de ticket o autor no son válidos para el modelo de comentario.');
           error.statusCode = 500;
           return next(error);
        }

        try {
            const ticket = await ticketModel.getByIdWithDetails(parsedIdTicketForModel);
            if (!ticket) {
                const error = new Error('Ticket no encontrado para comentar.'); error.statusCode = 404; return next(error);
            }

            const ticketCerradoOResuelto = [3, 5].includes(ticket.ID_ESTADO);
            let permisoParaComentar = false;

            if (rolActor === 'admin') {
                permisoParaComentar = true; // Admin puede comentar (podrías añadir lógica de ticket cerrado aquí si quieres)
            } else if (rolActor === 'tecnico') {
                if (ticketCerradoOResuelto) { const error = new Error('Como técnico, no puedes comentar en un ticket cerrado o resuelto.'); error.statusCode = 403; return next(error); }
                if (ticket.ID_TECNICO_ASIGNADO === null || ticket.ID_TECNICO_ASIGNADO === idActor) {
                    permisoParaComentar = true;
                } else { const error = new Error('Como técnico, solo puedes comentar en tickets asignados a ti o no asignados.'); error.statusCode = 403; return next(error); }
            } else if (rolActor === 'usuario') {
                if (ticket.ID_USUARIO !== idActor) { const error = new Error('Como usuario, solo puedes comentar en tus propios tickets.'); error.statusCode = 403; return next(error); }
                if (ticketCerradoOResuelto) { const error = new Error('No puedes comentar en un ticket que ya ha sido cerrado o resuelto.'); error.statusCode = 403; return next(error); }
                permisoParaComentar = true;
            }

            if (!permisoParaComentar) {
                const error = new Error('No tienes permiso para añadir un comentario a este ticket (denegado por lógica general).'); error.statusCode = 403; return next(error);
            }

            const nuevoComentarioInfo = await comentarioModel.create(
                parsedIdTicketForModel, 
                parsedIdAutorRealForModel, 
                comentario_texto, 
                tipoAutorParaModelo
            );
            
            const comentarioCreadoParaRespuesta = {
                ID_COMENTARIO: nuevoComentarioInfo.ID_COMENTARIO, ID_TICKET: parsedIdTicketForModel,
                COMENTARIO_TEXTO: comentario_texto, FECHA_CREACION: new Date(), 
                TIPO_AUTOR: tipoAutorParaModelo,
                AUTOR_NOMBRE: nombreActorCompleto || "Sistema", 
                AUTOR_LOGIN: loginActor || "sistema"
            };
            res.status(201).json({ message: 'Comentario añadido exitosamente.', comentario: comentarioCreadoParaRespuesta });
        } catch (error) { next(error); }
    }
];

// Al final del archivo, exportamos todas las funciones del controlador
module.exports = {
    createTicket,
    getTicketsForUserDashboard,
    closeTicketByUser,
    getTicketDetailsById,
    getAllTickets,
    getTicketsAssignedToTechnicianDashboard,
    updateTicketStatus,
    assignTicketToTechnician,
    addCommentToTicket
};