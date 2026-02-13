import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type AuditEvent, type AuditAction, type AuditChange, type AuditEntity } from '../types/audit';
import { useAuth } from './AuthContext';

interface AuditContextValue {
  events: AuditEvent[];
  auditLog: (params: {
    action: AuditAction;
    entity?: AuditEntity;
    changes?: AuditChange[];
    metadata?: Record<string, any>;
  }) => void;
  filterByRange: (days: number | 'all') => AuditEvent[];
  purgeOlderThan: (days: number) => { deletedCount: number; remainingCount: number };
}

const AuditContext = createContext<AuditContextValue | undefined>(undefined);

const STORAGE_KEY = 'ecommerce_admin_audit_log';

/**
 * Normalizes old audit events to the new format
 */
function normalizeAuditEvent(event: any): AuditEvent {
  // Handle old format with 'timestamp' instead of 'ts'
  const ts = event.ts || event.timestamp || new Date().toISOString();
  
  // Handle old format with entity.name instead of entity.label
  let entity = event.entity;
  if (entity && !entity.label && entity.name) {
    entity = { ...entity, label: entity.name };
  }
  
  // Handle old format with actor.role instead of actor.roleName
  let actor = event.actor;
  if (actor && !actor.roleName && actor.role) {
    actor = { ...actor, roleName: actor.role };
  }

  return {
    id: event.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ts,
    actor,
    action: event.action,
    entity,
    changes: event.changes,
    metadata: event.metadata,
  };
}

export function AuditProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();

  const [events, setEvents] = useState<AuditEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as any[];
        // Normalize all events
        return parsed.map(normalizeAuditEvent);
      }
    } catch (error) {
      console.error('Error loading audit log from localStorage:', error);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  /**
   * Centralized audit logging function
   * Automatically captures current user as actor
   */
  const auditLog = (params: {
    action: AuditAction;
    entity?: AuditEntity;
    changes?: AuditChange[];
    metadata?: Record<string, any>;
  }) => {
    const currentUser = authContext?.currentUser;
    
    if (!currentUser) {
      console.warn('Cannot log audit event: no current user');
      return;
    }

    const newEvent: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ts: new Date().toISOString(),
      actor: {
        id: currentUser.id,
        name: currentUser.name,
        roleName: currentUser.role,
      },
      action: params.action,
      entity: params.entity,
      changes: params.changes,
      metadata: params.metadata,
    };

    setEvents((prev) => [newEvent, ...prev]);
  };

  /**
   * Filters audit events by a range of days
   * @param days - Number of days to filter by, or 'all' for no filtering
   * @returns Array of audit events within the specified range
   */
  const filterByRange = (days: number | 'all'): AuditEvent[] => {
    if (days === 'all') {
      return events;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return events.filter(event => new Date(event.ts) >= cutoffDate);
  };

  /**
   * Purges audit events older than a specified number of days
   * @param days - Number of days to retain events
   * @returns Object with counts of deleted and remaining events
   */
  const purgeOlderThan = (days: number): { deletedCount: number; remainingCount: number } => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredEvents = events.filter(event => new Date(event.ts) >= cutoffDate);
    const deletedCount = events.length - filteredEvents.length;

    setEvents(filteredEvents);

    return {
      deletedCount,
      remainingCount: filteredEvents.length,
    };
  };

  const value: AuditContextValue = {
    events,
    auditLog,
    filterByRange,
    purgeOlderThan,
  };

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}