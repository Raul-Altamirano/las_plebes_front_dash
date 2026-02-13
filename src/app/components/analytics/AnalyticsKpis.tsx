import { Activity, Heart, Search, MousePointer, Users } from 'lucide-react';
import { Card } from '../ui/card';

interface KPI {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

interface AnalyticsKpisProps {
  productClicks: number;
  favoritesAdded: number;
  favoritesRemoved: number;
  searches: number;
  variantSelections: number;
  uniqueSessions: number;
  rangeLabel: string;
}

export function AnalyticsKpis({
  productClicks,
  favoritesAdded,
  favoritesRemoved,
  searches,
  variantSelections,
  uniqueSessions,
  rangeLabel,
}: AnalyticsKpisProps) {
  const kpis: KPI[] = [
    {
      label: 'Clicks a productos',
      value: productClicks,
      icon: MousePointer,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Favoritos agregados',
      value: favoritesAdded,
      icon: Heart,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Favoritos removidos',
      value: favoritesRemoved,
      icon: Heart,
      iconBgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      label: 'Búsquedas',
      value: searches,
      icon: Search,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Selecciones de variante',
      value: variantSelections,
      icon: Activity,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Sesiones únicas',
      value: uniqueSessions,
      icon: Users,
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">{kpi.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{kpi.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{rangeLabel}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg ${kpi.iconBgColor} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
