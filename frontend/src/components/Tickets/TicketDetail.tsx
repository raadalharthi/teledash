import React, { useState } from 'react';
import { useTicketDetail } from '../../hooks/useTickets';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-surface-100 text-surface-500',
};

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
  onUpdateTicket: (id: string, data: any) => Promise<any>;
}

export function TicketDetail({ ticketId, onBack, onUpdateTicket }: TicketDetailProps) {
  const { ticket, comments, loading, addComment, updateTicket } = useTicketDetail(ticketId);
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleAddComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    await addComment(commentText.trim(), isInternal);
    setCommentText('');
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    await updateTicket({ status });
    await onUpdateTicket(ticketId, { status });
  };

  const handlePriorityChange = async (priority: string) => {
    await updateTicket({ priority });
    await onUpdateTicket(ticketId, { priority });
  };

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-surface-50">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-surface-200 px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-sm text-surface-400 font-mono">#{ticket.ticket_number}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-xl font-bold text-surface-900">{ticket.title}</h1>
          {ticket.description && (
            <p className="text-sm text-surface-500 mt-1">{ticket.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
            <span>Created {formatDateTime(ticket.created_at)}</span>
            {ticket.contact?.name && <span>Contact: {ticket.contact.name}</span>}
            {ticket.creator?.name && <span>By: {ticket.creator.name}</span>}
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No comments yet</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={`${comment.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-white border-surface-100'} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-xs font-semibold">
                    {comment.author?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-medium text-surface-900">{comment.author?.name || 'Unknown'}</span>
                  {comment.is_internal && (
                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-700 text-[10px] font-medium rounded">Internal</span>
                  )}
                  <span className="text-xs text-surface-400 ml-auto">{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-sm text-surface-700 whitespace-pre-wrap">{comment.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="bg-white border-t border-surface-200 px-6 py-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 text-xs text-surface-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={e => setIsInternal(e.target.checked)}
                className="rounded border-surface-300"
              />
              Internal note
            </label>
          </div>
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={isInternal ? 'Add an internal note...' : 'Add a comment...'}
              rows={2}
              className="flex-1 px-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim() || sending}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 self-end"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l border-surface-200 bg-white overflow-y-auto p-5 space-y-5">
        <div>
          <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">Status</label>
          <select
            value={ticket.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">Priority</label>
          <select
            value={ticket.priority}
            onChange={e => handlePriorityChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {PRIORITY_OPTIONS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {ticket.contact && (
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">Contact</label>
            <p className="text-sm text-surface-900">{ticket.contact.name}</p>
            {ticket.contact.email && <p className="text-xs text-surface-500">{ticket.contact.email}</p>}
          </div>
        )}

        {ticket.first_response_at && (
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">First Response</label>
            <p className="text-sm text-surface-700">{formatDateTime(ticket.first_response_at)}</p>
          </div>
        )}

        {ticket.resolved_at && (
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">Resolved</label>
            <p className="text-sm text-surface-700">{formatDateTime(ticket.resolved_at)}</p>
          </div>
        )}

        {ticket.tags?.length > 0 && (
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase mb-1.5 block">Tags</label>
            <div className="flex flex-wrap gap-1">
              {ticket.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-surface-100 text-surface-600 text-xs rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
