// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
// require('dotenv').config(); // No es necesario aquí si JWT_SECRET se accede vía process.env y .env ya está cargado en server.js

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        const error = new Error('Acceso denegado. Se requiere token de autenticación.');
        error.statusCode = 401; 
        return next(error);
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('AuthMiddleware: JWT_SECRET no está definido. Error de configuración del servidor.');
            const error = new Error('Error de configuración del servidor de autenticación.');
            error.statusCode = 500;
            return next(error);
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded; 
        next();
    } catch (err) {
        console.error('AuthMiddleware - Error al verificar token:', err.message);
        const error = new Error('Token inválido o expirado. Por favor, inicia sesión de nuevo.');
        error.statusCode = 403; 
        next(error);
    }
}

module.exports = authMiddleware;