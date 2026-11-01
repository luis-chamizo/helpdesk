// backend/routes/tecnicoRoutes.js
const express = require('express');
const router = express.Router();
const tecnicoController = require('../controllers/tecnicoController');
const authMiddleware = require('../middlewares/authMiddleware');
const { ensureRole } = require('../middlewares/roleMiddleware');

// GET /api/v1/tecnicos (Listar todos los técnicos)
router.get('/',
    authMiddleware,
    ensureRole(['admin', 'tecnico']), 
    tecnicoController.getAllTecnicos
);

// GET /api/v1/tecnicos/:idTecnico (Obtener un técnico por ID)
router.get('/:idTecnico', // Parámetro nombrado correctamente
    authMiddleware,
    ensureRole(['admin', 'tecnico']), 
    tecnicoController.getTecnicoById 
);

// POST /api/v1/tecnicos (Admin crea un nuevo técnico)
router.post('/',
    authMiddleware,
    ensureRole(['admin']), 
    tecnicoController.createTecnico 
);

// PUT /api/v1/tecnicos/:idTecnico (Admin actualiza un técnico existente)
router.put('/:idTecnico', // Parámetro nombrado correctamente
    authMiddleware,
    ensureRole(['admin']), 
    tecnicoController.updateTecnico 
);

// DELETE /api/v1/tecnicos/:idTecnico (Admin elimina un técnico)
router.delete('/:idTecnico', // Parámetro nombrado correctamente
    authMiddleware,
    ensureRole(['admin']), 
    tecnicoController.deleteTecnico 
);

module.exports = router;