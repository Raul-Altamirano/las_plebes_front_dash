// src/app/pages/OrderNew.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Search, X, ShoppingBag } from "lucide-react";
import { useOrders } from "../store/OrdersContext";
import { useProducts } from "../store/ProductsContext";
import { useCustomers } from "../store/CustomersContext";
import {
  CreateOrderBody,
  OrderItemDTO,
  OrderCustomer,
  OrderShippingAddress,
  PaymentMethod,
  OrderChannel,
  OrderStatus,
} from "../services/ordersApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );

function computeTotals(
  items: OrderItemDTO[],
  shipping: number,
  discount: number,
) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, total };
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface DraftItem extends OrderItemDTO {
  _key: string;
  stock: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OrderNew() {
  const navigate = useNavigate();
  const { createOrder } = useOrders();
  const { products } = useProducts();
  const { customers } = useCustomers();

  // ── Estado del formulario ─────────────────────────────────────────────────

  const [customer, setCustomer] = useState<OrderCustomer>({
    name: "",
    phone: "",
    email: "",
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [paymentMethod, setPm] = useState<PaymentMethod>("CASH");
  const [channel, setChannel] = useState<OrderChannel>("MANUAL");
  const [status, setStatus] = useState<OrderStatus>("PLACED");
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [shippingAddr, setAddr] = useState<OrderShippingAddress>({ cp: "" });

  // Búsqueda de cliente existente
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  // Búsqueda de productos
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Totales reactivos ─────────────────────────────────────────────────────

  const { subtotal, total } = computeTotals(items, shipping, discount);

  // ── Cliente ───────────────────────────────────────────────────────────────

  const filteredCustomers =
    customerSearch.length >= 2
      ? customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
              c.phone?.includes(customerSearch) ||
              c.email?.toLowerCase().includes(customerSearch.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  const selectCustomer = (c: (typeof customers)[0]) => {
    setCustomer({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
    });
    setCustomerSearch(c.name);
    setShowCustomerList(false);
  };

  // ── Productos ─────────────────────────────────────────────────────────────

  // Aplanar productos con variantes para el buscador
  const flatProducts = products.flatMap((p) =>
    p.variants && p.variants.length > 0
      ? p.variants.map((v) => ({
          productId: p.id,
          variantId: v.id,
          nameSnapshot:
            p.variants!.length > 1
              ? `${p.name}${v.size ? ` — T.${v.size}` : ""}${v.color ? ` ${v.color}` : ""}`
              : p.name,
          skuSnapshot: v.sku,
          size: v.size,
          color: v.color,
          unitPrice: v.price ?? p.price ?? 0,
          unitCost: v.cost ?? p.cost,
          stock: v.stock ?? 0,
          _key: v.id,
        }))
      : [
          {
            productId: p.id,
            variantId: undefined,
            nameSnapshot: p.name,
            skuSnapshot: p.sku,
            size: undefined,
            color: undefined,
            unitPrice: p.price ?? 0,
            unitCost: p.cost,
            stock: p.stock ?? 0,
            _key: p.id,
          },
        ],
  );

  const filteredProducts =
    productSearch.length >= 1
      ? flatProducts
          .filter(
            (p) =>
              p.nameSnapshot
                .toLowerCase()
                .includes(productSearch.toLowerCase()) ||
              p.skuSnapshot
                ?.toLowerCase()
                .includes(productSearch.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  const addProduct = (p: (typeof flatProducts)[0]) => {
    if (p.stock === 0) return; // sin stock — no agregar
    setItems((prev) => {
      const existing = prev.find((i) => i._key === p._key);
      if (existing && existing.qty >= p.stock) return prev; // ya al tope
      if (existing) {
        return prev.map((i) =>
          i._key === p._key ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          stock: p.stock, // ← agregar este campo
          _key: p._key,
          productId: p.productId,
          variantId: p.variantId,
          nameSnapshot: p.nameSnapshot,
          skuSnapshot: p.skuSnapshot,
          size: p.size,
          color: p.color,
          unitPrice: p.unitPrice,
          unitCost: p.unitCost,
          qty: 1,
          optionsSnapshot:
            p.size || p.color
              ? {
                  ...(p.size ? { size: p.size } : {}),
                  ...(p.color ? { color: p.color } : {}),
                }
              : undefined,
        },
      ];
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((i) =>
        i._key !== key ? i : { ...i, qty: Math.min(qty, i.stock) },
      ),
    );
  };

  const updatePrice = (key: string, price: number) => {
    setItems((prev) =>
      prev.map((i) => (i._key === key ? { ...i, unitPrice: price } : i)),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i._key !== key));
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!customer.name.trim())
      return setError("El nombre del cliente es requerido.");
    if (items.length === 0) return setError("Agrega al menos un producto.");
    if (shipping === undefined || isNaN(shipping)) return setError('Ingresa el costo de envío (0 si es gratis).');

    setError(null);
    setSaving(true);

    const body: CreateOrderBody = {
      customer: {
        id: customer.id,
        name: customer.name.trim(),
        phone: customer.phone?.trim() || undefined,
        email: customer.email?.trim() || undefined,
      },
      items: items.map(({ _key, ...rest }) => rest),
      status,
      paymentMethod,
      channel,
      shipping,
      discountTotal: discount || undefined,
      notes: notes.trim() || undefined,
      shippingAddress: shippingAddr.cp ? shippingAddr : undefined,
    };

    try {
      const order = await createOrder(body);
      // reset form
      setCustomer({ name: "", phone: "", email: "" });
      setItems([]);
      setShipping(0);
      setDiscount(0);
      setNotes("");
      setAddr({ cp: "" });
      setCustomerSearch("");
      navigate(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Error al crear el pedido");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/orders")}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nuevo pedido</h1>
          <p className="text-xs text-gray-500">
            Creación manual desde el dashboard
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Columna izquierda: cliente + dirección + config ── */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cliente
            </h2>

            {/* Buscar cliente existente */}
            <div className="relative">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Buscar cliente existente…"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerList(true);
                  }}
                  onFocus={() => setShowCustomerList(true)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {showCustomerList && filteredCustomers.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-200
                                rounded-lg shadow-lg overflow-hidden"
                >
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.phone ?? c.email}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-gray-400 text-center">
              — o ingresa manualmente —
            </div>

            {/* Campos manuales */}
            <input
              type="text"
              placeholder="Nombre completo *"
              value={customer.name}
              onChange={(e) =>
                setCustomer((p) => ({ ...p, name: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={customer.phone ?? ""}
              onChange={(e) =>
                setCustomer((p) => ({ ...p, phone: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={customer.email ?? ""}
              onChange={(e) =>
                setCustomer((p) => ({ ...p, email: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Configuración del pedido */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Configuración
            </h2>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Estado inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PLACED">Confirmado</option>
                <option value="PAID">Pagado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Método de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPm(e.target.value as PaymentMethod)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD_LINK">Link tarjeta</option>
                <option value="CARD_TERMINAL">Terminal</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Canal</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as OrderChannel)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="MANUAL">Manual (Dash)</option>
                <option value="ONLINE">Online (SF)</option>
              </select>
            </div>
          </div>

          {/* Dirección de envío (opcional) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Envío{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </h2>
            <input
              type="text"
              placeholder="Código postal"
              value={shippingAddr.cp}
              onChange={(e) => setAddr((p) => ({ ...p, cp: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Calle y número"
              value={shippingAddr.line1 ?? ""}
              onChange={(e) =>
                setAddr((p) => ({ ...p, line1: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Ciudad"
                value={shippingAddr.city ?? ""}
                onChange={(e) =>
                  setAddr((p) => ({ ...p, city: e.target.value }))
                }
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Estado"
                value={shippingAddr.state ?? ""}
                onChange={(e) =>
                  setAddr((p) => ({ ...p, state: e.target.value }))
                }
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Referencias"
              value={shippingAddr.reference ?? ""}
              onChange={(e) =>
                setAddr((p) => ({ ...p, reference: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Notas
            </h2>
            <textarea
              rows={3}
              placeholder="Instrucciones especiales, notas internas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ── Columna derecha: productos + totales ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buscador de productos */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Productos
              </h2>
              <button
                onClick={() => setShowProductSearch((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
              >
                <Plus size={14} />
                Agregar producto
              </button>
            </div>

            {showProductSearch && (
              <div className="mb-3 relative">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por nombre o SKU…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-sm border border-blue-400 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      setProductSearch("");
                      setShowProductSearch(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>

                {filteredProducts.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200
                                  rounded-lg shadow-lg overflow-hidden"
                  >
                    {filteredProducts.map((p) => (
                      <button
                        key={p._key}
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition
                                   flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.nameSnapshot}
                          </p>
                          {p.skuSnapshot && (
                            <p className="text-xs text-gray-400 font-mono">
                              {p.skuSnapshot}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-semibold text-gray-800">
                            {fmt(p.unitPrice)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Stock: {p.stock}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {productSearch.length >= 1 && filteredProducts.length === 0 && (
                  <p className="mt-2 text-xs text-gray-400 text-center py-2">
                    Sin resultados para "{productSearch}"
                  </p>
                )}
              </div>
            )}

            {/* Lista de items */}
            {items.length === 0 ? (
              <div className="py-10 text-center text-gray-300">
                <ShoppingBag size={32} className="mx-auto mb-2" />
                <p className="text-sm">Sin productos agregados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item._key}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.nameSnapshot}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.skuSnapshot && (
                          <span className="text-xs text-gray-400 font-mono">
                            {item.skuSnapshot}
                          </span>
                        )}
                        {item.size && (
                          <span
                            className="text-xs bg-white border border-gray-200 text-gray-600
                                          px-1.5 py-0.5 rounded"
                          >
                            T.{item.size}
                          </span>
                        )}
                        {item.color && (
                          <span
                            className="text-xs bg-white border border-gray-200 text-gray-600
                   px-1.5 py-0.5 rounded"
                          >
                            {item.color}
                          </span>
                        )}
                        {item.qty >= item.stock && (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Máx. disponible ({item.stock})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precio editable */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">$</span>
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updatePrice(item._key, Number(e.target.value))
                        }
                        className="w-20 text-sm text-right border border-gray-200 rounded px-1.5 py-0.5
                                   focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      />
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQty(item._key, item.qty - 1)}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500
                                   hover:bg-gray-200 transition text-sm leading-none flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item._key, item.qty + 1)}
                        disabled={item.qty >= item.stock}
                        className="w-6 h-6 rounded border border-gray-200 text-gray-500
             hover:bg-gray-200 transition text-sm leading-none
             flex items-center justify-center disabled:opacity-30
             disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-sm font-semibold text-gray-800 w-20 text-right flex-shrink-0">
                      {fmt(item.unitPrice * item.qty)}
                    </div>

                    <button
                      onClick={() => removeItem(item._key)}
                      className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Resumen
            </h2>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{fmt(subtotal)}</span>
            </div>

            {/* Envío editable */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Costo de envío</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={shipping === 0 ? '' : shipping}
                  onChange={e => setShipping(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-24 text-sm text-right border border-gray-200 rounded px-2 py-0.5
                             focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Descuento editable */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Descuento</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">−$</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 text-sm text-right border border-gray-200 rounded px-2 py-0.5
                             focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-gray-900">{fmt(total)}</span>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || items.length === 0 || !customer.name.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm
                         hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creando pedido…
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Crear pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
