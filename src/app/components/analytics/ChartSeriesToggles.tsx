import { MousePointer, Search, Heart, Activity, Settings2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from '../ui/drawer';
import { useState } from 'react';

export type SeriesKey = 'clicks' | 'searches' | 'favAdds' | 'favRemoves' | 'variantSelects';
export type ChartSeriesEnabled = Record<SeriesKey, boolean>;

interface ChartSeriesTogglesProps {
  enabled: ChartSeriesEnabled;
  onChange: (enabled: ChartSeriesEnabled) => void;
}

const SERIES_CONFIG = {
  clicks: {
    label: 'Clicks',
    icon: MousePointer,
    color: 'text-blue-600',
  },
  searches: {
    label: 'Búsquedas',
    icon: Search,
    color: 'text-purple-600',
  },
  favAdds: {
    label: 'Fav +',
    icon: Heart,
    color: 'text-red-600',
  },
  favRemoves: {
    label: 'Fav -',
    icon: Heart,
    color: 'text-gray-600',
  },
  variantSelects: {
    label: 'Variantes',
    icon: Activity,
    color: 'text-green-600',
  },
} as const;

type PresetKey = 'simple' | 'complete' | 'favorites';

const PRESETS: Record<PresetKey, ChartSeriesEnabled> = {
  simple: {
    clicks: true,
    searches: true,
    favAdds: false,
    favRemoves: false,
    variantSelects: false,
  },
  complete: {
    clicks: true,
    searches: true,
    favAdds: true,
    favRemoves: true,
    variantSelects: true,
  },
  favorites: {
    clicks: true,
    searches: true,
    favAdds: true,
    favRemoves: true,
    variantSelects: false,
  },
};

export function ChartSeriesToggles({ enabled, onChange }: ChartSeriesTogglesProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = Object.values(enabled).filter(Boolean).length;

  const handlePreset = (preset: PresetKey) => {
    onChange(PRESETS[preset]);
  };

  const handleToggle = (key: SeriesKey) => {
    const newEnabled = { ...enabled, [key]: !enabled[key] };
    
    // Ensure at least one series is enabled
    const hasAnyEnabled = Object.values(newEnabled).some(Boolean);
    if (!hasAnyEnabled) {
      newEnabled.clicks = true; // Force clicks on as default
    }
    
    onChange(newEnabled);
  };

  const getCurrentPreset = (): PresetKey | null => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (JSON.stringify(preset) === JSON.stringify(enabled)) {
        return key as PresetKey;
      }
    }
    return null;
  };

  const currentPreset = getCurrentPreset();

  // Desktop Controls
  const DesktopControls = () => (
    <div className="hidden lg:flex items-center gap-4 flex-wrap">
      {/* Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Vista:</span>
        <div className="flex gap-1">
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentPreset === 'simple'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePreset('simple')}
          >
            Simple
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentPreset === 'complete'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePreset('complete')}
          >
            Completo
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentPreset === 'favorites'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePreset('favorites')}
          >
            Favoritos
          </button>
        </div>
      </div>

      {/* Individual Toggles */}
      <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
        <span className="text-xs font-medium text-gray-500">
          {activeCount} de 5
        </span>
        {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => {
          const config = SERIES_CONFIG[key];
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                enabled[key]
                  ? 'bg-white border-2 border-gray-300 shadow-sm'
                  : 'bg-gray-50 border border-gray-200 opacity-50'
              }`}
              title={enabled[key] ? `Ocultar ${config.label}` : `Mostrar ${config.label}`}
            >
              <Icon className={`w-3.5 h-3.5 ${enabled[key] ? config.color : 'text-gray-400'}`} />
              <span className={enabled[key] ? 'text-gray-900' : 'text-gray-500'}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Mobile Controls
  const MobileControls = () => (
    <div className="lg:hidden">
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} direction="bottom">
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Filtrar gráfica ({activeCount})
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="px-6">
            <DrawerTitle>Filtrar series de la gráfica</DrawerTitle>
            <DrawerDescription>
              Selecciona qué métricas quieres visualizar
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-auto">
            {/* Presets */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Vistas rápidas</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    currentPreset === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => handlePreset('simple')}
                >
                  Simple
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    currentPreset === 'complete'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => handlePreset('complete')}
                >
                  Completo
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    currentPreset === 'favorites'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => handlePreset('favorites')}
                >
                  Favoritos
                </button>
              </div>
            </div>

            {/* Individual Toggles */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Series individuales ({activeCount} de 5)
              </p>
              <div className="space-y-3">
                {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => {
                  const config = SERIES_CONFIG[key];
                  const Icon = config.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {config.label === 'Fav +' ? 'Favoritos agregados' : 
                           config.label === 'Fav -' ? 'Favoritos removidos' :
                           config.label}
                        </span>
                      </div>
                      <Switch
                        checked={enabled[key]}
                        onCheckedChange={() => handleToggle(key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DrawerFooter className="px-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handlePreset('simple')}
              >
                Restaurar Simple
              </Button>
              <Button
                className="flex-1"
                onClick={() => setMobileOpen(false)}
              >
                Aplicar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );

  return (
    <>
      <DesktopControls />
      <MobileControls />
    </>
  );
}