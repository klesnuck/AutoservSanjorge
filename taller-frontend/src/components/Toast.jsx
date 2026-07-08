import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Contexto ─────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Iconos por tipo ──────────────────────────────────────────────────────────
const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

const styles = {
  success: {
    container: 'bg-white border border-green-100 shadow-lg',
    icon: 'bg-green-100 text-green-600',
    bar: 'bg-green-500',
    title: 'text-green-700',
  },
  error: {
    container: 'bg-white border border-red-100 shadow-lg',
    icon: 'bg-red-100 text-red-600',
    bar: 'bg-red-500',
    title: 'text-red-700',
  },
  warning: {
    container: 'bg-white border border-amber-100 shadow-lg',
    icon: 'bg-amber-100 text-amber-600',
    bar: 'bg-amber-400',
    title: 'text-amber-700',
  },
  info: {
    container: 'bg-white border border-blue-100 shadow-lg',
    icon: 'bg-blue-100 text-blue-600',
    bar: 'bg-blue-500',
    title: 'text-blue-700',
  },
};

// ─── Ítem individual de Toast ─────────────────────────────────────────────────
function ToastItem({ id, type = 'info', title, message, duration = 4000, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const s = styles[type] || styles.info;

  useEffect(() => {
    // Animación de entrada
    const enterTimer = setTimeout(() => setVisible(true), 10);

    // Barra de progreso
    const step = 100 / (duration / 50);
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(progressTimer);
          return 0;
        }
        return prev - step;
      });
    }, 50);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
      clearInterval(progressTimer);
    };
  }, [id, duration, onRemove]);

  return (
    <div
      className={`w-full max-w-sm rounded-xl overflow-hidden pointer-events-auto transition-all duration-300 ${s.container} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
      style={{ transform: visible ? 'translateX(0)' : 'translateX(110%)' }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Ícono */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.icon}`}>
          {icons[type]}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0 pt-0.5">
          {title && <p className={`text-sm font-bold leading-tight ${s.title}`}>{title}</p>}
          {message && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{message}</p>}
        </div>

        {/* Botón cerrar */}
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onRemove(id), 300);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 -mt-0.5 p-1 rounded-md hover:bg-gray-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all ease-linear ${s.bar}`}
          style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
        />
      </div>
    </div>
  );
}

// ─── Contenedor de Toasts ─────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 items-end pointer-events-none w-full max-w-sm">
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={removeToast} />
      ))}
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  // Métodos de conveniencia
  const toast = {
    success: (message, title = '¡Éxito!') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Ocurrió un error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Atención') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Información') => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
