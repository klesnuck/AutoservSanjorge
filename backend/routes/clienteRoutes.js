/**
 * @file clienteRoutes.js
 * @description Rutas para el módulo de clientes.
 *
 * Monta el enrutador bajo `/api/cliente` (definido en index.js).
 *
 * | Método | Ruta           | Controlador   | Descripción             |
 * |--------|----------------|---------------|-------------------------|
 * | POST   | /api/cliente   | createCliente | Crea un nuevo cliente   |
 *
 * @module routes/clienteRoutes
 */

const express = require('express');
const { createCliente } = require('../controllers/clienteController');
const router = express.Router();

router.post('/', createCliente);

module.exports = router;
