// backend/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - STATUS ${statusCode} - ERROR: ${err.message}`);
    if (isDevelopment && err.stack) { // Solo mostrar stack si existe
        console.error(err.stack);
    }

    const responseError = {
        message: err.message || 'Error interno del servidor.',
        ...(isDevelopment && err.stack && { stack: err.stack }), 
        ...(err.errors && { errors: err.errors }), 
        ...(err.errorCode && { errorCode: err.errorCode }) 
    };

    // Evitar enviar respuesta si ya se envió una (raro, pero por seguridad)
    if (res.headersSent) {
        return next(err); // Dejar que Express maneje el error si ya se enviaron cabeceras
    }

    res.status(statusCode).json(responseError);
}

module.exports = errorHandler;