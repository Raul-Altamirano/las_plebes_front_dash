/**
 * CSV Export Helper
 * Funciones reutilizables para exportar datos a CSV
 */

/**
 * Sanitiza un valor para CSV, escapando comillas y envolviendo cuando sea necesario
 */
export function sanitizeCSVValue(value: any): string {
  // null/undefined -> string vacío
  if (value === null || value === undefined) {
    return '';
  }

  // Convertir a string
  let stringValue = String(value);

  // Si contiene comillas dobles, duplicarlas (escapar)
  if (stringValue.includes('"')) {
    stringValue = stringValue.replace(/"/g, '""');
  }

  // Si contiene coma, comillas, salto de línea o retorno de carro -> envolver en comillas
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Convierte un array de objetos a CSV string
 * @param rows Array de objetos con los datos
 * @param columns Array opcional de nombres de columnas (keys). Si no se provee, usa las keys del primer objeto
 * @returns String CSV
 */
export function convertToCSV(
  rows: Record<string, any>[],
  columns?: string[]
): string {
  if (rows.length === 0) {
    return '';
  }

  // Si no se proveen columnas, usar las keys del primer objeto
  const headers = columns || Object.keys(rows[0]);

  // Crear header row
  const headerRow = headers.map(sanitizeCSVValue).join(',');

  // Crear data rows
  const dataRows = rows.map(row => {
    return headers
      .map(header => {
        const value = row[header];
        
        // Si el valor es objeto o array, convertir a JSON string
        if (value !== null && value !== undefined && typeof value === 'object') {
          return sanitizeCSVValue(JSON.stringify(value));
        }
        
        return sanitizeCSVValue(value);
      })
      .join(',');
  });

  // Combinar header y data
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Exporta datos a CSV y descarga el archivo
 * @param rows Array de objetos con los datos
 * @param filenameBase Nombre base del archivo (sin extensión ni fecha)
 * @param columns Array opcional de nombres de columnas
 */
export function exportToCSV(
  rows: Record<string, any>[],
  filenameBase: string,
  columns?: string[]
): void {
  // Generar CSV content
  const csvContent = convertToCSV(rows, columns);

  // Agregar BOM (Byte Order Mark) para que Excel reconozca UTF-8
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Crear blob
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

  // Generar nombre de archivo con fecha
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `${filenameBase}_${dateStr}.csv`;

  // Crear link temporal y descargar
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Liberar objeto URL
  URL.revokeObjectURL(url);
}

/**
 * Formatea una fecha para CSV (ISO 8601 sin milisegundos)
 */
export function formatDateForCSV(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); // Quitar milisegundos
  } catch {
    return '';
  }
}

/**
 * Formatea un número para CSV (sin separadores de miles, punto decimal)
 */
export function formatNumberForCSV(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '';
  return num.toString();
}

/**
 * Formatea un monto de dinero para CSV (número con 2 decimales)
 */
export function formatMoneyForCSV(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  return amount.toFixed(2);
}
