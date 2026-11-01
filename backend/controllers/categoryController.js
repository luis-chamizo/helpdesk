// backend/controllers/categoryController.js
const categoryModel = require('../models/categoryModel');
const { validationResult, body, param } = require('express-validator');

exports.getAllCategories = async (req, res, next) => {
    try {
        const categorias = await categoryModel.getAll();
        res.json(categorias);
    } catch (error) {
        next(error);
    }
};

exports.getCategoryById = [
    param('idCategoria').isInt({ gt: 0 }).withMessage('El ID de la categoría debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación en parámetros.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idCategoria } = req.params;
        try {
            const categoria = await categoryModel.getById(idCategoria);
            if (!categoria) {
                const error = new Error(`Categoría con ID ${idCategoria} no encontrada.`);
                error.statusCode = 404; return next(error);
            }
            res.json(categoria);
        } catch (error) {
            next(error);
        }
    }
];

exports.createCategory = [
    body('nombre_categoria').trim().notEmpty().withMessage('El nombre de la categoría es requerido.')
        .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
    body('descripcion').optional({ checkFalsy: true }).trim()
        .isLength({ max: 200 }).withMessage('La descripción no puede exceder los 200 caracteres.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al crear la categoría.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { nombre_categoria, descripcion } = req.body;
        try {
            const nuevaCategoria = await categoryModel.create(nombre_categoria, descripcion || null);
            res.status(201).json({ message: 'Categoría creada exitosamente.', categoria: nuevaCategoria });
        } catch (error) {
            next(error);
        }
    }
];

exports.updateCategory = [
    param('idCategoria').isInt({ gt: 0 }).withMessage('El ID de la categoría es inválido.'),
    body('nombre_categoria').optional().trim().notEmpty().withMessage('El nombre no puede ser vacío si se provee.')
        .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
    body('descripcion').optional({ checkFalsy: true }).trim()
        .isLength({ max: 200 }).withMessage('La descripción no puede exceder los 200 caracteres.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al actualizar.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idCategoria } = req.params;
        const { nombre_categoria, descripcion } = req.body;
        if (nombre_categoria === undefined && descripcion === undefined) {
            const error = new Error('No se proporcionaron datos para actualizar.');
            error.statusCode = 400; return next(error);
        }
        try {
            const resultadoUpdate = await categoryModel.update(idCategoria, nombre_categoria, descripcion);
            if (resultadoUpdate.noChanges) {
                return res.json({ message: 'No se realizaron cambios en la categoría.', categoria: resultadoUpdate.categoria });
            }
            if (resultadoUpdate.success) {
                 res.json({ message: `Categoría ID ${idCategoria} actualizada.`, categoria: resultadoUpdate.categoria });
            } else {
                const error = new Error(resultadoUpdate.message || 'No se pudo actualizar la categoría.');
                error.statusCode = 404; return next(error);
            }
        } catch (error) {
            next(error);
        }
    }
];

exports.deleteCategory = [
    param('idCategoria').isInt({ gt: 0 }).withMessage('El ID de la categoría es inválido.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
             const error = new Error('Errores de validación.');
             error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idCategoria } = req.params;
        try {
            const categoriaExistente = await categoryModel.getById(idCategoria);
            if (!categoriaExistente) {
                const error = new Error(`Categoría con ID ${idCategoria} no encontrada.`);
                error.statusCode = 404; return next(error);
            }
            const eliminada = await categoryModel.remove(idCategoria);
            if (!eliminada) {
                const error = new Error(`No se pudo eliminar la categoría ID ${idCategoria}.`);
                error.statusCode = 500; return next(error);
            }
            res.status(200).json({ message: `Categoría '${categoriaExistente.NOMBRE_CATEGORIA}' eliminada.` });
        } catch (error) {
            next(error);
        }
    }
];