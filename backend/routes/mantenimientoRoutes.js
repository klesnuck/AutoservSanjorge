const express = require('express');
const { getMantenimientos, createMantenimiento, updateMantenimientoFull, updateMantenimientoEstado } = require('../controllers/mantenimientoController');
const router = express.Router();

router.get('/', getMantenimientos);
router.post('/', createMantenimiento);
router.put('/:id', updateMantenimientoFull);
router.put('/:id/estado', updateMantenimientoEstado);

module.exports = router;
