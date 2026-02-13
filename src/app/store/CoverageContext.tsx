import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { type CoverageZip } from '../types/coverage';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import { diffFields } from '../utils/auditHelpers';

// Coverage context and provider
interface CoverageState {
  coverageZips: CoverageZip[];
}

type CoverageAction =
  | { type: 'CREATE_ZIP'; payload: CoverageZip }
  | { type: 'UPDATE_ZIP'; payload: CoverageZip }
  | { type: 'DELETE_ZIP'; payload: string }
  | { type: 'SET_ZIPS'; payload: CoverageZip[] }
  | { type: 'IMPORT_ZIPS'; payload: CoverageZip[] };

interface CoverageContextValue {
  coverageZips: CoverageZip[];
  createZip: (zip: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>) => CoverageZip;
  updateZip: (id: string, patch: Partial<CoverageZip>) => boolean;
  deleteZip: (id: string) => boolean;
  getById: (id: string) => CoverageZip | undefined;
  getByZip: (zip: string) => CoverageZip | undefined;
  list: (query?: CoverageQueryParams) => CoverageZip[];
  importZips: (zips: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[], mode: 'merge' | 'skip') => {
    imported: number;
    skipped: number;
    updated: number;
  };
  exportZips: () => CoverageZip[];
}

export interface CoverageQueryParams {
  search?: string;
  status?: string;
}

const CoverageContext = createContext<CoverageContextValue | null>(null);

const STORAGE_KEY = 'ecommerce_admin_coverage';

function coverageReducer(state: CoverageState, action: CoverageAction): CoverageState {
  switch (action.type) {
    case 'CREATE_ZIP':
      return {
        ...state,
        coverageZips: [...state.coverageZips, action.payload],
      };
    case 'UPDATE_ZIP':
      return {
        ...state,
        coverageZips: state.coverageZips.map((z) =>
          z.id === action.payload.id ? action.payload : z
        ),
      };
    case 'DELETE_ZIP':
      return {
        ...state,
        coverageZips: state.coverageZips.filter((z) => z.id !== action.payload),
      };
    case 'SET_ZIPS':
      return {
        ...state,
        coverageZips: action.payload,
      };
    case 'IMPORT_ZIPS':
      return {
        ...state,
        coverageZips: action.payload,
      };
    default:
      return state;
  }
}

export function CoverageProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();
  const { currentUser } = useAuth();

  const [state, dispatch] = useReducer(coverageReducer, {
    coverageZips: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        dispatch({ type: 'SET_ZIPS', payload: parsed });
      } catch (err) {
        console.error('Failed to parse coverage data from localStorage', err);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.coverageZips));
  }, [state.coverageZips]);

  const createZip = (
    zip: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>
  ): CoverageZip => {
    const now = new Date().toISOString();
    const newZip: CoverageZip = {
      ...zip,
      id: `cov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'CREATE_ZIP', payload: newZip });

    auditLog({
      action: 'COVERAGE_ZIP_CREATED',
      entity: {
        type: 'coverageZip',
        id: newZip.id,
        label: `CP ${newZip.zip}`,
      },
      metadata: {
        zip: newZip.zip,
        status: newZip.status,
      },
    });

    return newZip;
  };

  const updateZip = (id: string, patch: Partial<CoverageZip>): boolean => {
    const existing = state.coverageZips.find((z) => z.id === id);
    if (!existing) return false;

    const updated: CoverageZip = {
      ...existing,
      ...patch,
      id: existing.id, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_ZIP', payload: updated });

    // Log status changes separately
    if (patch.status && patch.status !== existing.status) {
      auditLog({
        action: 'COVERAGE_ZIP_STATUS_CHANGED',
        entity: {
          type: 'coverageZip',
          id: existing.id,
          label: `CP ${existing.zip}`,
        },
        changes: [
          {
            field: 'status',
            from: existing.status,
            to: patch.status,
          },
        ],
        metadata: {
          reason: patch.reason,
        },
      });
    } else {
      const changes = diffFields(
        existing,
        updated,
        ['zip', 'status', 'deliveryFee', 'minOrder', 'onlyMeetupPoint', 'meetupPointNote', 'reason', 'notes']
      );
      
      if (changes.length > 0) {
        auditLog({
          action: 'COVERAGE_ZIP_UPDATED',
          entity: {
            type: 'coverageZip',
            id: existing.id,
            label: `CP ${existing.zip}`,
          },
          changes,
        });
      }
    }

    return true;
  };

  const deleteZip = (id: string): boolean => {
    const existing = state.coverageZips.find((z) => z.id === id);
    if (!existing) return false;

    dispatch({ type: 'DELETE_ZIP', payload: id });

    auditLog({
      action: 'COVERAGE_ZIP_DELETED',
      entity: {
        type: 'coverageZip',
        id: existing.id,
        label: `CP ${existing.zip}`,
      },
      metadata: {
        zip: existing.zip,
      },
    });

    return true;
  };

  const getById = (id: string): CoverageZip | undefined => {
    return state.coverageZips.find((z) => z.id === id);
  };

  const getByZip = (zip: string): CoverageZip | undefined => {
    return state.coverageZips.find((z) => z.zip === zip);
  };

  const list = (query?: CoverageQueryParams): CoverageZip[] => {
    let filtered = [...state.coverageZips];

    if (query?.status) {
      filtered = filtered.filter((z) => z.status === query.status);
    }

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (z) =>
          z.zip.includes(query.search!) ||
          z.notes?.toLowerCase().includes(searchLower) ||
          z.meetupPointNote?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by zip code
    filtered.sort((a, b) => a.zip.localeCompare(b.zip));

    return filtered;
  };

  const importZips = (
    zips: Omit<CoverageZip, 'id' | 'createdAt' | 'updatedAt'>[],
    mode: 'merge' | 'skip'
  ): { imported: number; skipped: number; updated: number } => {
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    const newZips = [...state.coverageZips];

    for (const zipData of zips) {
      const existingIndex = newZips.findIndex((z) => z.zip === zipData.zip);

      if (existingIndex >= 0) {
        if (mode === 'merge') {
          // Update existing
          const now = new Date().toISOString();
          newZips[existingIndex] = {
            ...newZips[existingIndex],
            ...zipData,
            updatedAt: now,
          };
          updated++;
        } else {
          // Skip duplicates
          skipped++;
        }
      } else {
        // Create new
        const now = new Date().toISOString();
        const newZip: CoverageZip = {
          ...zipData,
          id: `cov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        newZips.push(newZip);
        imported++;
      }
    }

    dispatch({ type: 'IMPORT_ZIPS', payload: newZips });

    auditLog({
      action: 'COVERAGE_IMPORT',
      metadata: {
        mode,
        rowsTotal: zips.length,
        createdCount: imported,
        updatedCount: updated,
        skippedCount: skipped,
      },
    });

    return { imported, skipped, updated };
  };

  const exportZips = (): CoverageZip[] => {
    auditLog({
      action: 'COVERAGE_EXPORT',
      metadata: {
        countExported: state.coverageZips.length,
      },
    });

    return state.coverageZips;
  };

  const value: CoverageContextValue = {
    coverageZips: state.coverageZips,
    createZip,
    updateZip,
    deleteZip,
    getById,
    getByZip,
    list,
    importZips,
    exportZips,
  };

  return <CoverageContext.Provider value={value}>{children}</CoverageContext.Provider>;
}

export function useCoverage() {
  const context = useContext(CoverageContext);
  if (!context) {
    throw new Error('useCoverage must be used within CoverageProvider');
  }
  return context;
}