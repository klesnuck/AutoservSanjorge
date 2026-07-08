/**
 * @file vehiculoRoutes.js
 * @description Rutas para los catálogos de datos relacionados con vehículos.
 *
 * Monta el enrutador bajo `/api` (definido en index.js).
 *
 * | Método | Ruta                    | Controlador       | Descripción                                 |
 * |--------|-------------------------|-------------------|---------------------------------------------|
 * | GET    | /api/anio               | getAnios          | Lista todos los años disponibles            |
 * | GET    | /api/modelo/:idmarca    | getModelosByMarca | Lista modelos filtrados por marca           |
 * | GET    | /api/motor              | getMotores        | Lista todos los tipos de motor disponibles  |
 *
 * @module routes/vehiculoRoutes
 */

const express = require('express');
const {
    getAnios, getModelosByMarca, getMotores,
    getVehiculos, createVehiculo, updateVehiculo, deleteVehiculo
} = require('../controllers/vehiculoController');
const router = express.Router();

router.get('/anio', getAnios);
router.get('/modelo/:idmarcas', getModelosByMarca);
router.get('/motor', getMotores);

// Gestión de vehículos
router.get('/vehiculos', getVehiculos);
router.post('/vehiculos', createVehiculo);
router.put('/vehiculos/:id', updateVehiculo);
router.delete('/vehiculos/:id', deleteVehiculo);

module.exports = router;
