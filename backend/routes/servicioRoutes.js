/**
 * @file servicioRoutes.js
 * @description Rutas CRUD para el módulo de servicios del taller.
 *
 * Monta el enrutador bajo `/api/servicios` (definido en index.js).
 *
 * | Método | Ruta               | Controlador    | Descripción                     |
 * |--------|--------------------|----------------|---------------------------------|
 * | GET    | /api/servicios     | getServicios   | Lista todos los servicios       |
 * | POST   | /api/servicios     | createServicio | Crea un nuevo servicio          |
 * | PUT    | /api/servicios/:id | updateServicio | Actualiza un servicio por ID    |
 * | DELETE | /api/servicios/:id | deleteServicio | Elimina un servicio por ID      |
 *
 * @module routes/servicioRoutes
 */

const express = require('express');
const { getServicios, createServicio, updateServicio, deleteServicio } = require('../controllers/servicioController');
const router = express.Router();

router.get('/', getServicios);
router.post('/', createServicio);
router.put('/:id', updateServicio);
router.delete('/:id', deleteServicio);

module.exports = router;
