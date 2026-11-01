// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const { ensureRole } = require('../middlewares/roleMiddleware');

// GET /api/v1/categorias
router.get('/', 
    authMiddleware, 
    categoryController.getAllCategories
);

// GET /api/v1/categorias/:idCategoria
router.get('/:idCategoria', // Parámetro nombrado correctamente
    authMiddleware, 
    categoryController.getCategoryById
);

// POST /api/v1/categorias
router.post('/', 
    authMiddleware, 
    ensureRole(['admin']), 
    categoryController.createCategory
);

// PUT /api/v1/categorias/:idCategoria
router.put('/:idCategoria', // Parámetro nombrado correctamente
    authMiddleware, 
    ensureRole(['admin']), 
    categoryController.updateCategory
);

// DELETE /api/v1/categorias/:idCategoria
router.delete('/:idCategoria', // Parámetro nombrado correctamente
    authMiddleware, 
    ensureRole(['admin']), 
    categoryController.deleteCategory
);

module.exports = router;