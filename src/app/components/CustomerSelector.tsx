import { useState, useMemo } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import { useCustomers } from '../store/CustomersContext';
import { type Customer } from '../types/customer';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CUSTOMER_TAG_LABELS, CUSTOMER_TAG_COLORS } from '../types/customer';

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  onCreateNew: () => void;
  selectedCustomerId?: string;
}

export function CustomerSelector({ onSelect, onCreateNew, selectedCustomerId }: CustomerSelectorProps) {
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) {
      return customers.slice(0, 10); // Show first 10 if no search
    }

    const term = searchTerm.toLowerCase();
    return customers
      .filter(
        c =>
          c.name.toLowerCase().includes(term) ||
          c.phone?.includes(term) ||
          c.email?.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limit to 10 results
  }, [customers, searchTerm]);

  const selectedCustomer = selectedCustomerId
    ? customers.find(c => c.id === selectedCustomerId)
    : undefined;

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar cliente por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" onClick={onCreateNew} size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Crear Cliente
        </Button>
      </div>

      {/* Selected customer display */}
      {selectedCustomer && !isOpen && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {formatPhone(selectedCustomer.phone)}
                {selectedCustomer.email && (
                  <span className="ml-2">• {selectedCustomer.email}</span>
                )}
              </div>
              {selectedCustomer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCustomer.tags.map(tag => (
                    <Badge key={tag} variant={CUSTOMER_TAG_COLORS[tag]} className="text-xs">
                      {CUSTOMER_TAG_LABELS[tag]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(true);
                setSearchTerm('');
              }}
            >
              Cambiar
            </Button>
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && (searchTerm || !selectedCustomerId) && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-80 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No se encontraron clientes
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelect(customer);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    customer.id === selectedCustomerId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatPhone(customer.phone)}
                        {customer.email && (
                          <span className="ml-2">• {customer.email}</span>
                        )}
                      </div>
                      {customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customer.tags.map(tag => (
                            <Badge key={tag} variant={CUSTOMER_TAG_COLORS[tag]} className="text-xs">
                              {CUSTOMER_TAG_LABELS[tag]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {customer.id === selectedCustomerId && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
