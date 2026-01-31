import React, { useState } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { Ticket } from '../../types';
import { TicketDetail } from './TicketDetail';
import { CreateTicketModal } from './CreateTicketModal';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-surface-100 text-surface-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-surface-100 text-surface-500',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function TicketList() {
  const { tickets, counts, loading, filters, setFilters, createTicket, updateTicket, deleteTicket } = useTickets();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput || undefined }));
  };

  const handleStatusFilter = (status: string | undefined) => {
    setFilters(prev => ({ ...prev, status }));
  };

  if (selectedTicketId) {
    return (
      <TicketDetail
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
        onUpdateTicket={updateTicket}
      />
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Tickets</h1>
            <p className="text-sm text-surface-400 mt-0.5">{counts.total} total tickets</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Ticket
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: undefined, label: 'All', count: counts.total },
            { key: 'open', label: 'Open', count: counts.open },
            { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
            { key: 'resolved', label: 'Resolved', count: counts.resolved },
            { key: 'closed', label: 'Closed', count: counts.closed },
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => handleStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.status === tab.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search tickets..."
            className="flex-1 px-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <button type="submit" className="px-4 py-2 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm text-surface-600 transition-colors">
            Search
          </button>
        </form>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🎫</div>
            <p className="text-base font-medium text-surface-400">No tickets yet</p>
            <p className="text-sm text-surface-300 mt-1">Create a ticket to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="px-6 py-4 bg-white hover:bg-surface-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-surface-400 font-mono">#{ticket.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-surface-900 truncate">{ticket.title}</h3>
                    {ticket.description && (
                      <p className="text-xs text-surface-500 truncate mt-0.5">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                      {ticket.contact && (
                        <span>Contact: {ticket.contact.name}</span>
                      )}
                      {ticket.assignee?.name && (
                        <span>Assigned: {ticket.assignee.name}</span>
                      )}
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create ticket modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            await createTicket(data);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
