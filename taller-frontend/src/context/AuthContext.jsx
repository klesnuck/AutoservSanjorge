/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const DEFAULT_ROLES = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso completo al sistema',
    color: '#8B5CF6',
    permissions: [
      'Dashboard',
      'Citas',
      'Vehículos',
      'Servicios',
      'Productos',
      'Ventas',
      'Compras',
      'Cotizaciones',
      'Reportes',
      'Usuarios',
      'Roles',
    ],
  },
  {
    id: 'tecnico',
    name: 'Técnico',
    description: 'Acceso a servicios y mantenimiento',
    color: '#60A5FA',
    permissions: ['Citas', 'Vehículos', 'Servicios'],
  },
  {
    id: 'cliente',
    name: 'Cliente',
    description: 'Acceso al portal de clientes',
    color: '#34D399',
    permissions: ['Cotizaciones', 'Reportes'],
  },
];

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [users, setUsers] = useState([]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/roles`);
      if (!response.ok) throw new Error('No se pudo cargar roles');
      const data = await response.json();
      setRoles(data);
    } catch {
      setRoles(DEFAULT_ROLES);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`);
      if (!response.ok) throw new Error('No se pudo cargar usuarios');
      const data = await response.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    const savedCurrentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (savedCurrentUser) {
      setCurrentUser(savedCurrentUser);
      setIsAuthenticated(true);
    }

    const initialize = async () => {
      await Promise.all([fetchRoles(), fetchUsers()]);
      setLoading(false);
    };

    initialize();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Credenciales inválidas' };
      }
      setCurrentUser(data);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
      return { success: true, user: data };
    } catch {
      return { success: false, error: 'No fue posible iniciar sesión' };
    }
  };

  const register = async ({ name, email, password, phone }) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'No fue posible registrarse' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'No fue posible registrarse' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const saveRole = async (role) => {
    try {
      // If role.id exists but is not a numeric id returned by backend, treat as create (POST)
      const hasId = role && typeof role.id !== 'undefined' && role.id !== null;
      const isNumericId = hasId && !Number.isNaN(Number(role.id));
      const method = isNumericId ? 'PUT' : 'POST';
      const url = isNumericId ? `${API_BASE}/api/roles/${role.id}` : `${API_BASE}/api/roles`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: role.name,
          description: role.description,
          permissions: Array.isArray(role.permissions) ? role.permissions.filter(p => typeof p === 'string') : [],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // try to provide backend error message for UI
        console.error('saveRole failed', response.status, data);
        return { success: false, error: data.error || 'No se pudo guardar el rol' };
      }
      // If backend returned a well-formed role, update locally to show immediately
      if (data && data.id) {
        setRoles((prev) => {
          if (method === 'POST') {
            // avoid duplicates if id already exists
            if (prev.some((r) => r.id === data.id)) return prev.map((r) => (r.id === data.id ? data : r));
            return [...prev, data];
          }
          return prev.map((r) => (r.id === data.id ? data : r));
        });
        return { success: true, role: data };
      }

      // fallback: refresh roles from backend to ensure consistent state
      await fetchRoles();
      return { success: true, role: data };
    } catch {
      return { success: false, error: 'No se pudo guardar el rol' };
    }
  };

  const deleteRole = async (roleId) => {
    try {
      const response = await fetch(`${API_BASE}/api/roles/${roleId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'No se pudo eliminar el rol' };
      }
      await fetchRoles();
      return { success: true };
    } catch {
      return { success: false, error: 'No se pudo eliminar el rol' };
    }
  };

  const saveUser = async (user) => {
    try {
      const method = user.id ? 'PUT' : 'POST';
      const url = user.id ? `${API_BASE}/api/users/${user.id}` : `${API_BASE}/api/users`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          phone: user.phone || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'No se pudo guardar el usuario' };
      }
      await fetchUsers();
      return { success: true, user: data };
    } catch {
      return { success: false, error: 'No se pudo guardar el usuario' };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'No se pudo eliminar el usuario' };
      }
      await fetchUsers();
      return { success: true };
    } catch {
      return { success: false, error: 'No se pudo eliminar el usuario' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        currentUser,
        login,
        register,
        logout,
        roles,
        users,
        saveRole,
        deleteRole,
        users,
        saveUser,
        deleteUser,
        fetchUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
