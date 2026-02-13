import { type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export interface Action<T> {
  label: string | ((item: T) => string);
  icon: React.ComponentType<{ className?: string }> | ((item: T) => React.ComponentType<{ className?: string }>);
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | ((item: T) => 'default' | 'destructive');
  hidden?: boolean | ((item: T) => boolean);
}

interface GenericDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  getKey: (item: T) => string;
}

export function GenericDataTable<T>({ data, columns, actions = [], getKey }: GenericDataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={getKey(item)} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render(item)}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actions.map((action, idx) => {
                        const Icon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
                        const label = typeof action.label === 'function' ? action.label(item) : action.label;
                        const variant = typeof action.variant === 'function' ? action.variant(item) : action.variant || 'default';
                        const hidden = typeof action.hidden === 'function' ? action.hidden(item) : action.hidden || false;
                        
                        if (hidden) return null;

                        const buttonClass = variant === 'destructive'
                          ? 'p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded'
                          : 'p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded';

                        return (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={buttonClass}
                            title={label}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}