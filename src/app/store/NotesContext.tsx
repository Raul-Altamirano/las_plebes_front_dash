import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Note, NotePriority, NoteStatus } from '../types/note';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { mockNotes } from '../data/mockNotes';

interface NotesContextValue {
  notes: Note[];
  createNote: (noteData: Omit<Note, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'tenantId' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => Note | undefined;
  filterByStatus: (status: NoteStatus) => Note[];
  filterByPriority: (priority: NotePriority) => Note[];
  filterByTag: (tag: string) => Note[];
  getNotesForOrder: (orderId: string) => Note[];
  getNotesForRma: (rmaId: string) => Note[];
}

const NotesContext = createContext<NotesContextValue | undefined>(undefined);
const STORAGE_KEY = 'pochteca_notes';
const TENANT_ID = 'las-plebes';

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const { currentUser } = useAuth();
  const { auditLog  } = useAudit();

  // ── Cargar desde localStorage o mock ────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch {
        setNotes(mockNotes);
      }
    } else {
      setNotes(mockNotes);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockNotes));
    }
  }, []);

  // ── Persistir en localStorage ────────────────────────────────────────────
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  // ── Helper de auditoría ──────────────────────────────────────────────────
  const audit = (action: any, noteId: string, noteTitle: string, meta?: any) => {
    auditLog ({
      action,
      entityType: 'note',
      entityId: noteId,
      entityName: noteTitle,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System',
      userRole: currentUser?.role || 'ADMIN',
      metadata: meta,
    });
  };

  // ── createNote ───────────────────────────────────────────────────────────
  const createNote = (noteData: Omit<Note, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Note => {
    const newNote: Note = {
      ...noteData,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: TENANT_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    audit('NOTE_CREATED', newNote.id, newNote.title, {
      priority: newNote.priority,
      status: newNote.status,
      tags: newNote.tags,
    });
    return newNote;
  };

  // ── updateNote ───────────────────────────────────────────────────────────
  const updateNote = (id: string, updates: Partial<Omit<Note, 'id' | 'tenantId' | 'createdAt'>>) => {
    setNotes(prev => {
      const index = prev.findIndex(n => n.id === id);
      if (index === -1) return prev;

      const oldNote = prev[index];
      const updatedNote: Note = { ...oldNote, ...updates, updatedAt: new Date().toISOString() };
      const newNotes = [...prev];
      newNotes[index] = updatedNote;

      if (updates.status && updates.status !== oldNote.status) {
        audit('NOTE_STATUS_CHANGED', updatedNote.id, updatedNote.title, {
          from: oldNote.status, to: updates.status,
        });
      } else {
        audit('NOTE_UPDATED', updatedNote.id, updatedNote.title);
      }

      return newNotes;
    });
  };

  // ── deleteNote ───────────────────────────────────────────────────────────
  const deleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    audit('NOTE_DELETED', note.id, note.title);
  };

  const getNoteById    = (id: string) => notes.find(n => n.id === id);
  const filterByStatus   = (status: NoteStatus) => notes.filter(n => n.status === status);
  const filterByPriority = (priority: NotePriority) => notes.filter(n => n.priority === priority);
  const filterByTag      = (tag: string) => notes.filter(n => n.tags.includes(tag));
  const getNotesForOrder = (orderId: string) => notes.filter(n => n.linkedOrderIds.includes(orderId));
  const getNotesForRma   = (rmaId: string) => notes.filter(n => n.linkedRmaIds.includes(rmaId));

  const value: NotesContextValue = {
    notes, createNote, updateNote, deleteNote, getNoteById,
    filterByStatus, filterByPriority, filterByTag, getNotesForOrder, getNotesForRma,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) throw new Error('useNotes must be used within a NotesProvider');
  return context;
}