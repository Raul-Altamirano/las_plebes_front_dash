import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, AlertCircle, Loader2, Eye, EyeOff, Save, ExternalLink, Download, Building2, Store, Banknote, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { DevToggle } from '../components/DevToggle';
import { usePayments } from '../store/PaymentsContext';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import type { OpenPayConfig, FintocConfig, OpenPayMode, FintocMode, PaymentMethodKey, PaymentTransaction } from '../types/payments';
import {
  OPENPAY_MODE_LABELS,
  FINTOC_MODE_LABELS,
  CONNECTION_STATUS_LABELS,
  CONNECTION_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_COLORS,
  PROCESSOR_LABELS,
  PROCESSOR_COLORS,
} from '../types/payments';
import { exportToCSV } from '../utils/csvExport';

type TabKey = 'config' | 'methods' | 'transactions';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'config', label: 'Configuración' },
  { key: 'methods', label: 'Métodos de Pago' },
  { key: 'transactions', label: 'Historial' },
];

// Íconos por método de pago
const PAYMENT_METHOD_ICONS: Record<PaymentMethodKey, React.ElementType> = {
  CARD: CreditCard,
  SPEI: Building2,
  OXXO: Store,
  FINTOC_SPEI: Banknote,
};

export function Payments() {
  const { 
    config, 
    fintocConfig,
    paymentMethods, 
    transactions, 
    loading, 
    verifying,
    verifyingFintoc,
    saveConfig,
    saveFintocConfig,
    verifyConnection,
    verifyFintocConnection,
    togglePaymentMethod,
    refreshTransactions,
    isConnected,
    isFintocConnected,
  } = usePayments();
  
  const { payments: appPayments } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('config');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showFintocSecretKey, setShowFintocSecretKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFintoc, setIsSavingFintoc] = useState(false);

  // Permisos
  const canConfigure = hasPermission('payments:configure');
  const canRead = hasPermission('payments:read');

  // Form state para OpenPay
  const [formData, setFormData] = useState<OpenPayConfig>({
    merchantId: '',
    publicKey: '',
    privateKey: '',
    mode: 'SANDBOX',
    connectionStatus: 'DISCONNECTED',
  });

  // Form state para Fintoc
  const [fintocFormData, setFintocFormData] = useState<FintocConfig>({
    mode: 'sandbox',
    secretKey: '',
    publicKey: '',
    connectionStatus: 'DISCONNECTED',
  });

  // Cargar config cuando esté disponible
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  useEffect(() => {
    if (fintocConfig) {
      setFintocFormData(fintocConfig);
    }
  }, [fintocConfig]);

  // Cargar transacciones al montar
  useEffect(() => {
    refreshTransactions();
  }, []);

  // Filtros para transacciones
  const [filters, setFilters] = useState({
    processor: '',
    method: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const handleChange = (field: keyof OpenPayConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFintocChange = (field: keyof FintocConfig, value: any) => {
    setFintocFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    if (!canConfigure) {
      showToast('No tienes permiso para configurar métodos de pago', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveConfig(formData);
      showToast('Configuración de OpenPay guardada exitosamente', 'success');
    } catch (error) {
      showToast('Error al guardar la configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFintocConfig = async () => {
    if (!canConfigure) {
      showToast('No tienes permiso para configurar métodos de pago', 'error');
      return;
    }

    setIsSavingFintoc(true);
    try {
      await saveFintocConfig(fintocFormData);
      showToast('Configuración de Fintoc guardada exitosamente', 'success');
    } catch (error) {
      showToast('Error al guardar la configuración de Fintoc', 'error');
    } finally {
      setIsSavingFintoc(false);
    }
  };

  const handleVerifyConnection = async () => {
    const success = await verifyConnection();
    if (success) {
      showToast('Conexión con OpenPay verificada exitosamente', 'success');
    } else {
      showToast('Error al verificar la conexión con OpenPay', 'error');
    }
  };

  const handleVerifyFintocConnection = async () => {
    const success = await verifyFintocConnection();
    if (success) {
      showToast('Conexión con Fintoc verificada exitosamente', 'success');
    } else {
      showToast('Error al verificar la conexión con Fintoc', 'error');
    }
  };

  const handleToggleMethod = async (key: PaymentMethodKey, enabled: boolean) => {
    // Validar según el método
    if (key === 'FINTOC_SPEI') {
      if (!appPayments.fintoc.enabled) {
        showToast('Fintoc no está habilitado en tu plan', 'warning');
        return;
      }
      if (!appPayments.fintoc.isConfigured) {
        showToast('Configura tus credenciales de Fintoc primero', 'warning');
        return;
      }
    } else {
      if (!isConnected) {
        showToast('Conecta tu cuenta de OpenPay primero', 'warning');
        return;
      }
    }

    try {
      await togglePaymentMethod(key, enabled);
      showToast(
        `Método ${PAYMENT_METHOD_LABELS[key]} ${enabled ? 'habilitado' : 'deshabilitado'}`,
        'success'
      );
    } catch (error) {
      showToast('Error al actualizar el método de pago', 'error');
    }
  };

  const handleExportTransactions = () => {
    const data = filteredTransactions.map(t => ({
      'ID Transacción': t.processorTransactionId,
      'Procesador': t.processor,
      'Fecha': new Date(t.createdAt).toLocaleString('es-MX'),
      'Pedido': t.orderNumber || '-',
      'Monto': `$${t.amount.toFixed(2)} ${t.currency}`,
      'Método': PAYMENT_METHOD_LABELS[t.method],
      'Estado': TRANSACTION_STATUS_LABELS[t.status],
      'Descripción': t.description || '-',
    }));

    exportToCSV(data, 'transacciones-pagos');
    showToast('Exportación completada', 'success');
  };

  // Aplicar filtros a transacciones
  const filteredTransactions = transactions.filter(t => {
    if (filters.processor && t.processor !== filters.processor) return false;
    if (filters.method && t.method !== filters.method) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.startDate && new Date(t.createdAt) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(t.createdAt) > new Date(filters.endDate)) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
return (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
);
  }

  return (
    <>
 <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab 1: Configuración */}
        {activeTab === 'config' && (
          <div className="space-y-8">
            {/* SECCIÓN OPENPAY - No tocar */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">OpenPay</h3>
                <p className="text-sm text-gray-600">Configuración del procesador de pagos OpenPay</p>
              </div>

              {/* Banner informativo OpenPay */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">¿Dónde encuentro mis credenciales?</p>
                    <p className="mb-2">
                      Inicia sesión en tu{' '}
                      <a
                        href="https://dashboard.openpay.mx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900"
                      >
                        Dashboard de OpenPay →
                      </a>{' '}
                      y ve a Configuración → Credenciales.
                    </p>
                    <p className="text-xs text-blue-700">
                      Asegúrate de usar las credenciales correctas según el modo (Sandbox o Producción).
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario OpenPay */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div className="space-y-4">
                  {/* Merchant ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merchant ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.merchantId}
                      onChange={(e) => handleChange('merchantId', e.target.value)}
                      disabled={!canConfigure}
                      placeholder="mptdggroeidqeioetdlu"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>

                  {/* Public Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key Pública <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.publicKey}
                      onChange={(e) => handleChange('publicKey', e.target.value)}
                      disabled={!canConfigure}
                      placeholder="pk_test_3a1b2c3d4e5f6g7h"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>

                  {/* Private Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key Privada <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPrivateKey ? 'text' : 'password'}
                        value={formData.privateKey}
                        onChange={(e) => handleChange('privateKey', e.target.value)}
                        disabled={!canConfigure}
                        placeholder="sk_test_************************"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Esta clave se guarda de forma segura y solo se muestra enmascarada
                    </p>
                  </div>

                  {/* Modo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modo de Operación <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={formData.mode === 'SANDBOX'}
                          onChange={() => handleChange('mode', 'SANDBOX' as OpenPayMode)}
                          disabled={!canConfigure}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {OPENPAY_MODE_LABELS.SANDBOX}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={formData.mode === 'PRODUCTION'}
                          onChange={() => handleChange('mode', 'PRODUCTION' as OpenPayMode)}
                          disabled={!canConfigure}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {OPENPAY_MODE_LABELS.PRODUCTION}
                        </span>
                      </label>
                    </div>
                    {formData.mode === 'PRODUCTION' && (
                      <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                        ⚠️ Asegúrate de usar tus credenciales de producción.
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveConfig}
                    disabled={!canConfigure || isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar configuración
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleVerifyConnection}
                    disabled={!config || verifying}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Verificar conexión
                      </>
                    )}
                  </button>
                </div>

                {/* Estado de conexión */}
                {config && config.connectionStatus !== 'DISCONNECTED' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${CONNECTION_STATUS_COLORS[config.connectionStatus]}`}>
                      {config.connectionStatus === 'CONNECTED' && <CheckCircle className="w-4 h-4" />}
                      {config.connectionStatus === 'ERROR' && <XCircle className="w-4 h-4" />}
                      <span className="font-medium text-sm">
                        {CONNECTION_STATUS_LABELS[config.connectionStatus]}
                      </span>
                      {config.lastVerifiedAt && config.connectionStatus === 'CONNECTED' && (
                        <span className="text-sm">- {formatDate(config.lastVerifiedAt)}</span>
                      )}
                    </div>
                    {config.errorMessage && (
                      <p className="mt-2 text-sm text-red-600">{config.errorMessage}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* DIVIDER */}
            <div className="border-t border-gray-300"></div>

            {/* PASO 4: SECCIÓN FINTOC */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Fintoc</h3>
                <p className="text-sm text-gray-600">Pago con SPEI procesado por Fintoc</p>
              </div>

              {/* CASO A: Fintoc NO habilitado */}
              {!appPayments.fintoc.enabled && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-2">
                        🔒 Fintoc no está habilitado
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Este procesador no está disponible en tu plan actual. Contacta a soporte para habilitarlo.
                      </p>
                      <button
                        onClick={() => showToast('Contacta a soporte@pochteca.com para habilitar Fintoc', 'info')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        Contactar soporte
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO B: Fintoc habilitado */}
              {appPayments.fintoc.enabled && (
                <>
                  {/* Banner informativo Fintoc */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-indigo-800">
                        <p className="font-medium mb-1">¿Dónde encuentro mis credenciales?</p>
                        <p className="mb-2">
                          Inicia sesión en tu Dashboard de Fintoc → Configuración → API Keys
                        </p>
                        <a
                          href="https://docs.fintoc.com/docs/welcome"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-700 underline hover:text-indigo-900 inline-flex items-center gap-1"
                        >
                          docs.fintoc.com/docs/welcome
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Formulario Fintoc */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                    <div className="space-y-4">
                      {/* Secret Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Secret Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showFintocSecretKey ? 'text' : 'password'}
                            value={fintocFormData.secretKey}
                            onChange={(e) => handleFintocChange('secretKey', e.target.value)}
                            disabled={!canConfigure}
                            placeholder="sk_live_************************"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFintocSecretKey(!showFintocSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showFintocSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Esta clave se guarda de forma segura
                        </p>
                      </div>

                      {/* Public Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Public Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={fintocFormData.publicKey}
                          onChange={(e) => handleFintocChange('publicKey', e.target.value)}
                          disabled={!canConfigure}
                          placeholder="pk_live_************************"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                        />
                      </div>

                      {/* Modo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Modo <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="fintocMode"
                              checked={fintocFormData.mode === 'sandbox'}
                              onChange={() => handleFintocChange('mode', 'sandbox' as FintocMode)}
                              disabled={!canConfigure}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">
                              {FINTOC_MODE_LABELS.sandbox}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="fintocMode"
                              checked={fintocFormData.mode === 'live'}
                              onChange={() => handleFintocChange('mode', 'live' as FintocMode)}
                              disabled={!canConfigure}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">
                              {FINTOC_MODE_LABELS.live}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveFintocConfig}
                        disabled={!canConfigure || isSavingFintoc}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                      >
                        {isSavingFintoc ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Guardar configuración
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleVerifyFintocConnection}
                        disabled={!fintocConfig || verifyingFintoc}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                      >
                        {verifyingFintoc ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Verificar
                          </>
                        )}
                      </button>
                    </div>

                    {/* Estado de conexión */}
                    {fintocConfig && fintocConfig.connectionStatus !== 'DISCONNECTED' && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${CONNECTION_STATUS_COLORS[fintocConfig.connectionStatus]}`}>
                          {fintocConfig.connectionStatus === 'CONNECTED' && <CheckCircle className="w-4 h-4" />}
                          {fintocConfig.connectionStatus === 'ERROR' && <XCircle className="w-4 h-4" />}
                          <span className="font-medium text-sm">
                            {CONNECTION_STATUS_LABELS[fintocConfig.connectionStatus]}
                          </span>
                          {fintocConfig.lastVerifiedAt && fintocConfig.connectionStatus === 'CONNECTED' && (
                            <span className="text-sm">- {formatDate(fintocConfig.lastVerifiedAt)}</span>
                          )}
                        </div>
                        {fintocConfig.errorMessage && (
                          <p className="mt-2 text-sm text-red-600">{fintocConfig.errorMessage}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Métodos de Pago */}
        {activeTab === 'methods' && (
          <div className="space-y-4">
            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ Conecta tu cuenta de OpenPay en la pestaña "Configuración" para habilitar métodos de pago.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => {
                const MethodIcon = PAYMENT_METHOD_ICONS[method.key];
                
                // Determinar estados para FINTOC_SPEI
                let isDisabled = false;
                let disabledReason = '';
                let badgeText = '';
                
                if (method.key === 'FINTOC_SPEI') {
                  if (!appPayments.fintoc.enabled) {
                    isDisabled = true;
                    disabledReason = 'Fintoc no está habilitado en tu plan';
                    badgeText = 'No habilitado';
                  } else if (!appPayments.fintoc.isConfigured) {
                    isDisabled = true;
                    disabledReason = 'Configura tus credenciales en la pestaña Configuración';
                    badgeText = 'Sin configurar';
                  }
                } else {
                  if (!isConnected) {
                    isDisabled = true;
                    disabledReason = 'Conecta tu cuenta de OpenPay primero';
                  }
                }

                return (
                  <div
                    key={method.key}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${method.key === 'FINTOC_SPEI' ? 'bg-indigo-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                          <MethodIcon className={`w-6 h-6 ${method.key === 'FINTOC_SPEI' ? 'text-indigo-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{method.label}</h3>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </div>

                      {/* Toggle switch */}
                      <div className="flex flex-col items-end gap-1">
                        {isDisabled && badgeText && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {badgeText}
                          </span>
                        )}
                        <label 
                          className="relative inline-flex items-center cursor-pointer"
                          title={isDisabled ? disabledReason : ''}
                        >
                          <input
                            type="checkbox"
                            checked={method.isEnabled}
                            onChange={(e) => handleToggleMethod(method.key, e.target.checked)}
                            disabled={isDisabled || !canConfigure}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Comisión</span>
                      <span className="text-sm font-medium text-gray-700">{method.commission}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Historial de Transacciones - PASO 6 */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Filtro Procesador */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
                  <select
                    value={filters.processor}
                    onChange={(e) => setFilters({ ...filters, processor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="OPENPAY">OpenPay</option>
                    <option value="FINTOC">Fintoc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                  <select
                    value={filters.method}
                    onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Todos</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Todos</option>
                    {Object.entries(TRANSACTION_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {filteredTransactions.length} transacción{filteredTransactions.length !== 1 ? 'es' : ''}
                </span>
                <button
                  onClick={handleExportTransactions}
                  disabled={filteredTransactions.length === 0}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Tabla de transacciones */}
            {filteredTransactions.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No hay transacciones
                </h3>
                <p className="text-gray-500">
                  {filters.processor || filters.method || filters.status || filters.startDate || filters.endDate
                    ? 'No se encontraron transacciones con los filtros aplicados.'
                    : 'Las transacciones procesadas aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID Transacción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Procesador
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pedido
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-gray-900">
                              {transaction.processorTransactionId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${PROCESSOR_COLORS[transaction.processor]}`}>
                              {PROCESSOR_LABELS[transaction.processor]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {formatDate(transaction.createdAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {transaction.orderId ? (
                              <Link
                                to={`/orders/${transaction.orderId}`}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {transaction.orderNumber}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              ${transaction.amount.toFixed(2)} {transaction.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {PAYMENT_METHOD_LABELS[transaction.method]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${TRANSACTION_STATUS_COLORS[transaction.status]}`}>
                              {TRANSACTION_STATUS_LABELS[transaction.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <a
                              href={transaction.processorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              Ver en {transaction.processor === 'FINTOC' ? 'Fintoc' : 'OpenPay'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
    </div>

      {/* PASO 7: DevToggle */}
      <DevToggle />
    </>
  );
}
