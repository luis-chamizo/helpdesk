// backend/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');
const { ensureRole } = require('../middlewares/roleMiddleware');

// POST /api/v1/tickets (Usuario crea un nuevo ticket)
router.post('/', 
    authMiddleware, 
    ensureRole(['usuario']), 
    ticketController.createTicket
);

// GET /api/v1/tickets/usuario/dashboard (Tickets del usuario logueado)
router.get('/usuario/dashboard', 
    authMiddleware, 
    ensureRole(['usuario']),
    ticketController.getTicketsForUserDashboard
);

// GET /api/v1/tickets/tecnico/asignados (Tickets asignados al técnico autenticado)
router.get('/tecnico/asignados',
    authMiddleware,
    ensureRole(['tecnico', 'admin']), 
    ticketController.getTicketsAssignedToTechnicianDashboard
);

// GET /api/v1/tickets (Listar todos los tickets para admin/tecnico, con filtros opcionales)
// Esta ruta más general va DESPUÉS de las más específicas para evitar conflictos.
router.get('/',
    authMiddleware,
    ensureRole(['admin', 'tecnico']),
    ticketController.getAllTickets 
);

// PUT /api/v1/tickets/:idTicket/cerrar-usuario (Usuario cierra su propio ticket)
router.put('/:idTicket/cerrar-usuario', 
    authMiddleware, 
    ensureRole(['usuario']),
    ticketController.closeTicketByUser
);

// PUT /api/v1/tickets/:idTicket/estado (Técnico/Admin actualiza estado)
router.put('/:idTicket/estado',
    authMiddleware,
    ensureRole(['admin', 'tecnico']),
    ticketController.updateTicketStatus
);

// PUT /api/v1/tickets/:idTicket/asignar (Admin asigna técnico, o técnico se autoasigna/desasigna)
router.put('/:idTicket/asignar',
    authMiddleware,
    ensureRole(['admin', 'tecnico']),
    ticketController.assignTicketToTechnician
);

// POST /api/v1/tickets/:idTicket/comentarios (Usuario, Técnico o Admin añade comentario a un ticket)
router.post('/:idTicket/comentarios',
    authMiddleware,
    // ensureRole(['usuario', 'tecnico', 'admin']), // El controlador refina los permisos exactos
    ticketController.addCommentToTicket 
);

// GET /api/v1/tickets/:idTicket (Detalles de un ticket específico)
// Esta debe ser una de las últimas rutas con :idTicket para evitar que capture otras más específicas.
router.get('/:idTicket', 
    authMiddleware, 
    ticketController.getTicketDetailsById
);

module.exports = router;