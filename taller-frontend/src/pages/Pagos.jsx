import React, { useState, useEffect } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { useToast } from "../components/Toast";

export default function Pagos() {
  const toast = useToast();
  const total = 1250;
  const [metodo, setMetodo] = useState("efectivo");
  const [monto, setMonto] = useState(1500);
  const [referencia, setReferencia] = useState("");
  const [cambio, setCambio] = useState(0);
  const [estado, setEstado] = useState("");

  useEffect(() => {
    calcular();
  }, [monto]);

  const calcular = () => {
    const resultado = monto - total;
    setCambio(resultado);

    if (resultado >= 0) {
      setEstado("Pago completo");
    } else {
      setEstado("Monto insuficiente");
    }
  };

  const procesar = () => {
    toast.success('El pago ha sido registrado correctamente.', 'Pago procesado');
  };

  return (
    <AdminLayout activeTab="pagos">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Método de Pago</h1>
        <p className="text-gray-500 text-sm mb-8">Seleccione y procese el método de pago para la orden pendiente</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Resumen */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Resumen de cuenta</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                <p className="font-semibold text-gray-900 text-lg">Carlos Méndez García</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Orden de Servicio</p>
                <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                  ORD-2024-089
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Servicio Realizado</p>
                <p className="text-gray-700">Cambio de aceite y filtros</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 text-right">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total a pagar</p>
              <h2 className="text-4xl font-black text-blue-600">${total.toFixed(2)}</h2>
            </div>
          </div>

          {/* Pago */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Procesar Pago</h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pago</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta (Crédito/Débito)</option>
                  <option value="transferencia">🏦 Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Monto recibido</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value))}
                    className="w-full border border-gray-300 pl-8 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none font-bold"
                  />
                </div>
              </div>

              {metodo !== "efectivo" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Referencia / Folio</label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej. REF-834920"
                    className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
                  />
                </div>
              )}

              <div className={`mt-6 p-5 rounded-xl border ${cambio < 0 ? 'bg-red-50 border-red-100 text-red-900' : 'bg-[#f6fcf8] border-[#a7f3d0] text-[#059669]'}`}>
                <p className="text-sm font-semibold opacity-80 uppercase tracking-wilder mb-1">
                  {cambio < 0 ? 'Monto Faltante' : 'Cambio a devolver'}
                </p>
                <h2 className="text-3xl font-black mb-1">${Math.abs(cambio).toFixed(2)}</h2>
                <div className="flex items-center gap-2 text-sm font-bold">
                  {cambio < 0 ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> {estado}</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {estado}</>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-8">
              <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 font-bold transition-all">
                Cancelar
              </button>
              <button
                onClick={procesar}
                disabled={cambio < 0}
                className={`px-5 py-2.5 text-white rounded-xl font-bold flex items-center gap-2 transition-all ${cambio < 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#1a56db] hover:bg-blue-800 focus:ring-4 focus:ring-blue-300'}`}
              >
                Procesar Pago
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
