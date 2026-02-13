import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useCustomers } from '../store/CustomersContext';
import { useToast } from '../store/ToastContext';
import { CustomerTag, CUSTOMER_TAG_LABELS, isValidEmail } from '../types/customer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';

export function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, createCustomer, updateCustomer } = useCustomers();
  const { showToast } = useToast();

  const isEditMode = !!id;
  const existingCustomer = isEditMode ? getById(id) : undefined;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as CustomerTag[],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingCustomer) {
      setFormData({
        name: existingCustomer.name,
        phone: existingCustomer.phone || '',
        email: existingCustomer.email || '',
        tags: existingCustomer.tags,
        notes: existingCustomer.notes || '',
      });
    }
  }, [existingCustomer]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (formData.email && formData.email.trim() && !isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('error', 'Por favor corrige los errores del formulario');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode && id) {
        const success = updateCustomer(id, formData);
        
        if (success) {
          showToast('success', 'Cliente actualizado correctamente');
          navigate('/customers');
        } else {
          showToast('error', 'Error al actualizar el cliente');
        }
      } else {
        const newCustomer = createCustomer(formData);
        
        if (newCustomer) {
          showToast('success', 'Cliente creado correctamente');
          navigate('/customers');
        } else {
          showToast('error', 'Error al crear el cliente');
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      showToast('error', 'Error al guardar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagToggle = (tag: CustomerTag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const allTags: CustomerTag[] = ['VIP', 'MAYOREO', 'FRECUENTE', 'RIESGO', 'NUEVO'];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Actualiza la información del cliente' : 'Registra un nuevo cliente en el directorio'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: María Rodríguez"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 5551234567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se normalizará automáticamente (solo dígitos)
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej: cliente@email.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Etiquetas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={formData.tags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="cursor-pointer"
                  >
                    {CUSTOMER_TAG_LABELS[tag]}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas sobre el cliente (no visibles para el cliente)"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : isEditMode ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}