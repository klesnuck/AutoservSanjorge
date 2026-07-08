const express = require('express');
const router = express.Router();
const { getProveedores, createProveedor } = require('../controllers/proveedorController');

router.get('/', getProveedores);
router.post('/', createProveedor);

module.exports = router;
