async function test() {
  try {
    const cot = await fetch('http://localhost:4000/api/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUsuarios: null,
        idVehiculos: null,
        idServicios: null,
        idProductos: null,
        total_estimado: 1540,
        fecha: '2026-05-05'
      })
    }).then(r => r.json());
    console.log('Cotizacion:', cot);

    if (cot.error) {
      console.error("Failed creating cotizacion");
      return;
    }

    const cita = await fetch('http://localhost:4000/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUsuarios: null,
        idCotizacion: cot.id,
        fecha: '2026-05-25',
        hora: '09:00',
        nota: 'Prueba',
        estado: 'Pendiente'
      })
    }).then(r => r.json());
    console.log('Cita:', cita);
  } catch (err) {
    console.error(err);
  }
}
test();
