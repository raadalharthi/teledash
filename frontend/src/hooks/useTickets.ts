import { useState, useEffect, useCallback } from 'react';
import { ticketsApi } from '../lib/api';
import { Ticket, TicketComment } from '../types';

interface TicketCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({ open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; priority?: string; search?: string }>({});

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ticketsApi.getAll(filters);
      if (result.success) {
        setTickets(result.tickets || []);
        setCounts(result.counts || { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const createTicket = useCallback(async (data: { title: string; description?: string; priority?: string; conversation_id?: string; contact_id?: string }) => {
    const result = await ticketsApi.create(data);
    if (result.success) {
      await loadTickets();
    }
    return result;
  }, [loadTickets]);

  const updateTicket = useCallback(async (id: string, data: { status?: string; priority?: string; title?: string; description?: string }) => {
    const result = await ticketsApi.update(id, data);
    if (result.success) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...result.ticket } : t));
    }
    return result;
  }, []);

  const deleteTicket = useCallback(async (id: string) => {
    const result = await ticketsApi.delete(id);
    if (result.success) {
      setTickets(prev => prev.filter(t => t.id !== id));
    }
    return result;
  }, []);

  return {
    tickets,
    counts,
    loading,
    filters,
    setFilters,
    createTicket,
    updateTicket,
    deleteTicket,
    refresh: loadTickets,
  };
}

export function useTicketDetail(ticketId: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const result = await ticketsApi.getById(ticketId);
      if (result.success) {
        setTicket(result.ticket);
        setComments(result.comments || []);
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const addComment = useCallback(async (text: string, isInternal?: boolean) => {
    if (!ticketId) return;
    const result = await ticketsApi.addComment(ticketId, text, isInternal);
    if (result.success && result.comment) {
      setComments(prev => [...prev, result.comment]);
    }
    return result;
  }, [ticketId]);

  const updateTicket = useCallback(async (data: { status?: string; priority?: string; title?: string; description?: string }) => {
    if (!ticketId) return;
    const result = await ticketsApi.update(ticketId, data);
    if (result.success && result.ticket) {
      setTicket(prev => prev ? { ...prev, ...result.ticket } : null);
    }
    return result;
  }, [ticketId]);

  return { ticket, comments, loading, addComment, updateTicket, refresh: loadTicket };
}
