const pool = require('./db');
const { createCompra } = require('./controllers/compraController');

const req = {
  body: {
    idProveedor: 1,
    estado_compra: 'Recibido',
    estado_pago: 'Pagado',
    total: 2000,
    productos: [
      { productoId: 1, cantidad: 10, costo: 200, total: 2000 }
    ]
  }
};

const res = {
  status: (code) => ({
    json: (data) => console.log('Status:', code, 'Data:', data)
  }),
  json: (data) => console.log('Data:', data)
};

createCompra(req, res).then(() => process.exit());
