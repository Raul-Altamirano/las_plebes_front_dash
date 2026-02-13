import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useOrders, computeOrderTotals } from '../store/OrdersContext';
import { useCustomers } from '../store/CustomersContext';
import { useAuth } from '../store/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { ProductSearchModal } from '../components/ProductSearchModal';
import { CustomerSelector } from '../components/CustomerSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { OrderItem, SalesChannel, PaymentMethod } from '../types/order';
import { Product, ProductVariant } from '../types/product';
import { Customer } from '../types/customer';
import { toast } from 'sonner';
import { getEffectiveCost, calculateLineCostData } from '../utils/costHelpers';

export function OrderNew() {
  const navigate = useNavigate();
  const { createOrder } = useOrders();
  const { createCustomer } = useCustomers();
  const { user, hasPermission } = useAuth();

  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [saveNewCustomer, setSaveNewCustomer] = useState(true);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [channel, setChannel] = useState<SalesChannel>('OFFLINE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const canUpdate = hasPermission('order:update');

  const handleAddProduct = (product: Product, variant?: ProductVariant) => {
    const unitPrice = variant?.price || product.price;
    const unitCost = getEffectiveCost(product, variant);
    const costData = calculateLineCostData(unitPrice, 1, unitCost);

    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      variantId: variant?.id,
      nameSnapshot: product.name,
      skuSnapshot: variant?.sku || product.sku,
      optionsSnapshot: variant?.options,
      unitPrice,
      qty: 1,
      lineTotal: unitPrice,
      // Cost snapshots
      unitCost: unitCost !== null ? unitCost : undefined,
      lineCostTotal: costData.lineCostTotal !== null ? costData.lineCostTotal : undefined,
      lineProfit: costData.lineProfit !== null ? costData.lineProfit : undefined,
      lineMarginPct: costData.lineMarginPct !== null ? costData.lineMarginPct : undefined,
    };

    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateQty = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const newLineTotal = item.unitPrice * qty;
          const costData = calculateLineCostData(item.unitPrice, qty, item.unitCost || null);
          
          return {
            ...item,
            qty,
            lineTotal: newLineTotal,
            lineCostTotal: costData.lineCostTotal !== null ? costData.lineCostTotal : undefined,
            lineProfit: costData.lineProfit !== null ? costData.lineProfit : undefined,
            lineMarginPct: costData.lineMarginPct !== null ? costData.lineMarginPct : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const newLineTotal = price * item.qty;
          const costData = calculateLineCostData(price, item.qty, item.unitCost || null);
          
          return {
            ...item,
            unitPrice: price,
            lineTotal: newLineTotal,
            lineCostTotal: costData.lineCostTotal !== null ? costData.lineCostTotal : undefined,
            lineProfit: costData.lineProfit !== null ? costData.lineProfit : undefined,
            lineMarginPct: costData.lineMarginPct !== null ? costData.lineMarginPct : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
  };

  const handleCreateNewMode = () => {
    setCustomerMode('new');
    setSelectedCustomerId(undefined);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
  };

  const handleSubmit = (status: 'DRAFT' | 'PLACED' | 'PAID') => {
    // Validations
    if (!customerName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    if (items.length === 0) {
      toast.error('Agrega al menos un producto al pedido');
      return;
    }

    if (status === 'PAID' && !canUpdate) {
      toast.error('No tienes permiso para marcar pedidos como pagados');
      return;
    }

    // Create customer if needed
    let customerId = selectedCustomerId;
    if (customerMode === 'new' && saveNewCustomer) {
      const newCustomer = createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        email: customerEmail.trim() || undefined,
        tags: [],
        notes: undefined,
      });
      
      if (newCustomer) {
        customerId = newCustomer.id;
        toast.success(`Cliente ${newCustomer.name} creado y vinculado al pedido`);
      }
    }

    const totals = computeOrderTotals(items);

    const order = createOrder({
      status,
      channel,
      paymentMethod,
      paymentRef: paymentRef.trim() || undefined,
      customerId,
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        email: customerEmail.trim() || undefined,
      },
      items,
      subtotal: totals.subtotal,
      discountTotal: 0,
      total: totals.total,
      notes: notes.trim() || undefined,
    });

    if (!order) {
      toast.error('Error al crear el pedido');
      return;
    }

    toast.success(`Pedido ${order.orderNumber} creado exitosamente`);
    navigate(`/orders/${order.id}`);
  };

  const totals = computeOrderTotals(items);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nuevo Pedido</h1>
          <p className="text-sm text-gray-500 mt-1">Crea un pedido manual offline o en persona</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cliente</h3>
            <Tabs value={customerMode} onValueChange={(v) => setCustomerMode(v as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="existing">Cliente Existente</TabsTrigger>
                <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-4">
                <CustomerSelector
                  onSelect={handleSelectCustomer}
                  onCreateNew={handleCreateNewMode}
                  selectedCustomerId={selectedCustomerId}
                />
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4">
                <div>
                  <Label htmlFor="customerName">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerPhone">Teléfono</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="55-1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saveNewCustomer"
                    checked={saveNewCustomer}
                    onCheckedChange={(checked) => setSaveNewCustomer(checked as boolean)}
                  />
                  <Label htmlFor="saveNewCustomer" className="cursor-pointer">
                    Guardar en directorio de clientes
                  </Label>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Sale info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Venta</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="channel">Canal de Venta</Label>
                  <Select value={channel} onValueChange={v => setChannel(v as SalesChannel)}>
                    <SelectTrigger id="channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFFLINE">Tienda física</SelectItem>
                      <SelectItem value="ONLINE">Tienda online</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="CARD_LINK">Link de Pago</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="paymentRef">Referencia de Pago (opcional)</Label>
                <Input
                  id="paymentRef"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="Ej: BBVA-20250205-ABC123"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas Internas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el pedido..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Items del Pedido</h3>
              <Button onClick={() => setIsProductModalOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay productos agregados.</p>
                <p className="text-sm mt-1">Haz clic en "Agregar Producto" para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.nameSnapshot}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {item.skuSnapshot}
                        {item.optionsSnapshot && (
                          <span className="ml-2">
                            {item.optionsSnapshot.size && `Talla: ${item.optionsSnapshot.size}`}
                            {item.optionsSnapshot.size && item.optionsSnapshot.color && ' • '}
                            {item.optionsSnapshot.color && `Color: ${item.optionsSnapshot.color}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">×</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                      <span className="text-sm text-gray-500">=</span>
                      <div className="w-28 text-right font-medium text-gray-900">
                        ${item.lineTotal.toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Descuento:</span>
                <span className="font-medium text-gray-900">$0.00</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-semibold text-gray-900">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <div className="space-y-3">
              <Button onClick={() => handleSubmit('DRAFT')} variant="outline" className="w-full">
                Guardar como Borrador
              </Button>
              <Button onClick={() => handleSubmit('PLACED')} className="w-full">
                Crear Pedido (Confirmado)
              </Button>
              {canUpdate && (
                <Button onClick={() => handleSubmit('PAID')} className="w-full bg-green-600 hover:bg-green-700">
                  Crear y Marcar Pagado
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/orders')} className="w-full">
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Product search modal */}
      <ProductSearchModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelectProduct={handleAddProduct}
      />
    </div>
  );
}