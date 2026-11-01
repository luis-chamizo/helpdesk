// backend/routes/prioridadRoutes.js
const express = require('express');
const router = express.Router();
const prioridadController = require('../controllers/prioridadController');
const authMiddleware = require('../middlewares/authMiddleware');
const { ensureRole } = require('../middlewares/roleMiddleware');

// GET /api/v1/prioridades
router.get('/', 
    authMiddleware, 
    prioridadController.getAllPriorities
);

// GET /api/v1/prioridades/:idPrioridad
router.get('/:idPrioridad', // Parámetro nombrado correctamente
    authMiddleware, 
    prioridadController.getPriorityById
);

// POST /api/v1/prioridades
router.post('/', 
    authMiddleware, 
    ensureRole(['admin']), 
    prioridadController.createPriority
);

// PUT /api/v1/prioridades/:idPrioridad
router.put('/:idPrioridad', // Parámetro nombrado correctamente
    authMiddleware, 
    ensureRole(['admin']), 
    prioridadController.updatePriority
);

// DELETE /api/v1/prioridades/:idPrioridad
router.delete('/:idPrioridad', // Parámetro nombrado correctamente
    authMiddleware, 
    ensureRole(['admin']), 
    prioridadController.deletePriority
);

module.exports = router;