const pool = require('./db');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'productos_has_servicios'")
.then(res => console.log(res.rows))
.catch(console.error).finally(() => process.exit());
