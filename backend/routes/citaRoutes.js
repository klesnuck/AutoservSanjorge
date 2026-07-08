/**
 * @file citaRoutes.js
 * @description Rutas para la gestión de citas del taller.
 *
 * Monta el enrutador bajo `/api/citas` (definido en index.js).
 *
 * | Método | Ruta             | Controlador | Descripción                                  |
 * |--------|------------------|-------------|----------------------------------------------|
 * | GET    | /api/citas       | getAllCitas  | Lista todas las citas con detalle enriquecido|
 * | POST   | /api/citas       | createCita  | Crea una nueva cita                          |
 * | PATCH  | /api/citas/:id   | updateCita  | Actualiza parcialmente una cita por ID       |
 *
 * @module routes/citaRoutes
 */

const express = require('express');
const { getAllCitas, createCita, createCitaCompleta, updateCita, deleteCita } = require('../controllers/citaController');
const router = express.Router();

router.get('/', getAllCitas);
router.post('/completa', createCitaCompleta);
router.post('/', createCita);
router.patch('/:id', updateCita);
router.delete('/:id', deleteCita);

module.exports = router;
