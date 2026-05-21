/**
 * src/app/pages/Payments.tsx
 * Módulo de Pagos — versión final.
 * Diseño Figma · usePaymentFlags desde DB · Onboarding con patchConfig.
 */
import { saveDepositAccount, getDepositAccount } from '../services/paymentsService';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings2, CreditCard, Clock, ChevronDown, ChevronUp,
  CheckCircle, Lock, AlertTriangle, Info,
  Download, RefreshCw, Eye, EyeOff, Loader2,
  ArrowRight, Calendar, X,
  TrendingUp, Banknote, Building2, Store, Truck,
} from 'lucide-react';
import { usePayments }      from '../store/PaymentsContext';
import { useAuth }          from '../store/AuthContext';
import { useToast }         from '../store/ToastContext';
import { useAudit }         from '../store/AuditContext';
import { exportIntentsCSV } from '../services/paymentsService';
import type { IntentStatus, TenantGateway } from '../types/payments';
import {
  INTENT_STATUS_LABEL, INTENT_STATUS_COLOR,
  CLABE_BANKS, PLAN_LABEL, PLAN_TRUST_LEVEL,
} from '../types/payments';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n);
const fmtFull = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);
const fmtShort = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—';

// ── usePaymentFlags — lee paymentConfig desde el contexto (DB) ────────────────
function usePaymentFlags() {
  const { paymentConfig, tenantGateways } = usePayments();

  // Alerts en tiempo real desde el status de tenantGateways
  const alerts = tenantGateways
    .filter(g => g.status === 'error')
    .map(g => ({
      id:       g.id,
      provider: g.provider,
      message:  `${g.provider} tiene un error de autenticación — tus ventas están pausadas.`,
    }));

  const flags = paymentConfig?.flags;

  return {
    showOwnGateways:  flags?.showOwnGateways  ?? false,
    showMpOwnAccount: flags?.showOwnGateways  ?? false,
    showStats:        flags?.showStats        ?? false,
    canExportCsv:     flags?.canExportCsv     ?? false,
    canExportPdf:     flags?.canExportPdf     ?? false,
    showTrustMeter:   flags?.showTrustMeter   ?? true,
    trustLevel:      (flags?.trustLevel       ?? 1) as 1 | 2 | 3,
    nextDeposit:      flags?.nextDeposit      ?? null,
    planId:           paymentConfig?.planId   ?? 'free',
    alerts,
  };
}

// ── Onboarding Modal ──────────────────────────────────────────────────────────
// Fallback key para evitar re-mostrar si la llamada al API falla
const OB_FALLBACK_KEY = 'xokly_payments_ob_done';

function OnboardingModal({
  onClose,
  onComplete,
}: {
  onClose:    () => void;
  onComplete: () => Promise<void>;
}) {
  const [step,   setStep]   = useState(1);
  const [clabe,  setClabe]  = useState('');
  const [holder, setHolder] = useState('');
  const { showToast } = useToast();

  const bank     = CLABE_BANKS[clabe.substring(0, 3)] || '';
  const canNext2 = clabe.length === 18 && holder.trim().length > 2;
  const progressW = step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full';

  const finish = async () => {
    localStorage.setItem(OB_FALLBACK_KEY, '1'); // fallback local
    try {
      await onComplete(); // → patchConfig({ showOnboarding: false })
    } catch {
      // no bloqueante — el usuario ya completó el wizard
    }
    onClose();
    showToast('¡Cuenta configurada! Ya puedes recibir pagos.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200">
          <div className={`h-full bg-[#0A3D2B] rounded-full transition-all duration-500 ${progressW}`} />
        </div>
        <p className="text-center text-xs text-gray-500 pt-3">Paso {step} de 3</p>

        {/* ── Paso 1: Bienvenida ── */}
        {step === 1 && (
          <div className="px-8 pb-8 pt-4 text-center">
            <div className="flex justify-center items-center gap-4 mb-8">
              {[
                { icon: CreditCard, bg: 'bg-blue-100',    label: 'Cliente paga'     },
                { icon: Store,      bg: 'bg-gray-100',    label: 'Xokly verifica'   },
                { icon: Banknote,   bg: 'bg-emerald-100', label: 'Tú recibes'       },
              ].map(({ icon: Icon, bg, label }, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-gray-700" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-gray-400 mt-3 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Tu tienda ya puede recibir pagos 🎉
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Xokly gestiona Mercado Pago por ti para que puedas vender desde hoy con total seguridad.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { emoji: '💳', label: 'Tarjeta de crédito o débito' },
                { emoji: '🏪', label: 'Pago en OXXO'               },
                { emoji: '🏛️', label: 'Transferencia SPEI'          },
              ].map(({ emoji, label }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <span className="text-2xl block mb-1">{emoji}</span>
                  <span className="text-xs text-gray-700 font-medium leading-tight block">{label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-[#0A3D2B] hover:bg-[#0d4f38] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base transition-colors"
            >
              Configurar mi cuenta <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Necesitamos una CLABE para depositarte tus ganancias
            </p>
          </div>
        )}

        {/* ── Paso 2: CLABE ── */}
        {step === 2 && (
          <div className="px-8 pb-8 pt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Tu cuenta de depósito</h2>
            <p className="text-sm text-gray-500 mb-6">Aquí recibirás tus ganancias cada martes.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CLABE Interbancaria</label>
                  <input
                    type="text" inputMode="numeric" maxLength={18}
                    value={clabe}
                    onChange={e => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
                    placeholder="18 dígitos"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                      clabe.length === 18 ? 'border-emerald-400' : clabe.length > 0 ? 'border-amber-400' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Banco</label>
                  <input
                    type="text" readOnly
                    value={bank || (clabe.length >= 3 ? 'No identificado' : '')}
                    placeholder="Auto-detectado"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del Titular</label>
                <input
                  type="text" value={holder}
                  onChange={e => setHolder(e.target.value)}
                  placeholder="Igual que en tu banco"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="text-xs text-gray-400 mt-1">Debe coincidir exactamente con el nombre registrado en tu banco.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-none px-5 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                ← Atrás
              </button>
              <button
                onClick={() => setStep(3)} disabled={!canNext2}
                className="flex-1 bg-[#0A3D2B] hover:bg-[#0d4f38] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Guardar y continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Listo ── */}
        {step === 3 && (
          <div className="px-8 pb-8 pt-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Todo listo!</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Tu tienda está activa y lista para recibir pagos. Recibirás tus ganancias cada martes.
            </p>
            <button
              onClick={finish}
              className="w-full bg-[#0A3D2B] hover:bg-[#0d4f38] text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Ir a mi dashboard de pagos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Alert Banners ─────────────────────────────────────────────────────────────
function AlertBanner({
  alerts,
  onDismiss,
}: {
  alerts:    { id: string; provider: string; message: string }[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <>
      {alerts.map(a => (
        <div key={a.id} className="bg-red-600 text-white px-5 py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{a.message}</span>
          <button className="underline font-medium text-white hover:text-red-200 transition-colors whitespace-nowrap">
            Ver en historial →
          </button>
          <button onClick={() => onDismiss(a.id)} className="ml-2 text-red-200 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </>
  );
}

// ── MP Xokly Card ─────────────────────────────────────────────────────────────
function MPXoklyCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00B1EA] rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">MP</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">Mercado Pago</h3>
              <span className="flex items-center gap-1 text-xs border border-emerald-500 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle className="w-3 h-3" /> Incluido en tu plan
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Acepta tarjetas, OXXO y transferencias. El pago lo recibe Xokly y te lo deposita una vez confirmada la entrega.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 flex-shrink-0 ml-4">
          Activo <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
        </div>
      </div>
    </div>
  );
}

// ── Deposit Account Form ──────────────────────────────────────────────────────
function DepositAccountForm() {
  const flags = usePaymentFlags();
  const { showToast } = useToast();

  const [clabe,   setClabe]   = useState('');
  const [holder,  setHolder]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [account, setAccount] = useState<DepositAccountResponse | null>(null);

  const bank    = CLABE_BANKS[clabe.substring(0, 3)] || '';
  const canSave = clabe.length === 18 && holder.trim().length > 2;

  // Cargar estado actual de la cuenta al montar
  useEffect(() => {
    getDepositAccount()
      .then(data => {
        setAccount(data);
        if (data.clabe) {
          // Mostrar la CLABE enmascarada que ya existe
          setHolder(data.holder || '');
        }
      })
      .catch(() => {}); // silencioso si falla
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveDepositAccount(clabe, holder);
      setAccount(result);
      setClabe('');
      showToast(result.message || 'Cuenta guardada', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar la cuenta', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-gray-500" />
        </div>
        <h3 className="font-semibold text-gray-900">Tu cuenta de depósito</h3>
        {account?.status === 'active' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Activa
          </span>
        )}
        {account?.status === 'not_configured' && (
          <span className="ml-auto text-xs text-amber-600 font-medium">Sin configurar</span>
        )}
        {account?.status === 'pending_48h' && (
          <span className="ml-auto text-xs text-blue-600 font-medium">Cambio pendiente (48h)</span>
        )}
      </div>

      {/* CLABE activa actual */}
      {account?.clabe && (
        <div className="mb-4 bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">CLABE activa</p>
            <p className="font-mono font-medium text-gray-800">{account.clabe}</p>
          </div>
          <span className="text-xs text-gray-500">{account.bank}</span>
        </div>
      )}

      {/* Banner cambio pendiente */}
      {account?.status === 'pending_48h' && account.pending && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <p className="font-medium mb-0.5">Cambio en proceso</p>
          <p>Nueva CLABE: <span className="font-mono">{account.pending}</span></p>
          <p className="text-xs mt-1 text-blue-500">
            Se activará el {account.holdsUntil ? new Date(account.holdsUntil).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {account?.clabe ? 'Nueva CLABE' : 'CLABE Interbancaria'}
            </label>
            <input
              type="text" inputMode="numeric" maxLength={18}
              value={clabe}
              onChange={e => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
              placeholder="722... (18 dígitos)"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                clabe.length === 18 ? 'border-emerald-400' : clabe.length > 0 ? 'border-amber-400' : 'border-gray-300'
              }`}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Banco</label>
            <input
              type="text" readOnly
              value={bank || (clabe.length >= 3 ? 'No encontrado' : '')}
              placeholder="Auto-detectado"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del Titular</label>
          <input
            type="text" value={holder}
            onChange={e => setHolder(e.target.value)}
            placeholder="Igual que en tu cuenta de MP"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1.5">Debe coincidir exactamente con el nombre registrado en tu banco.</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 gap-4 flex-wrap">
        {flags.nextDeposit ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
            <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-700">
              <span className="font-semibold">Próximo depósito:</span>{' '}
              {new Date(flags.nextDeposit.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              <span className="font-semibold text-amber-800">{fmtFull(flags.nextDeposit.amount)} {flags.nextDeposit.currency}</span> estimados
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            Depósitos cada martes
          </div>
        )}
        <button
          onClick={handleSave} disabled={!canSave || saving}
          className="flex items-center gap-2 bg-[#0A3D2B] hover:bg-[#0d4f38] disabled:opacity-50 text-white text-sm font-medium py-2.5 px-5 rounded-xl transition-colors flex-shrink-0"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Banknote className="w-4 h-4" /> Guardar cuenta</>}
        </button>
      </div>
    </div>
  );
}

// ── Processor Cards ───────────────────────────────────────────────────────────
type ProcessorDef = {
  key: string; name: string; subtitle: string; description: string;
  avatar: string; avatarBg: string; inputLabel?: string; inputPlaceholder?: string;
};

const PROCESSORS: ProcessorDef[] = [
  { key: 'mercadopago', name: 'Mercado Pago', subtitle: '— tu propia cuenta',
    description: 'El dinero de tus ventas va directo a tu cuenta de Mercado Pago. Retira cuando quieras.',
    avatar: 'MP', avatarBg: 'bg-[#00B1EA]' },
  { key: 'openpay', name: 'OpenPay', subtitle: '',
    description: 'Acepta tarjetas y transferencias SPEI. Depósito semanal a tu CLABE registrada.',
    avatar: 'OP', avatarBg: 'bg-purple-600',
    inputLabel: 'MERCHANT ID DE OPENPAY', inputPlaceholder: 'm...' },
  { key: 'fintoc', name: 'Fintoc', subtitle: '— Pago por transferencia SPEI',
    description: 'Tus compradores pagan directo desde su banco. Sin tarjeta, sin comisión de efectivo.',
    avatar: 'Fi', avatarBg: 'bg-[#0A3D2B]',
    inputLabel: 'API KEY DE FINTOC', inputPlaceholder: 'pk_live_...' },
];

function ProcessorCard({ proc, currentTrustLevel, tenantGateway }: {
  proc: ProcessorDef; currentTrustLevel: number; tenantGateway?: TenantGateway;
}) {
  const [apiKey,  setApiKey]  = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const { showToast } = useToast();

  const isLocked    = currentTrustLevel < 2;
  const isConnected = tenantGateway?.status === 'connected';
  const isError     = tenantGateway?.status === 'error';

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 900)); // TODO: POST /tenant-gateways
      showToast(`${proc.name} conectado`, 'success');
    } catch {
      showToast(`Error al conectar ${proc.name}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border p-5 ${isError ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 ${proc.avatarBg} rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {proc.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{proc.name}</span>
            {proc.subtitle && <span className="text-gray-500 text-sm">{proc.subtitle}</span>}
            {isLocked    && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Requiere verificación</span>}
            {isConnected && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Conectado</span>}
            {isError     && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Error</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{proc.description}</p>
        </div>
      </div>

      {/* Locked */}
      {isLocked && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            Verifica tu identidad para conectar este procesador
          </div>
          <button className="text-sm text-[#0A3D2B] font-medium hover:underline flex items-center gap-1 flex-shrink-0">
            ¿Cómo desbloquear? <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Connected */}
      {isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" /> Credenciales verificadas
          </div>
          <button className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">Desconectar</button>
        </div>
      )}

      {/* API key input */}
      {!isLocked && !isConnected && proc.inputLabel && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{proc.inputLabel}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={proc.inputPlaceholder}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button type="button" onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleSave} disabled={!apiKey.trim() || saving}
              className="flex items-center gap-1.5 bg-[#0A3D2B] hover:bg-[#0d4f38] disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex-shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Verificar y guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trust Level Accordion ─────────────────────────────────────────────────────
const TRUST_LEVELS = [
  {
    level: 1, icon: '🌱', title: 'Nuevo vendedor',
    unlocks: ['Mercado Pago gestionado por Xokly', 'Contra entrega', 'OXXO Pay'],
    reqs: [],
  },
  {
    level: 2, icon: '🌿', title: 'Vendedor activo',
    unlocks: ['OpenPay — tarjetas y SPEI', 'Métodos de transferencia SPEI', 'Acceso a métricas avanzadas'],
    reqs: [
      { label: '10 ventas completadas', progress: 7, required: 10, done: false },
      { label: 'Sin disputas en los últimos 60 días', done: true },
    ],
  },
  {
    level: 3, icon: '🏆', title: 'Vendedor verificado',
    unlocks: ['OpenPay · Fintoc · Export PDF', 'Reportes avanzados', 'Depósito acelerado'],
    reqs: [
      { label: 'Nivel 2 completado', done: false },
      { label: 'Verificación de identidad (INE)', done: false },
    ],
  },
];

function TrustLevelSection({ trustLevel }: { trustLevel: 1 | 2 | 3 }) {
  const [expanded, setExpanded] = useState<number | null>(trustLevel < 3 ? trustLevel + 1 : null);

  return (
    <div>
      <div className="border-l-4 border-purple-500 pl-4 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Tu nivel de confianza</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Entre más vendas con Xokly, más opciones de pago desbloqueas y mejores condiciones obtienes.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Tu nivel de confianza</h3>
              <button className="text-gray-400 hover:text-gray-600"><Info className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Completa los requisitos para acceder a más métodos de pago</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex-shrink-0">
            {TRUST_LEVELS.find(l => l.level === trustLevel)?.icon} Nivel {trustLevel} — {TRUST_LEVELS.find(l => l.level === trustLevel)?.title}
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-6">
          {TRUST_LEVELS.map((lvl, idx) => {
            const done   = trustLevel > lvl.level;
            const active = trustLevel === lvl.level;
            return (
              <React.Fragment key={lvl.level}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-colors ${
                    done   ? 'bg-[#0A3D2B] border-[#0A3D2B] text-white' :
                    active ? 'bg-white border-[#0A3D2B] text-[#0A3D2B]' :
                             'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : lvl.level}
                  </div>
                  <span className={`text-xs text-center leading-tight ${active ? 'text-[#0A3D2B] font-semibold' : 'text-gray-400'}`}>
                    {lvl.title}
                  </span>
                  {active && <span className="text-xs text-[#0A3D2B] font-medium">▲ Estás aquí</span>}
                </div>
                {idx < TRUST_LEVELS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-6 ${trustLevel > lvl.level ? 'bg-[#0A3D2B]' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {TRUST_LEVELS.map(lvl => {
            const isCurrent = lvl.level === trustLevel;
            const isLocked  = lvl.level > trustLevel;
            const isOpen    = expanded === lvl.level || isCurrent;

            return (
              <div key={lvl.level} className={`rounded-xl border transition-colors ${isCurrent ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>
                <button
                  onClick={() => setExpanded(prev => prev === lvl.level ? null : lvl.level)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lvl.icon}</span>
                    <span className={`font-medium text-sm ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                      Nivel {lvl.level} — {lvl.title}
                    </span>
                    {isCurrent && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Estás aquí</span>}
                    {isLocked  && <span className="flex items-center gap-1 text-xs text-gray-500"><Lock className="w-3.5 h-3.5" /> Bloqueado</span>}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {lvl.level === 1 ? (
                      <p className="text-sm text-emerald-700 font-medium">✓ Ya tienes acceso a todos los métodos de este nivel.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lo que desbloqueas</p>
                          <ul className="space-y-1.5">
                            {lvl.unlocks.map(u => (
                              <li key={u} className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="w-1.5 h-1.5 bg-[#0A3D2B] rounded-full flex-shrink-0" />{u}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requisitos</p>
                          <ul className="space-y-2">
                            {lvl.reqs.map(r => (
                              <li key={r.label} className="flex items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  {r.done
                                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    : 'progress' in r
                                      ? <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                      : <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  }
                                  <span className={r.done ? 'line-through text-gray-400' : 'text-gray-700'}>{r.label}</span>
                                </div>
                                {'progress' in r && !r.done && (
                                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                    {r.progress} / {r.required}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {lvl.level === trustLevel + 1 && (
                            <button className="mt-3 flex items-center gap-1 text-sm text-[#0A3D2B] font-medium hover:underline">
                              <TrendingUp className="w-3.5 h-3.5" /> Ver mis ventas →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Configuración ────────────────────────────────────────────────────────
function ConfigTab() {
  const { tenantGateways, loading } = usePayments();
  const flags = usePaymentFlags();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Sección 1: MP Xokly + CLABE */}
      <div className="space-y-3">
        <MPXoklyCard />
        <DepositAccountForm />
      </div>

      {/* Sección 2: Métodos configurados por ti */}
      <div>
        <div className="border-l-4 border-amber-500 pl-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Métodos configurados por ti</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Conecta tus propias cuentas de pago para tener control total. Disponibles según tu nivel de confianza en Xokly.
          </p>
        </div>
        <div className="space-y-3">
          {PROCESSORS.map(proc => (
            <ProcessorCard
              key={proc.key}
              proc={proc}
              currentTrustLevel={flags.trustLevel}
              tenantGateway={tenantGateways.find(g => g.provider === proc.key)}
            />
          ))}
        </div>
      </div>

      {/* Sección 3: Trust Level */}
      {flags.showTrustMeter && <TrustLevelSection trustLevel={flags.trustLevel} />}
    </div>
  );
}

// ── Tab: Métodos de Pago ──────────────────────────────────────────────────────
function MethodsTab() {
  const { tenantGateways } = usePayments();
  const [cod,    setCod]    = useState(true);
  const [fintoc, setFintoc] = useState(false);
  const fintocConnected = tenantGateways.some(g => g.provider === 'fintoc' && g.status === 'connected');

  const mpMethods = [
    { emoji: '💳', name: 'Tarjeta crédito/débito', commission: '3.6% + $3 MXN',    settle: 'Inmediato' },
    { emoji: '🏪', name: 'OXXO Pay',               commission: '3.9% + $10 MXN',   settle: '1-2 días'  },
    { emoji: '🏛️', name: 'Transferencia SPEI',      commission: '$8 MXN por cobro', settle: '1-2 días'  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="border-l-4 border-amber-500 pl-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Tú decides</h2>
          <p className="text-sm text-gray-500 mt-0.5">Activa o desactiva estos métodos según tu operación.</p>
        </div>
        <div className="space-y-3">
          <ToggleRow icon={<Truck className="w-5 h-5 text-gray-600" />} name="Contra entrega"
            desc="El cliente paga al recibir el pedido — sin comisión"
            enabled={cod} onToggle={() => setCod(v => !v)} />
          <ToggleRow icon={<Banknote className="w-5 h-5 text-indigo-500" />} name="SPEI vía Fintoc"
            desc={fintocConnected ? 'Transferencia directa desde el banco del comprador' : 'Configura Fintoc en Configuración primero →'}
            enabled={fintoc && fintocConnected} disabled={!fintocConnected}
            onToggle={() => fintocConnected && setFintoc(v => !v)}
            tag={!fintocConnected ? 'Fintoc no configurado' : undefined} />
        </div>
      </div>

      <div>
        <div className="border-l-4 border-blue-400 pl-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Lo gestiona Mercado Pago</h2>
          <p className="text-sm text-gray-500 mt-0.5">Siempre activos. Xokly los habilita automáticamente.</p>
        </div>
        <div className="space-y-3">
          {mpMethods.map(m => (
            <div key={m.name} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">Comisión: {m.commission} · Acreditación: {m.settle}</p>
                </div>
              </div>
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">Siempre activo</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, name, desc, enabled, onToggle, disabled, tag }: {
  icon: React.ReactNode; name: string; desc: string; enabled: boolean;
  onToggle: () => void; disabled?: boolean; tag?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 text-sm">{name}</p>
          {tag && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{tag}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={onToggle} disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

// ── Tab: Historial y Reportes ─────────────────────────────────────────────────
function HistoryTab() {
  const {
    intents, pagination, stats, intentsMeta,
    loadingIntents, loadingStats, statsError,
    activeFilters, setActiveFilters,
    statsPeriod, setStatsPeriod,
    refreshIntents, refreshStats,
  } = usePayments();
  const { showToast } = useToast();
  const flags = usePaymentFlags();

  useEffect(() => {
    refreshIntents();
    if (flags.showStats) refreshStats({ period: statsPeriod });
  }, []);

  const handlePeriod = async (p: 'week' | 'month' | 'year') => {
    setStatsPeriod(p);
    await refreshStats({ period: p });
  };

  const handleFilter = async (key: string, val: string) => {
    const next = { ...activeFilters, [key]: val, page: 1 };
    setActiveFilters(next);
    await refreshIntents(next);
  };

  const handlePage = async (page: number) => {
    const next = { ...activeFilters, page };
    setActiveFilters(next);
    await refreshIntents(next);
  };

  const PERIOD_LABELS = { week: 'Esta semana', month: 'Este mes', year: 'Este año' };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['week', 'month', 'year'] as const).map(p => (
          <button key={p} onClick={() => handlePeriod(p)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              statsPeriod === p ? 'bg-[#0A3D2B] text-white border-[#0A3D2B]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
        {flags.canExportCsv && (
          <button
            onClick={() => { exportIntentsCSV(intents); showToast('CSV descargado', 'success'); }}
            className="ml-auto flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-full bg-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Métricas */}
      {!flags.showStats ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-3 text-sm text-amber-700">
          <Info className="w-5 h-5 flex-shrink-0" />
          Actualiza a plan Básico o superior para ver estadísticas de comisiones y ganancia real.
        </div>
      ) : statsError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {statsError}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ventas brutas',   value: stats ? fmt(stats.gmv) : '$0',                   sub: `${stats?.totalOrders ?? 0} pedidos`, color: '' },
            { label: 'Comisiones',      value: stats ? fmt(stats.commissions.total) : '$0',      sub: 'MP + Xokly',                         color: 'text-red-600' },
            { label: 'Costos',          value: stats ? fmt(stats.costs.products + stats.costs.shipping) : '$0', sub: 'Producto + envío',   color: '' },
            { label: 'Ganancia real',   value: stats ? fmt(stats.realProfit) : '$0',             sub: 'Ventas − costos − comisiones',
              color: (stats?.realProfit ?? 0) > 0 ? 'text-emerald-600' : '' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1 font-medium">{m.label}</p>
              {loadingStats
                ? <div className="h-8 w-20 bg-gray-100 rounded animate-pulse mt-1" />
                : <p className={`text-2xl font-bold ${m.color || 'text-gray-900'}`}>{m.value}</p>}
              <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla intents */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Historial de pagos</h3>
          <div className="flex items-center gap-3">
            {intentsMeta && intentsMeta.historyDays !== -1 && (
              <span className="text-xs text-gray-400">Historial: {intentsMeta.historyDays} días</span>
            )}
            <button onClick={() => refreshIntents(activeFilters)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loadingIntents ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
          <select value={String(activeFilters.status ?? '')} onChange={e => handleFilter('status', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
            <option value="">Todos los estados</option>
            {(Object.keys(INTENT_STATUS_LABEL) as IntentStatus[]).map(s => (
              <option key={s} value={s}>{INTENT_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select value={String(activeFilters.limit ?? 20)} onChange={e => handleFilter('limit', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
            {[10, 20, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>

        {loadingIntents ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
        ) : intents.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <CreditCard className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">Sin pagos en este período</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {['Intent ID', 'Artículos', 'Total', 'Estado', 'Fecha', 'Orden'].map(h => (
                      <th key={h} className={`px-5 py-3 font-medium text-left ${h === 'Total' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {intents.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{i.intentId.slice(-14)}</td>
                      <td className="px-5 py-3.5 text-gray-700 max-w-[180px] truncate">{i.items.map(x => x.name).join(', ') || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{i.total != null ? fmtFull(i.total) : '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INTENT_STATUS_COLOR[i.status]}`}>
                          {INTENT_STATUS_LABEL[i.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmtShort(i.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        {i.orderNumber
                          ? <span className="font-mono text-xs text-emerald-600">{i.orderNumber}</span>
                          : <span className="text-xs text-gray-400">Sin orden</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {intents.map(i => (
                <div key={i.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {i.items.map(x => x.name).join(', ') || i.intentId.slice(-12)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTENT_STATUS_COLOR[i.status]}`}>
                      {INTENT_STATUS_LABEL[i.status]}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{fmtShort(i.createdAt)}</span>
                    <span className="font-semibold text-gray-900">{i.total != null ? fmtFull(i.total) : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                <span>{pagination.total} resultados · pág {pagination.page}/{pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={pagination.page <= 1} onClick={() => handlePage(pagination.page - 1)}
                    className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-40 transition-colors">← Ant</button>
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => handlePage(pagination.page + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-40 transition-colors">Sig →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── ChevronRight inline (no existe en lucide-react con este nombre) ───────────
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
type Tab = 'config' | 'methods' | 'history';

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'config',  label: 'Configuración',       Icon: Settings2  },
  { key: 'methods', label: 'Métodos de Pago',      Icon: CreditCard },
  { key: 'history', label: 'Historial y Reportes', Icon: Clock      },
];

export function Payments() {
  const { hasPermission } = useAuth();
  const { paymentConfig, loading, patchConfig } = usePayments();
  const flags = usePaymentFlags();

  const [activeTab,      setActiveTab]      = useState<Tab>('config');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [alerts,         setAlerts]         = useState<{ id: string; provider: string; message: string }[]>([]);

  // Sincronizar showOnboarding desde DB cuando cargue
  useEffect(() => {
    if (!loading && paymentConfig !== null) {
      // Si el flag de DB dice true, y no hay fallback local, mostrar onboarding
      const fallback = localStorage.getItem(OB_FALLBACK_KEY);
      setShowOnboarding(paymentConfig.flags.showOnboarding && !fallback);
    }
  }, [loading, paymentConfig]);

  // Sincronizar alerts desde flags
  useEffect(() => {
    setAlerts(flags.alerts);
  }, [JSON.stringify(flags.alerts)]);

  if (!hasPermission('payments:read')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <Lock className="w-10 h-10 text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">Sin acceso</h2>
        <p className="text-sm text-gray-500 mt-1">No tienes permiso para ver el módulo de Pagos.</p>
      </div>
    );
  }

  return (
    <>
      {/* Onboarding wizard */}
      {showOnboarding && !loading && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onComplete={() => patchConfig({ showOnboarding: false })}
        />
      )}

      {/* Alert banners */}
      <AlertBanner
        alerts={alerts}
        onDismiss={id => setAlerts(prev => prev.filter(a => a.id !== id))}
      />

      <div className="min-h-screen bg-[#F5F3EF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
            <Link to="/dashboard" className="hover:text-gray-700 flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Pagos</span>
          </div>

          {/* Page Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#0A3D2B] rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pagos</h1>
              <p className="text-sm text-gray-500">Configura cómo quieres recibir el dinero de tus ventas</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-1 mb-0">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === key
                    ? 'border-[#0A3D2B] text-[#0A3D2B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-[#F5F3EF] pt-6">
            {activeTab === 'config'  && <ConfigTab />}
            {activeTab === 'methods' && <MethodsTab />}
            {activeTab === 'history' && <HistoryTab />}
          </div>
        </div>
      </div>
    </>
  );
}
