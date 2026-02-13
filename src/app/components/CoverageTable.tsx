import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical, Edit, Power, PowerOff, Eye, Trash2 } from 'lucide-react';
import { type CoverageZip, DISABLED_REASON_LABELS } from '../types/coverage';
import { CoverageStatusBadge } from './CoverageStatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { useAuth } from '../store/AuthContext';

interface CoverageTableProps {
  coverageZips: CoverageZip[];
  onEdit: (zip: CoverageZip) => void;
  onChangeStatus: (id: string, newStatus: 'ENABLED' | 'REVIEW' | 'DISABLED') => void;
  onDelete: (id: string) => void;
}

export function CoverageTable({
  coverageZips,
  onEdit,
  onChangeStatus,
  onDelete,
}: CoverageTableProps) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('coverage:update');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zipToDelete, setZipToDelete] = useState<CoverageZip | null>(null);

  const handleDeleteClick = (zip: CoverageZip) => {
    setZipToDelete(zip);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (zipToDelete) {
      onDelete(zipToDelete.id);
    }
    setDeleteDialogOpen(false);
    setZipToDelete(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (coverageZips.length === 0) {
    return (
      <EmptyState
        title="No hay códigos postales"
        description="Agrega códigos postales para definir tu cobertura de entrega"
      />
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">CP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Costo Envío</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-center">Meetup Only</TableHead>
              <TableHead>Razón</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverageZips.map((zip) => (
              <TableRow key={zip.id}>
                <TableCell className="font-mono font-medium">{zip.zip}</TableCell>
                <TableCell>
                  <CoverageStatusBadge status={zip.status} />
                </TableCell>
                <TableCell className="text-right">
                  {zip.deliveryFee !== undefined && zip.deliveryFee !== null
                    ? `$${zip.deliveryFee.toFixed(2)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {zip.minOrder !== undefined && zip.minOrder !== null
                    ? `$${zip.minOrder.toFixed(2)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {zip.onlyMeetupPoint ? (
                    <Badge variant="blue">Sí</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {zip.reason ? (
                    <span className="text-sm text-gray-600">
                      {DISABLED_REASON_LABELS[zip.reason]}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDate(zip.updatedAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(zip)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {zip.status !== 'ENABLED' && (
                            <DropdownMenuItem onClick={() => onChangeStatus(zip.id, 'ENABLED')}>
                              <Power className="mr-2 h-4 w-4 text-green-600" />
                              Habilitar
                            </DropdownMenuItem>
                          )}
                          {zip.status !== 'REVIEW' && (
                            <DropdownMenuItem onClick={() => onChangeStatus(zip.id, 'REVIEW')}>
                              <Eye className="mr-2 h-4 w-4 text-yellow-600" />
                              Marcar revisión
                            </DropdownMenuItem>
                          )}
                          {zip.status !== 'DISABLED' && (
                            <DropdownMenuItem onClick={() => onChangeStatus(zip.id, 'DISABLED')}>
                              <PowerOff className="mr-2 h-4 w-4 text-red-600" />
                              Deshabilitar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(zip)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                      {!canUpdate && (
                        <DropdownMenuItem disabled>Sin permisos de edición</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar código postal"
        description={`¿Estás seguro de que deseas eliminar el CP ${zipToDelete?.zip}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
      />
    </>
  );
}
