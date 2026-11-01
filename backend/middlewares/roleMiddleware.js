// backend/middlewares/roleMiddleware.js
function ensureRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.rol) {
            const error = new Error('Autenticación requerida o rol no especificado en token.');
            error.statusCode = 401; return next(error);
        }
        const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!rolesToCheck.includes(req.user.rol)) {
            const error = new Error(`Acceso denegado. Se requiere uno de los siguientes roles: ${rolesToCheck.join(', ')}.`);
            error.statusCode = 403; return next(error);
        }
        next();
    };
}
module.exports = { ensureRole };