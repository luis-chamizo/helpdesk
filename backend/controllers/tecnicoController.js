// backend/controllers/tecnicoController.js
const tecnicoModel = require('../models/tecnicoModel');
const { validationResult, body, param } = require('express-validator');
const bcrypt = require('bcrypt');

// GET /api/v1/tecnicos (Obtener todos los técnicos)
exports.getAllTecnicos = async (req, res, next) => {
    try {
        const tecnicos = await tecnicoModel.getAll();
        // Asegurarse de que 'tecnicos' sea un array.
        if (!Array.isArray(tecnicos)) {
            console.warn("tecnicoModel.getAll() no devolvió un array. Devolviendo lista vacía.");
            return res.json([]);
        }
        const tecnicosPublicos = tecnicos.map(t => {
            const { CONTRASENA, ...resto } = t; // Excluir la contraseña
            return resto;
        });
        res.json(tecnicosPublicos); // CORREGIDO EL TYPO AQUÍ
    } catch (error) {
        next(error);
    }
};

// GET /api/v1/tecnicos/:idTecnico (Obtener un técnico por ID)
exports.getTecnicoById = [
    param('idTecnico').isInt({ gt: 0 }).withMessage('El ID del técnico debe ser un entero positivo.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación en parámetros.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idTecnico } = req.params;
        try {
            const tecnico = await tecnicoModel.getById(idTecnico);
            if (!tecnico) {
                const error = new Error(`Técnico con ID ${idTecnico} no encontrado.`);
                error.statusCode = 404;
                return next(error);
            }
            const { CONTRASENA, ...tecnicoSinContrasena } = tecnico; // No devolver contraseña
            res.json(tecnicoSinContrasena);
        } catch (error) {
            next(error);
        }
    }
];

// POST /api/v1/tecnicos (Admin crea un nuevo técnico)
exports.createTecnico = [
    body('nombre_completo').trim().notEmpty().withMessage('El nombre completo es obligatorio.').isLength({ min: 3, max: 100 }),
    body('correo').isEmail().withMessage('Debe ser un correo electrónico válido.').normalizeEmail(),
    body('especialidad').trim().notEmpty().withMessage('La especialidad es obligatoria.').isLength({ min: 3, max: 50 }),
    body('usuario_login').trim().notEmpty().withMessage('El nombre de usuario es obligatorio.')
        .isLength({ min: 4, max: 30 }).withMessage('El nombre de usuario debe tener entre 4 y 30 caracteres.')
        .isAlphanumeric().withMessage('El nombre de usuario solo puede contener letras y números.'),
    body('contrasena').isLength({ min: 6, max: 50 }).withMessage('La contraseña debe tener entre 6 y 50 caracteres.'),
    body('activo').optional().toUpperCase().isIn(['S', 'N']).withMessage("El estado 'activo' debe ser 'S' o 'N'."),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al crear el técnico.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }

        const { nombre_completo, correo, especialidad, usuario_login, contrasena, activo } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(contrasena, 10);
            const tecnicoData = {
                nombre_completo, correo, especialidad, usuario_login,
                contrasena_hash: hashedPassword, // El modelo espera contrasena_hash
                activo: activo !== undefined ? String(activo).toUpperCase() : 'S'
            };
            const nuevoTecnicoConId = await tecnicoModel.create(tecnicoData); // Asumimos que el modelo devuelve el ID o el objeto.

            // Para devolver el técnico completo sin la contraseña y con el ID real:
            const tecnicoCreado = await tecnicoModel.getById(nuevoTecnicoConId.ID_TECNICO);
            if (!tecnicoCreado) { // Verificación por si acaso
                 throw new Error('No se pudo recuperar el técnico recién creado.');
            }
            const { CONTRASENA, ...tecnicoFinalParaRespuesta } = tecnicoCreado;

            res.status(201).json({ message: 'Técnico creado exitosamente.', tecnico: tecnicoFinalParaRespuesta });
        } catch (error) {
            next(error);
        }
    }
];

// PUT /api/v1/tecnicos/:idTecnico (Admin actualiza un técnico existente)
exports.updateTecnico = [
    param('idTecnico').isInt({ gt: 0 }).withMessage('El ID del técnico es inválido.'),
    body('nombre_completo').optional().trim().notEmpty().withMessage('El nombre completo no puede ser vacío.').isLength({ min: 3, max: 100 }),
    body('correo').optional().isEmail().withMessage('Debe ser un correo electrónico válido.').normalizeEmail(),
    body('especialidad').optional().trim().notEmpty().withMessage('La especialidad no puede ser vacía.').isLength({ min: 3, max: 50 }),
    body('contrasena').optional().isLength({ min: 6, max: 50 }).withMessage('La nueva contraseña debe tener entre 6 y 50 caracteres.'),
    body('activo').optional().toUpperCase().isIn(['S', 'N']).withMessage("El estado 'activo' debe ser 'S' o 'N'."),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación al actualizar el técnico.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }

        const { idTecnico } = req.params;
        const { nombre_completo, correo, especialidad, contrasena, activo } = req.body;

        if (Object.keys(req.body).length === 0) {
            const error = new Error('No se proporcionaron datos para actualizar.');
            error.statusCode = 400; return next(error);
        }
        
        try {
            const datosParaActualizar = {};
            if (nombre_completo !== undefined) datosParaActualizar.nombre_completo = nombre_completo;
            if (correo !== undefined) datosParaActualizar.correo = correo;
            if (especialidad !== undefined) datosParaActualizar.especialidad = especialidad;
            if (activo !== undefined) datosParaActualizar.activo = activo;
            if (contrasena) {
                datosParaActualizar.contrasena_hash = await bcrypt.hash(contrasena, 10);
            }

            const resultadoUpdate = await tecnicoModel.update(idTecnico, datosParaActualizar);

            if (resultadoUpdate.noChanges) {
                const {CONTRASENA, ...tecnicoActualSinPass} = resultadoUpdate.tecnico;
                return res.json({ message: 'No se realizaron cambios en el técnico.', tecnico: tecnicoActualSinPass });
            }
            if (resultadoUpdate.success) {
                const {CONTRASENA, ...tecnicoActualizadoSinPass} = resultadoUpdate.tecnico;
                res.json({ message: `Técnico ID ${idTecnico} actualizado exitosamente.`, tecnico: tecnicoActualizadoSinPass });
            } else {
                // El modelo tecnicoModel.update debería lanzar un error si el técnico no se encuentra,
                // que sería capturado por el catch general.
                // Si llega aquí, es un caso inesperado.
                const error = new Error(resultadoUpdate.message || 'No se pudo actualizar el técnico o no se encontró.');
                error.statusCode = resultadoUpdate.statusCode || 404; // Usar statusCode del modelo si existe
                return next(error);
            }
        } catch (error) {
            next(error);
        }
    }
];

// DELETE /api/v1/tecnicos/:idTecnico (Admin elimina un técnico)
exports.deleteTecnico = [
    param('idTecnico').isInt({ gt: 0 }).withMessage('El ID del técnico es inválido.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Error de validación.');
            error.statusCode = 400; error.errors = errors.array(); return next(error);
        }
        const { idTecnico } = req.params;
        try {
            // Verificar primero si el técnico existe para dar un mensaje más amigable
            const tecnicoExistente = await tecnicoModel.getById(idTecnico);
            if (!tecnicoExistente) {
                const error = new Error(`Técnico con ID ${idTecnico} no encontrado para eliminar.`);
                error.statusCode = 404; return next(error);
            }

            const eliminado = await tecnicoModel.remove(idTecnico);
            if (!eliminado) { // Si remove devuelve false (ej. 0 filas afectadas)
                const error = new Error(`No se pudo eliminar el técnico con ID ${idTecnico}. Es posible que ya haya sido eliminado.`);
                error.statusCode = 404; // O 500 si se considera un error inesperado
                return next(error);
            }
            
            res.status(200).json({ message: `Técnico '${tecnicoExistente.NOMBRE_COMPLETO}' (ID: ${idTecnico}) eliminado exitosamente.` });
        } catch (error) {
            next(error);
        }
    }
];