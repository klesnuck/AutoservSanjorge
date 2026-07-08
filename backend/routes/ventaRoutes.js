const express = require('express');
const { getVentas, createVenta } = require('../controllers/ventaController');
const router = express.Router();

router.get('/', getVentas);
router.post('/', createVenta);

module.exports = router;
