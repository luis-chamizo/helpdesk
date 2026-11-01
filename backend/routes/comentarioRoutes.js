// backend/routes/comentarioRoutes.js
const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/v1/comentarios/ticket/:idTicket (Obtener comentarios de un ticket)
// La línea 9 es esta:
router.get('/ticket/:idTicket', // Parámetro nombrado correctamente
    authMiddleware,
    comentarioController.getCommentsForTicket // <<<--- ASEGÚRATE QUE ESTO SEA UNA FUNCIÓN VÁLIDA
);

// La adición de comentarios se maneja a través de POST /api/v1/tickets/:idTicket/comentarios

module.exports = router;