import React, { useState, useEffect, useCallback } from 'react';
import { organizationsApi } from '../../lib/api';

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  joined_at: string;
}

interface OrgInfo {
  organization: any;
  member_count: number;
  my_role: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Admin',
  agent: 'Agent',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  org_admin: 'bg-purple-100 text-purple-700',
  agent: 'bg-blue-100 text-blue-700',
  viewer: 'bg-surface-100 text-surface-500',
};

export function TeamManagement() {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [orgResult, membersResult] = await Promise.all([
        organizationsApi.getCurrent(),
        organizationsApi.getMembers(),
      ]);
      if (orgResult.success) setOrg(orgResult as unknown as OrgInfo);
      if (membersResult.success) setMembers(membersResult.members || []);
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    const result = await organizationsApi.create(orgName.trim());
    if (result.success) {
      await loadData();
      setShowCreateOrg(false);
      setOrgName('');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setInviteResult(null);
    const result = await organizationsApi.invite(inviteEmail.trim(), inviteRole);
    if (result.success) {
      setInviteResult(`Invitation sent! Share this link: ${window.location.origin}${result.invite_link}`);
      setInviteEmail('');
      await loadData();
    } else {
      setInviteResult(result.error || 'Failed to send invitation');
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await organizationsApi.updateMember(userId, { role });
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!org?.organization) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">Create Your Organization</h2>
          <p className="text-sm text-surface-500 mb-6">Set up a team to invite agents and collaborate on support.</p>
          {showCreateOrg ? (
            <form onSubmit={handleCreateOrg} className="space-y-3">
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name"
                className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={() => setShowCreateOrg(false)} className="px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={!orgName.trim()} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-50">Create</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowCreateOrg(true)} className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors">
              Create Organization
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{org.organization.name}</h1>
            <p className="text-sm text-surface-400 mt-0.5">{org.member_count} member{org.member_count !== 1 ? 's' : ''} &middot; {org.organization.plan} plan</p>
          </div>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Invite Member
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <form onSubmit={handleInvite} className="mt-4 p-4 bg-surface-50 rounded-xl">
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                type="email"
                required
                placeholder="Email address"
                className="flex-1 px-4 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 focus:outline-none"
              >
                <option value="agent">Agent</option>
                <option value="org_admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={inviting} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {inviting ? '...' : 'Send'}
              </button>
            </div>
            {inviteResult && (
              <p className="mt-2 text-xs text-surface-600 bg-white p-2 rounded-lg break-all">{inviteResult}</p>
            )}
          </form>
        )}
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-surface-100">
          {members.map(member => (
            <div key={member.id} className="px-6 py-4 bg-white flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent flex items-center justify-center text-white text-sm font-semibold">
                {member.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900">{member.name || 'Unnamed'}</p>
                <p className="text-xs text-surface-400">{member.email}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.agent}`}>
                {ROLE_LABELS[member.role] || member.role}
              </span>
              {org.my_role === 'org_admin' && member.user_id !== member.id && (
                <select
                  value={member.role}
                  onChange={e => handleRoleChange(member.user_id, e.target.value)}
                  className="px-2 py-1 bg-surface-50 border border-surface-200 rounded-lg text-xs text-surface-700"
                >
                  <option value="agent">Agent</option>
                  <option value="org_admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
