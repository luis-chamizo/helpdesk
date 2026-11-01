// backend/server.js (VERSIÓN FINAL PARA EXPRESS v4)
console.log("INICIO DE server.js - VERSIÓN FINAL CON EXPRESS v4");

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');
const prioridadRoutes = require('./routes/prioridadRoutes');
const tecnicoRoutes = require('./routes/tecnicoRoutes');
const estadoRoutes = require('./routes/estadoRoutes'); // <<<< AÑADIDO

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../frontend')));
console.log("Middlewares globales y static configurados.");

console.log("Montando rutas API...");
app.use('/api/v1/auth', authRoutes); 
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/categorias', categoryRoutes);
app.use('/api/v1/comentarios', comentarioRoutes);
app.use('/api/v1/prioridades', prioridadRoutes);
app.use('/api/v1/tecnicos', tecnicoRoutes);
app.use('/api/v1/estados', estadoRoutes); 
console.log("Rutas API montadas.");

app.get('/api/v1/ping-app', (req, res) => {
    res.status(200).json({ message: "Aplicación HelpDesk API funcionando!" });
});

const frontendViewsPath = path.join(__dirname, '../frontend/views');
const htmlRouteMapping = {
    '/': 'index.html', '/index.html': 'index.html', '/login.html': 'login.html',
    '/register.html': 'register.html', '/dashboard_usuario.html': 'dashboard_usuario.html',
    '/dashboard_tecnico.html': 'dashboard_tecnico.html', '/crear_ticket.html': 'crear_ticket.html',
    '/ver-ticket.html': 'ver-ticket.html'
};

Object.keys(htmlRouteMapping).forEach(route => {
    app.get(route, (req, res, next) => {
        const filePath = path.join(frontendViewsPath, htmlRouteMapping[route]);
        res.sendFile(filePath, (err) => {
            if (err) {
                if (err.status && err.status >= 500) {
                    console.error(`Error de servidor al servir HTML: ${filePath}`, err);
                    return next(err);
                }
                 console.warn(`Archivo HTML no encontrado: ${filePath} - ${err.message}`);
                 if (!res.headersSent && err.code === 'ENOENT'){
                     return next();
                 } else if (!res.headersSent && err.code !== 'ENOENT') {
                     return next(err);
                 }
            }
        });
    });
});
console.log("Rutas HTML mapeadas configuradas.");

app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api/v1/') && req.accepts('html') && !path.extname(req.path)) {
        console.log(`Sirviendo index.html como fallback para: ${req.path}`);
        const indexPath = path.join(frontendViewsPath, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error("Error crítico al servir index.html como fallback:", err.message);
                return next(err);
            }
        });
    } else {
        next();
    }
});
console.log("Ruta catch-all (*) para frontend configurada.");

app.use(errorHandler);
console.log("Manejador de errores configurado.");

app.listen(PORT, () => {
  console.log("------------------------------------------------------------------");
  console.log(`Servidor HelpDesk (Backend con Express v4) corriendo en http://localhost:${PORT}`);
  console.log(`API principal disponible en http://localhost:${PORT}/api/v1`);
  console.log(`Frontend accesible desde, ej: http://localhost:${PORT}/login.html`);
  console.log("------------------------------------------------------------------");
});