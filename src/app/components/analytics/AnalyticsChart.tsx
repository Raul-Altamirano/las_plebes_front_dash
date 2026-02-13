import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartSeriesEnabled } from './ChartSeriesToggles';

interface DailySeries {
  date: string;
  clicks: number;
  searches: number;
  favAdded: number;
  favRemoved: number;
  variantSelects: number;
}

interface AnalyticsChartProps {
  data: DailySeries[];
  seriesEnabled: ChartSeriesEnabled;
}

export function AnalyticsChart({ data, seriesEnabled }: AnalyticsChartProps) {
  // Format date for display (MM/DD)
  const formattedData = data.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
  }));

  // Check if at least one series is enabled
  const hasAnySeries = Object.values(seriesEnabled).some(Boolean);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Diaria</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No hay datos disponibles</p>
      ) : !hasAnySeries ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">Activa al menos una serie para visualizar la gráfica</p>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '14px' }}
              />
              {seriesEnabled.clicks && (
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Clicks a productos"
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {seriesEnabled.searches && (
                <Line 
                  type="monotone" 
                  dataKey="searches" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  name="Búsquedas"
                  dot={{ fill: '#a855f7', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {seriesEnabled.favAdds && (
                <Line 
                  type="monotone" 
                  dataKey="favAdded" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Favoritos agregados"
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {seriesEnabled.favRemoves && (
                <Line 
                  type="monotone" 
                  dataKey="favRemoved" 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  name="Favoritos removidos"
                  dot={{ fill: '#6b7280', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {seriesEnabled.variantSelects && (
                <Line 
                  type="monotone" 
                  dataKey="variantSelects" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Selecciones de variante"
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}