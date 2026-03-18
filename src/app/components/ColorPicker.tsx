import { useState } from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

// Paleta de colores predefinidos para selección rápida
const PRESET_COLORS = [
  '#000000', // Negro
  '#FFFFFF', // Blanco
  '#EF4444', // Rojo
  '#F97316', // Naranja
  '#F59E0B', // Ámbar
  '#EAB308', // Amarillo
  '#84CC16', // Lima
  '#22C55E', // Verde
  '#10B981', // Esmeralda
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Azul cielo
  '#3B82F6', // Azul
  '#6366F1', // Índigo
  '#8B5CF6', // Violeta
  '#A855F7', // Púrpura
  '#D946EF', // Fucsia
  '#EC4899', // Rosa
  '#F43F5E', // Rosado
  '#78716C', // Gris
];

export function ColorPicker({ value = '#000000', onChange, label = 'Color', disabled = false }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handlePresetClick = (color: string) => {
    onChange(color);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-3">
        {/* Vista previa del color actual */}
        <div 
          className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: value }}
          onClick={() => !disabled && setShowPicker(!showPicker)}
          title={value}
        >
          {/* Patrón de tablero de ajedrez para colores transparentes */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
          />
        </div>

        {/* Input de color nativo */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-12 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Pipette className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Input de texto para hex */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const hex = e.target.value;
            // Validar que sea un hex válido
            if (/^#[0-9A-F]{6}$/i.test(hex) || hex === '') {
              onChange(hex || '#000000');
            }
          }}
          placeholder="#000000"
          disabled={disabled}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          maxLength={7}
        />

        {/* Botón para mostrar/ocultar paleta */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={disabled}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showPicker ? 'Ocultar paleta' : 'Paleta'}
        </button>
      </div>

      {/* Paleta de colores predefinidos */}
      {showPicker && !disabled && (
        <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-2">Selección rápida</p>
          <div className="grid grid-cols-10 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                  value === color ? 'border-blue-500 shadow-md' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
