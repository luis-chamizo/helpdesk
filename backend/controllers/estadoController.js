// backend/controllers/estadoController.js
const estadoTicketModel = require('../models/estadoTicketModel');

exports.getAllEstados = async (req, res, next) => {
    try {
        const estados = await estadoTicketModel.getAll();
        // Excluir el estado con ID 6 ("Todos") si no es relevante para la selección individual
        const estadosFiltrados = estados.filter(e => e.ID_ESTADO !== 6); 
        res.json(estadosFiltrados);
    } catch (error) {
        next(error);
    }
};