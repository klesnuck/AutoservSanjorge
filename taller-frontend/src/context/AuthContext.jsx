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

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [users, setUsers] = useState([]);

  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem('token');
    return activeToken
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeToken}` }
      : { 'Content-Type': 'application/json' };
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/roles`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('No se pudo cargar roles');
      const data = await response.json();
      setRoles(data);
    } catch {
      setRoles(DEFAULT_ROLES);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('No se pudo cargar usuarios');
      const data = await response.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    const savedCurrentUser = JSON.parse(localStorage.getItem('currentUser'));
    const savedToken = localStorage.getItem('token');

    const initialize = async () => {
      if (savedToken) {
        try {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${savedToken}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
            setToken(savedToken);
            setIsAuthenticated(true);
            localStorage.setItem('currentUser', JSON.stringify(userData));
          } else {
            // Token expirado o inválido: borrar sesión y forzar login
            setIsAuthenticated(false);
            setCurrentUser(null);
            setToken(null);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('token');
          }
        } catch {
          // En caso de error de red puntual, conservar credenciales locales si existen
          if (savedCurrentUser && savedToken) {
            setCurrentUser(savedCurrentUser);
            setToken(savedToken);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setToken(null);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('token');
          }
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
      }

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
      
      const { token: userToken, ...userWithoutToken } = data;
      setCurrentUser(userWithoutToken);
      setToken(userToken);
      setIsAuthenticated(true);

      localStorage.setItem('currentUser', JSON.stringify(userWithoutToken));
      if (userToken) {
        localStorage.setItem('token', userToken);
      }

      return { success: true, user: userWithoutToken };
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
    setToken(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  const saveRole = async (role) => {
    try {
      const hasId = role && typeof role.id !== 'undefined' && role.id !== null;
      const isNumericId = hasId && !Number.isNaN(Number(role.id));
      const method = isNumericId ? 'PUT' : 'POST';
      const url = isNumericId ? `${API_BASE}/api/roles/${role.id}` : `${API_BASE}/api/roles`;
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: role.name,
          description: role.description,
          permissions: Array.isArray(role.permissions) ? role.permissions.filter(p => typeof p === 'string') : [],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('saveRole failed', response.status, data);
        return { success: false, error: data.error || 'No se pudo guardar el rol' };
      }

      if (data && data.id) {
        setRoles((prev) => {
          if (method === 'POST') {
            if (prev.some((r) => r.id === data.id)) return prev.map((r) => (r.id === data.id ? data : r));
            return [...prev, data];
          }
          return prev.map((r) => (r.id === data.id ? data : r));
        });
        return { success: true, role: data };
      }

      await fetchRoles();
      return { success: true, role: data };
    } catch {
      return { success: false, error: 'No se pudo guardar el rol' };
    }
  };

  const deleteRole = async (roleId) => {
    try {
      const response = await fetch(`${API_BASE}/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
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
        headers: getAuthHeaders(),
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
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
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
        token,
        login,
        register,
        logout,
        roles,
        users,
        saveRole,
        deleteRole,
        saveUser,
        deleteUser,
        fetchUsers,
        fetchRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
