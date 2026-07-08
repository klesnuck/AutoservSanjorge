import { useNavigate } from "react-router-dom";
import '../styles/titulos.css'
import '../styles/card.css'

function Servicios() {
  const navigate = useNavigate();
  const servicios = [
    { nombre: "Cambio de aceite y filtro", color: "bg-red-600 hover:bg-blue-700", icon: "🛢️", descripcion: "Incluye:\naceite sintetico \nfiltro aceite\n revision niveles en general " },
    { nombre: "Afinacion basica", color: "bg-red-600 hover:bg-blue-700", icon: "🔧", descripcion: "Incluye:\nAceite sintetico o mineral\nFiltro aceite\nBujias cobre o platino\nFiltro aire\nFiltro gasolina(en caso de ser requerido)" },
    { nombre: "Afinacion integral", color: "bg-red-600 hover:bg-blue-700", icon: "🔧", descripcion: "Incluye:\nAceite sintetico o mineral\nFiltro aceite\nBujias cobre o platino \nFiltro aire\nFiltro gasolina(en caso de ser requerido)\nLimpieza de inyectores por boya\nRevision de niveles en general\nrelleno de hasta 1/4 liquidos\nRevision bandas y poleas" },
    { nombre: "Afinacion premium", color: "bg-red-600 hover:bg-blue-700", icon: "⚙️", descripcion: "Incluye:\nAceite sintetico o mineral\nFiltro aceite\nBujias cobre o platino \nFiltro aire\nFiltro gasolina(en caso de ser requerido)\nLimpieza de inyectores por ultrasonido\nRevision de niveles en general\nrelleno de hasta 1/4 liquidos\nRevision bandas y poleas" },
    { nombre: "Servicio frenos basico", color: "bg-red-600 hover:bg-blue-700", icon: "📅", descripcion: "Incluye:\nBalatas delanteras\nBalatas o zapatas delanteras\nRectificado discos y tambores\nAprendizaje caliper electronico (Solo si se requiere)\nLubricacion bujes caliper\nRevision mangueras frenos\nRevision de pistones caliper y cilindros." },
    { nombre: "Servicio frenos plus ", color: "bg-red-600 hover:bg-blue-700",icon:"", descripcion: "Incluye:\nBalatas delanteras\nBalatas o zapatas traseras\nRectificado discos y tambores\nAprendizaje caliper electronico\nLubricacion bujes caliper\nRevision mangueras frenos\nRevision de pistones caliper y cilindros\nCambio de liquido de frenos."},
    { nombre: "Servicio cambio anticongelante", color: "bg-red-600 hover:bg-blue-700",icon:"", descripcion: ""},
    { nombre: "Servicio cambio anticongelante premium", color: "bg-red-600 hover:bg-blue-700",icon:"", descripcion: ""},
    { nombre: "Agendar cita", color: "bg-red-600 hover:bg-blue-700",icon:"", descripcion: "En caso de presentar una falla"}
  ];

  function handleClick(servicio) {
    navigate("/formulario", { state: { servicio } });
  }

  return (
    <section className="p-8 bg-white  min-h-screen">
      <h1 className="text-4xl font-bold text-blue-900 mb-6 text-center titulos">
         Servicios a Cotizar
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicios.map((serv, index) => (
          <button
            key={index}
            onClick={() => handleClick(serv.nombre)}
            className="card-btn-container rounded-lg"
          >
            /*parte de adelante de la tarjeta */
            <div className="slide1" style={{ backgroundColor: serv.color.includes('blue')? '#4512eb' : '#df2c2c'}}>
              <h1 className="text-5xl text-white">{serv.icon}</h1>
              <h2 className="text-xl font-semibold px-4 text-white ">{serv.nombre}</h2>
            </div>

            <div className="slide2">
            <div className="scroll-description">
              {serv.descripcion && serv.descripcion.split('\n').map((line, i) => (
                <p key={i} className="text-sm text-white mb-1 text-center">{line}</p>
              ))}
            </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default Servicios;

