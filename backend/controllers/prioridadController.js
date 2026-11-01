// backend/controllers/prioridadController.js
const prioridadModel = require('../models/prioridadModel');
const { validationResult, body, param } = require('express-validator');

exports.getAllPriorities = async (req, res, next) => {
    try {
        const prioridades = await prioridadModel.getAll();
        res.json(prioridades);
    } catch (error) {
        next(error);
    }
};

exports.getPriorityById = [
    param('idPrioridad').isInt({ gt: 0 }).withMessage('El ID de la prioridad debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación en parámetros.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idPrioridad } = req.params;
        try {
            const prioridad = await prioridadModel.getById(idPrioridad);
            if (!prioridad) {
                const error = new Error(`Prioridad con ID ${idPrioridad} no encontrada.`);
                error.statusCode = 404; return next(error);
            }
            res.json(prioridad);
        } catch (error) {
            next(error);
        }
    }
];

exports.createPriority = [
    body('nombre_prioridad').trim().notEmpty().withMessage('El nombre de la prioridad es requerido.')
        .isLength({ min: 3, max: 10 }).withMessage('El nombre debe tener entre 3 y 10 caracteres.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { nombre_prioridad } = req.body;
        try {
            const nuevaPrioridad = await prioridadModel.create(nombre_prioridad);
            res.status(201).json({ message: 'Prioridad creada exitosamente.', prioridad: nuevaPrioridad });
        } catch (error) {
            next(error);
        }
    }
];

exports.updatePriority = [
    param('idPrioridad').isInt({ gt: 0 }).withMessage('El ID de la prioridad es inválido.'),
    body('nombre_prioridad').trim().notEmpty().withMessage('El nombre es requerido.')
        .isLength({ min: 3, max: 10 }).withMessage('El nombre debe tener entre 3 y 10 caracteres.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
             const error = new Error('Errores de validación.');
             error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idPrioridad } = req.params;
        const { nombre_prioridad } = req.body;
        try {
            const resultadoUpdate = await prioridadModel.update(idPrioridad, nombre_prioridad);
            if (resultadoUpdate.noChanges) {
                return res.json({ message: 'No se realizaron cambios.', prioridad: resultadoUpdate.prioridad });
            }
            if (resultadoUpdate.success) {
                 res.json({ message: `Prioridad ID ${idPrioridad} actualizada.`, prioridad: resultadoUpdate.prioridad });
            } else {
                const error = new Error(resultadoUpdate.message || 'No se pudo actualizar.');
                error.statusCode = 404; return next(error);
            }
        } catch (error) {
            next(error);
        }
    }
];

exports.deletePriority = [
    param('idPrioridad').isInt({ gt: 0 }).withMessage('El ID de la prioridad es inválido.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idPrioridad } = req.params;
        try {
            const prioridadExistente = await prioridadModel.getById(idPrioridad);
            if (!prioridadExistente) {
                const error = new Error(`Prioridad ID ${idPrioridad} no encontrada.`);
                error.statusCode = 404; return next(error);
            }
            const eliminada = await prioridadModel.remove(idPrioridad);
            if (!eliminada) {
                const error = new Error(`No se pudo eliminar la prioridad ID ${idPrioridad}.`);
                error.statusCode = 500; return next(error);
            }
            res.status(200).json({ message: `Prioridad '${prioridadExistente.NOMBRE_PRIORIDAD}' eliminada.` });
        } catch (error) {
            next(error);
        }
    }
];