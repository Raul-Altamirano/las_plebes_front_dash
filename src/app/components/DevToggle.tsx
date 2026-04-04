import React from 'react';
import { useApp } from '../store/AppContext';

/**
 * DevToggle - Panel flotante para desarrollo
 * Solo visible en modo dev, permite alternar feature flags
 */
export function DevToggle() {
  const { payments, toggleFintocEnabled } = useApp();

  // Solo mostrar en modo dev
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 shadow-lg text-xs max-w-xs">
      <p className="font-bold text-yellow-800 mb-1">
        🔧 DEV MODE
      </p>
      <p className="text-yellow-700 mb-2">
        Fintoc: {payments.fintoc.enabled ? '✅ ON' : '❌ OFF'}
      </p>
      <button
        onClick={toggleFintocEnabled}
        className="w-full px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-medium rounded text-xs transition-colors"
      >
        Toggle Fintoc enabled
      </button>
      <p className="text-yellow-600 mt-2 text-[10px]">
        Esto simula que el SaaS owner habilitó/deshabilitó Fintoc para este tenant.
      </p>
    </div>
  );
}
