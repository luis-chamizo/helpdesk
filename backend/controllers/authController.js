// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
const usuarioModel = require('../models/usuarioModel'); // Importa el modelo
const tecnicoModel = require('../models/tecnicoModel'); // Importa el modelo

// Función de Registro de Usuario
exports.registerUser = [
    body('nombre_completo').trim().notEmpty().withMessage('El nombre completo es obligatorio.').isLength({ min: 3, max: 100 }),
    body('correo').isEmail().withMessage('Debe ser un correo electrónico válido.').normalizeEmail(),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio.')
        .isLength({ min: 10, max: 10 }).withMessage('El teléfono debe tener 10 dígitos.')
        .matches(/^\d+$/).withMessage('El teléfono solo debe contener números.'),
    body('area').trim().notEmpty().withMessage('El área es obligatoria.')
        .isIn(['Sistemas', 'Recursos Humanos', 'Finanzas', 'Logística', 'Ventas', 'Marketing', 'Producción', 'Atención al Cliente'])
        .withMessage('Área no válida.'),
    body('usuario_login').trim().notEmpty().withMessage('El nombre de usuario es obligatorio.')
        .isLength({ min: 4, max: 30 }).withMessage('El nombre de usuario debe tener entre 4 y 30 caracteres.')
        .isAlphanumeric().withMessage('El nombre de usuario solo puede contener letras y números.'),
    body('contrasena').isLength({ min: 6, max: 50 }).withMessage('La contraseña debe tener entre 6 y 50 caracteres.'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación en el registro.');
            error.statusCode = 400;
            error.errors = errors.array();
            return next(error);
        }

        const { nombre_completo, correo, telefono, area, usuario_login, contrasena } = req.body;

        try {
            // Verificar si el usuario_login o correo ya existen antes (opcional, modelo ya lo hace)
            let existingUserByLogin = await usuarioModel.findByLogin(usuario_login);
            if (existingUserByLogin) {
                const error = new Error(`El nombre de usuario '${usuario_login}' ya está en uso.`);
                error.statusCode = 409; return next(error);
            }
            let existingUserByEmail = await usuarioModel.findUserByEmail(correo);
            if (existingUserByEmail) {
                const error = new Error(`El correo electrónico '${correo}' ya está registrado.`);
                error.statusCode = 409; return next(error);
            }

            const hashedPassword = await bcrypt.hash(contrasena, 10);
            
            // Llamando a la función 'create' del modelo
            await usuarioModel.create({ 
                nombre_completo, 
                correo, 
                telefono, 
                area, 
                usuario_login,
                contrasena: hashedPassword, // El modelo espera la contraseña hasheada
            });
            res.status(201).json({ message: 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.' });
        } catch (error) {
            next(error); // Dejar que el errorHandler maneje los errores del modelo o de aquí
        }
    }
];

// Función de Login (para Usuarios y Técnicos)
exports.loginUser = [
    body('usuario_login').trim().notEmpty().withMessage('El nombre de usuario es obligatorio.'),
    body('contrasena').notEmpty().withMessage('La contraseña es obligatoria.'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('Errores de validación en el login.');
            error.statusCode = 400;
            error.errors = errors.array();
            return next(error);
        }

        const { usuario_login, contrasena } = req.body;

        try {
            let authenticatedEntity = null;
            let entityType = null; 
            let specificContext = null; 

            const foundUser = await usuarioModel.findByLogin(usuario_login);
            if (foundUser) {
                const isMatch = await bcrypt.compare(contrasena, foundUser.CONTRASENA);
                if (isMatch) {
                    authenticatedEntity = foundUser;
                    entityType = foundUser.ROL; 
                    specificContext = foundUser.AREA;
                }
            }

            if (!authenticatedEntity) {
                const foundTecnico = await tecnicoModel.findByLogin(usuario_login);
                if (foundTecnico) {
                    if (foundTecnico.ACTIVO !== 'S') {
                        const error = new Error('La cuenta de técnico está inactiva.');
                        error.statusCode = 403; 
                        return next(error);
                    }
                    const isMatch = await bcrypt.compare(contrasena, foundTecnico.CONTRASENA);
                    if (isMatch) {
                        authenticatedEntity = foundTecnico;
                        entityType = 'tecnico'; 
                        specificContext = foundTecnico.ESPECIALIDAD;
                    }
                }
            }

            if (!authenticatedEntity) {
                const error = new Error('Credenciales inválidas. Verifica tu usuario y/o contraseña.');
                error.statusCode = 401; 
                return next(error);
            }

            const payload = {
                id: entityType === 'tecnico' ? authenticatedEntity.ID_TECNICO : authenticatedEntity.ID_USUARIO,
                usuario_login: authenticatedEntity.USUARIO_LOGIN,
                nombre_completo: authenticatedEntity.NOMBRE_COMPLETO,
                rol: entityType,
                contexto_especifico: specificContext 
            };

            if (!process.env.JWT_SECRET) {
                console.error('authController: JWT_SECRET no está definido en .env');
                const error = new Error('Error de configuración del servidor de autenticación.');
                error.statusCode = 500;
                return next(error);
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }); 

            res.status(200).json({
                message: 'Inicio de sesión exitoso.',
                token,
                usuario: { 
                    id: payload.id,
                    usuario_login: payload.usuario_login,
                    nombre_completo: payload.nombre_completo,
                    rol: payload.rol,
                    contexto_especifico: payload.contexto_especifico
                }
            });
        } catch (error) {
            console.error("Error interno durante el proceso de login en authController:", error);
            next(error);
        }
    }
];