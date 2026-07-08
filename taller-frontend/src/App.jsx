import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Inicio from "./pages/Inicio";
import Servicios from "./pages/Servicios";
import FormularioCarro from "./pages/FormularioCarro";
import Nosotros from "./pages/nosotros";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ReportesCliente from "./pages/ReportesCliente";
import AdminCitas from "./pages/AdminCitas";
import Productos from "./pages/Productos";
import Compras from "./pages/Compras";
import Cotizaciones from "./pages/Cotizaciones";
import Reportes from "./pages/Reportes";
import Vehiculos from "./pages/Vehiculos";
import AdminServicios from "./pages/AdminServicios";
import AdminMantenimiento from "./pages/AdminMantenimiento";
import Ventas from "./pages/Ventas";
import AdminVehiculos from "./pages/AdminVehiculos";
import logo from "./assets/logg.png";
import "./styles/barra.scss";

function App() {
  const { isAuthenticated, currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const showMainNav = isAuthenticated && !isAdminRoute && !isAuthPage && currentUser?.role !== "Administrador";

  return (
    <div className="min-h-screen bg-gray-100 text-center">
 
      {showMainNav && (
        <nav className="bg-blue-950 text-white px-4 py-2 flex gap-4 items-center text-lg justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Logo San Jorge" className="h-12" />
            {currentUser && currentUser.name && (
              <span className="font-semibold text-white/90 text-base border-l border-white/20 pl-3 hidden sm:inline-block">Hola, {currentUser.name.split(' ')[0]}</span>
            )}
          </Link>
          <div className="nav-links">
            <Link to="/">Inicio</Link>  
            <Link to="/servicios">Cotizar</Link>
            <Link to="/mis-reportes">Reportes</Link>
            <Link to="/nosotros">Nosotros</Link>
            <button 
              onClick={handleLogout}
              className="logout-button"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
        <Route path="/servicios" element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
        <Route path="/formulario" element={<ProtectedRoute><FormularioCarro /></ProtectedRoute>} />
        <Route path="/mis-reportes" element={<ProtectedRoute><ReportesCliente /></ProtectedRoute>} />
        <Route path="/nosotros" element={<ProtectedRoute><Nosotros /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/citas" element={<AdminRoute><AdminCitas /></AdminRoute>} />
        <Route path="/admin/productos" element={<AdminRoute><Productos /></AdminRoute>} />
        <Route path="/admin/compras" element={<AdminRoute><Compras /></AdminRoute>} />
        <Route path="/admin/cotizaciones" element={<AdminRoute><Cotizaciones /></AdminRoute>} />
        <Route path="/admin/reportes" element={<AdminRoute><Reportes /></AdminRoute>} />
        <Route path="/admin/vehiculos" element={<AdminRoute><Vehiculos /></AdminRoute>} />
        <Route path="/admin/mantenimiento" element={<AdminRoute><AdminMantenimiento /></AdminRoute>} />
        <Route path="/admin/servicios" element={<AdminRoute><AdminServicios /></AdminRoute>} />
        <Route path="/admin/ventas" element={<AdminRoute><Ventas /></AdminRoute>} />
        <Route path="/admin/catalogo-vehiculos" element={<AdminRoute><AdminVehiculos /></AdminRoute>} />
      </Routes>
    </div>
  );
}

export default App;
