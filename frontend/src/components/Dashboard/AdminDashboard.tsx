import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

interface TicketStats {
  total: string; open: string; in_progress: string; resolved: string; closed: string;
  avg_first_response_min: string | null; avg_resolution_hours: string | null;
}
interface ConvStats {
  total: string; telegram: string; email: string; active_today: string;
}
interface MessageDay {
  date: string; total: string; inbound: string; outbound: string;
}
interface AgentRow {
  id: string; name: string; email: string;
  conversations_handled: string; tickets_assigned: string; tickets_resolved: string;
}

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#64748b'];

export function AdminDashboard() {
  const [tickets, setTickets] = useState<TicketStats | null>(null);
  const [convs, setConvs] = useState<ConvStats | null>(null);
  const [volume, setVolume] = useState<MessageDay[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getOverview().then(r => {
      if (r.success) {
        setTickets(r.tickets);
        setConvs(r.conversations);
        setVolume(r.message_volume || []);
        setAgents(r.agents || []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const ticketPieData = tickets ? [
    { name: 'Open', value: parseInt(tickets.open) || 0 },
    { name: 'In Progress', value: parseInt(tickets.in_progress) || 0 },
    { name: 'Resolved', value: parseInt(tickets.resolved) || 0 },
    { name: 'Closed', value: parseInt(tickets.closed) || 0 },
  ].filter(d => d.value > 0) : [];

  const chartVolume = volume.map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    inbound: parseInt(d.inbound),
    outbound: parseInt(d.outbound),
  }));

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Conversations" value={convs?.total || '0'} sub={`${convs?.active_today || 0} active today`} color="brand" />
        <KpiCard label="Open Tickets" value={tickets?.open || '0'} sub={`${tickets?.total || 0} total`} color="amber" />
        <KpiCard label="Avg First Response" value={tickets?.avg_first_response_min ? `${tickets.avg_first_response_min}m` : '—'} sub="minutes" color="emerald" />
        <KpiCard label="Avg Resolution" value={tickets?.avg_resolution_hours ? `${tickets.avg_resolution_hours}h` : '—'} sub="hours" color="purple" />
      </div>

      {/* Channel breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Telegram" value={convs?.telegram || '0'} sub="conversations" color="blue" />
        <KpiCard label="Email" value={convs?.email || '0'} sub="conversations" color="rose" />
        <KpiCard label="Tickets Resolved" value={tickets?.resolved || '0'} sub="total resolved" color="emerald" />
        <KpiCard label="Tickets Closed" value={tickets?.closed || '0'} sub="total closed" color="surface" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-sm font-semibold text-surface-700 mb-4">Message Volume (30 days)</h2>
          {chartVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="inbound" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-surface-400 text-sm py-10 text-center">No message data yet</p>
          )}
        </div>

        {/* Ticket Status Pie */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-sm font-semibold text-surface-700 mb-4">Tickets by Status</h2>
          {ticketPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {ticketPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-surface-400 text-sm py-10 text-center">No tickets yet</p>
          )}
        </div>
      </div>

      {/* Agent Performance Table */}
      {agents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-sm font-semibold text-surface-700 mb-4">Agent Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left py-2 px-3 text-surface-500 font-medium">Agent</th>
                  <th className="text-center py-2 px-3 text-surface-500 font-medium">Conversations</th>
                  <th className="text-center py-2 px-3 text-surface-500 font-medium">Tickets Assigned</th>
                  <th className="text-center py-2 px-3 text-surface-500 font-medium">Tickets Resolved</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id} className="border-b border-surface-50 hover:bg-surface-50">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-surface-900">{a.name || 'Unnamed'}</div>
                      <div className="text-xs text-surface-400">{a.email}</div>
                    </td>
                    <td className="text-center py-2.5 px-3">{a.conversations_handled}</td>
                    <td className="text-center py-2.5 px-3">{a.tickets_assigned}</td>
                    <td className="text-center py-2.5 px-3">{a.tickets_resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    brand: 'from-brand-500 to-brand-600',
    amber: 'from-amber-400 to-amber-500',
    emerald: 'from-emerald-400 to-emerald-500',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-400 to-blue-500',
    rose: 'from-rose-400 to-rose-500',
    surface: 'from-surface-400 to-surface-500',
  };
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <p className="text-xs text-surface-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-400 mt-0.5">{sub}</p>
      <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.brand} mt-2`} />
    </div>
  );
}
