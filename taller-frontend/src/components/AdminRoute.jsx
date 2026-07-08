import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function AdminRoute({ children }) {
  const { isAuthenticated, loading, currentUser } = useContext(AuthContext);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!isAuthenticated || !currentUser || currentUser.role !== "Administrador") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default AdminRoute;
