const express = require('express');
const router = express.Router();
const { getCompras, createCompra, getBajoStock } = require('../controllers/compraController');

router.get('/', getCompras);
router.post('/', createCompra);
router.get('/bajo-stock', getBajoStock);

module.exports = router;
