import { useState, useEffect, useCallback } from 'react';
import { RMAType, RMAReturnReason, RMAItem, RMAReplacementItem } from '../types/rma';

const DRAFT_KEY = 'rma_draft';
const SAVE_DELAY = 800; // 800ms de delay para simular petición al servidor

export interface RMADraftData {
  orderId: string;
  rmaType: RMAType;
  reason: RMAReturnReason;
  notes: string;
  returnItems: RMAItem[];
  replacementItems: RMAReplacementItem[];
  lastSaved: string;
  step?: number; // Track current step
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveMetadata {
  action?: 'type_changed' | 'reason_changed' | 'item_added' | 'item_removed' | 'qty_changed' | 'notes_changed' | 'auto_save';
}

export function useRMADraft(orderId: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [draftData, setDraftData] = useState<RMADraftData | null>(null);
  const [lastAction, setLastAction] = useState<string | undefined>();

  // Cargar draft al montar
  useEffect(() => {
    const loadDraft = () => {
      try {
        const stored = localStorage.getItem(DRAFT_KEY);
        if (stored) {
          const draft = JSON.parse(stored) as RMADraftData;
          // Solo cargar si es del mismo pedido
          if (draft.orderId === orderId) {
            setDraftData(draft);
            return draft;
          }
        }
      } catch (error) {
        console.error('Error loading RMA draft:', error);
      }
      return null;
    };

    loadDraft();
  }, [orderId]);

  // Guardar draft con delay simulado
  const saveDraft = useCallback(async (data: Omit<RMADraftData, 'lastSaved'>, metadata?: SaveMetadata) => {
    setSaveStatus('saving');
    
    try {
      // Simular petición al servidor con delay
      await new Promise(resolve => setTimeout(resolve, SAVE_DELAY));
      
      const draftToSave: RMADraftData = {
        ...data,
        lastSaved: new Date().toISOString(),
      };
      
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftToSave));
      setDraftData(draftToSave);
      setSaveStatus('saved');
      
      // Volver a idle después de 2 segundos
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving RMA draft:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, []);

  // Limpiar draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftData(null);
    setSaveStatus('idle');
  }, []);

  // Verificar si existe un draft
  const hasDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as RMADraftData;
        return draft.orderId === orderId;
      }
    } catch (error) {
      console.error('Error checking RMA draft:', error);
    }
    return false;
  }, [orderId]);

  return {
    saveDraft,
    clearDraft,
    hasDraft,
    draftData,
    saveStatus,
    isSaving: saveStatus === 'saving',
  };
}