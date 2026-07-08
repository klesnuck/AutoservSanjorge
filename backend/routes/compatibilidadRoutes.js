const express = require('express');
const {
  getProductosCompatibles,
  getCompatibilidadPorProducto,
  addCompatibilidad,
  updateCompatibilidad,
  deleteCompatibilidad,
} = require('../controllers/compatibilidadController');

const router = express.Router();

// GET /api/productos/compatibles?idModelos=X
router.get('/compatibles', getProductosCompatibles);

// GET /api/productos/:idProducto/compatibilidad
router.get('/:idProducto/compatibilidad', getCompatibilidadPorProducto);

// POST /api/productos/:idProducto/compatibilidad
router.post('/:idProducto/compatibilidad', addCompatibilidad);

// PUT /api/productos/compatibilidad/:id
router.put('/compatibilidad/:id', updateCompatibilidad);

// DELETE /api/productos/compatibilidad/:id
router.delete('/compatibilidad/:id', deleteCompatibilidad);

module.exports = router;
