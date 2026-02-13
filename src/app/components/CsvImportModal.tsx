import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { type CoverageZip } from '../types/coverage';
import { parseCoverageRow } from '../utils/coverageHelpers';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    data: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[],
    mode: 'merge' | 'skip'
  ) => void;
}

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    data: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[];
    errors: string[];
  } | null>(null);
  const [mode, setMode] = useState<'merge' | 'skip'>('skip');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        setPreview({ data: [], errors: ['El archivo está vacío'] });
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map((h) => h.trim());
      const dataLines = lines.slice(1);

      const parsedData: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const values = parseCSVLine(line);

        // Create row object
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        const result = parseCoverageRow(row, i);
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        } else if (result.data) {
          parsedData.push(result.data);
        }
      }

      setPreview({ data: parsedData, errors });
    };

    reader.readAsText(file);
  };

  // Simple CSV parser (handles quoted values with commas)
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const handleImport = () => {
    if (!preview || preview.data.length === 0) return;

    onImport(preview.data, mode);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setMode('skip');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Códigos Postales desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con las columnas: zip, status, deliveryFee, minOrder,
            onlyMeetupPoint, meetupPointNote, reason, notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : 'Seleccionar archivo'}
              </Button>
            </div>
          </div>

          {/* Import Mode */}
          {preview && preview.data.length > 0 && (
            <div>
              <Label>Modo de importación</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'merge' | 'skip')}>
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer font-normal">
                    Omitir duplicados (no actualiza CPs existentes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merge" id="merge" />
                  <Label htmlFor="merge" className="cursor-pointer font-normal">
                    Actualizar duplicados (sobrescribe CPs existentes)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {/* Success */}
              {preview.data.length > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>{preview.data.length}</strong> código(s) postal(es) válido(s) listo(s)
                    para importar
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{preview.errors.length} error(es) encontrado(s):</strong>
                    <ul className="list-disc list-inside mt-2 text-sm max-h-32 overflow-y-auto">
                      {preview.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              {preview.data.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Vista previa</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                            CP
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                            Estado
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                            Fee
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                            Mínimo
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                            Meetup
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.data.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono">{item.zip}</td>
                            <td className="px-4 py-2">{item.status}</td>
                            <td className="px-4 py-2">
                              {item.deliveryFee ? `$${item.deliveryFee.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-2">
                              {item.minOrder ? `$${item.minOrder.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-2">
                              {item.onlyMeetupPoint ? 'Sí' : 'No'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.data.length > 10 && (
                      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                        Mostrando 10 de {preview.data.length} registros
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!preview || preview.data.length === 0}
          >
            Importar {preview?.data.length || 0} CP(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
