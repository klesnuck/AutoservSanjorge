const pool = require('./db');

pool.query(`
  INSERT INTO Proveedor (nombre) VALUES 
  ('Auto Partes SA'), 
  ('Distribuidora ABC'), 
  ('Refacciones XYZ')
`)
.then(() => console.log('Done'))
.catch(console.error)
.finally(() => process.exit());
