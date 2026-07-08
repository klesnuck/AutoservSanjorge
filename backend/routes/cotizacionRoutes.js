/**
 * @file cotizacionRoutes.js
 * @description Rutas CRUD para el módulo de cotizaciones del taller.
 *
 * Monta el enrutador bajo `/api/cotizaciones` (definido en index.js).
 *
 * | Método | Ruta                    | Controlador        | Descripción                        |
 * |--------|-------------------------|--------------------|------------------------------------|
 * | GET    | /api/cotizaciones       | getCotizaciones    | Lista todas las cotizaciones       |
 * | GET    | /api/cotizaciones/:id   | getCotizacionById  | Obtiene una cotización por ID      |
 * | POST   | /api/cotizaciones       | createCotizacion   | Crea una nueva cotización          |
 * | PUT    | /api/cotizaciones/:id   | updateCotizacion   | Actualiza una cotización por ID    |
 * | DELETE | /api/cotizaciones/:id   | deleteCotizacion   | Elimina una cotización por ID      |
 *
 * @module routes/cotizacionRoutes
 */

const express = require('express');
const {
  getCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion,
} = require('../controllers/cotizacionController');
const router = express.Router();

router.get('/', getCotizaciones);
router.get('/:id', getCotizacionById);
router.post('/', createCotizacion);
router.put('/:id', updateCotizacion);
router.delete('/:id', deleteCotizacion);

module.exports = router;
