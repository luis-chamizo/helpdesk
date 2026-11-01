// backend/routes/estadoRoutes.js
const express = require('express');
const router = express.Router();
const estadoController = require('../controllers/estadoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, estadoController.getAllEstados);

module.exports = router;