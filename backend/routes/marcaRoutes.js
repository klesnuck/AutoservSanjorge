/**
 * @file marcaRoutes.js
 * @description Rutas para el módulo de marcas de vehículos.
 *
 * Monta el enrutador bajo `/api/marca` (definido en index.js).
 *
 * | Método | Ruta          | Controlador | Descripción            |
 * |--------|---------------|-------------|------------------------|
 * | GET    | /api/marca    | getMarcas   | Lista todas las marcas |
 *
 * @module routes/marcaRoutes
 */

const express = require('express');
const { getMarcas } = require('../controllers/marcaController');
const router = express.Router();

router.get('/', getMarcas);

module.exports = router;
