import { useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Plus,
  Upload,
  Download,
  Search,
  MapPin,
  Shield,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { useCoverage } from '../store/CoverageContext';
import { useAuth } from '../store/AuthContext';
import { CoverageTable } from '../components/CoverageTable';
import { CoverageFormModal } from '../components/CoverageFormModal';
import { CsvImportModal } from '../components/CsvImportModal';
import { CoverageZip, CoverageStatus } from '../types/coverage';
import { exportCoverageToCSV, downloadCSV } from '../utils/coverageHelpers';
import { toast } from 'sonner';

export function Coverage() {
  const { coverageZips, createZip, updateZip, deleteZip, list, importZips, exportZips } =
    useCoverage();
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission('coverage:update');
  const canImport = hasPermission('coverage:import');
  const canExport = hasPermission('coverage:export');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingZip, setEditingZip] = useState<CoverageZip | undefined>();

  // Filter and search
  const filteredZips = useMemo(() => {
    return list({
      search: searchQuery,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
  }, [list, searchQuery, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const enabled = coverageZips.filter((z) => z.status === 'ENABLED').length;
    const review = coverageZips.filter((z) => z.status === 'REVIEW').length;
    const disabled = coverageZips.filter((z) => z.status === 'DISABLED').length;
    return { enabled, review, disabled };
  }, [coverageZips]);

  // Handlers
  const handleAddClick = () => {
    setEditingZip(undefined);
    setFormModalOpen(true);
  };

  const handleEditClick = (zip: CoverageZip) => {
    setEditingZip(zip);
    setFormModalOpen(true);
  };

  const handleFormSubmit = (data: Partial<CoverageZip>) => {
    if (editingZip) {
      const success = updateZip(editingZip.id, data);
      if (success) {
        toast.success('Código postal actualizado correctamente');
      } else {
        toast.error('Error al actualizar el código postal');
      }
    } else {
      createZip(data as Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>);
      toast.success('Código postal agregado correctamente');
    }
  };

  const handleChangeStatus = (id: string, newStatus: CoverageStatus) => {
    const success = updateZip(id, { status: newStatus });
    if (success) {
      toast.success(`Estado cambiado a ${newStatus}`);
    } else {
      toast.error('Error al cambiar el estado');
    }
  };

  const handleDelete = (id: string) => {
    const success = deleteZip(id);
    if (success) {
      toast.success('Código postal eliminado');
    } else {
      toast.error('Error al eliminar el código postal');
    }
  };

  const handleExport = () => {
    const data = exportZips();
    const csv = exportCoverageToCSV(data);
    const filename = `cobertura_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
    toast.success(`Exportados ${data.length} códigos postales`);
  };

  const handleImport = (
    data: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[],
    mode: 'merge' | 'skip'
  ) => {
    const result = importZips(data, mode);
    toast.success(
      `Importación completa: ${result.imported} nuevos, ${result.updated} actualizados, ${result.skipped} omitidos`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cobertura de Entrega</h1>
        <p className="text-gray-600 mt-1">
          Gestiona los códigos postales donde realizas entregas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CPs Habilitados</p>
              <p className="text-2xl font-semibold text-gray-900">{kpis.enabled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CPs en Revisión</p>
              <p className="text-2xl font-semibold text-gray-900">{kpis.review}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CPs Bloqueados</p>
              <p className="text-2xl font-semibold text-gray-900">{kpis.disabled}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por CP, nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="ENABLED">Habilitados</SelectItem>
            <SelectItem value="REVIEW">En revisión</SelectItem>
            <SelectItem value="DISABLED">Bloqueados</SelectItem>
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex gap-2">
          {canUpdate && (
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar CP
            </Button>
          )}
          {canImport && (
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          )}
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <CoverageTable
        coverageZips={filteredZips}
        onEdit={handleEditClick}
        onChangeStatus={handleChangeStatus}
        onDelete={handleDelete}
      />

      {/* Modals */}
      <CoverageFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        existingZips={coverageZips}
        editingZip={editingZip}
      />

      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
