function Mapa() {
  return (
    <div className="w-full flex justify-center py-10">
      <div className="w-full max-w-5xl">
        <div className="w-full flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 rounded-md overflow-hidden h-72 md:h-80 shadow-sm">
            <iframe
              className="w-full h-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3604.552267782133!2d-101.01475892482992!3d25.38631797758973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8688731cfa1cc817%3A0xde415e182fd55a78!2sAutoservicio%20San%20Jorge!5e0!3m2!1ses-419!2smx!4v1763935261231!5m2!1ses-419!2smx"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa - Autoservicio San Jorge"
            ></iframe>
          </div>

          <aside className="w-full md:w-1/3 bg-white/90 p-4 rounded-lg shadow border border-gray-100">
            <h4 className="text-xl font-semibold text-gray-800 mb-2">Autoservicio San Jorge</h4>
            <p className="text-sm text-gray-600 mb-2">Dirección: Blvd. Humberto Cid Gonzales 3305, Col. Burocratas municipales, Saltillo, Coah</p>
            <p className="text-sm text-gray-600 mb-3">Horario: Lun - Vie 09:00 - 18:00 · Sáb 09:00 - 14:00</p>
            <a href="tel:5551234567" className="block text-blue-700 font-medium mb-4">Tel: 844-255-5432</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=25.38631797758973,-101.01475892482992" target="_blank" rel="noreferrer" className="inline-block w-full md:w-auto text-center px-4 py-2 bg-blue-800 text-white rounded-lg">Cómo llegar</a>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Mapa;
