import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Trash2, Edit3, UserPlus, UserMinus,
  ChevronDown, ChevronUp, Crown, Shield, RefreshCw,
  Briefcase, GitBranch, AlertCircle, X, Check,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import teamService from '../services/teamService';
import useAuthStore from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';

const ROLE_BADGE = {
  DEVELOPER:    { label: 'Dev',     bg: '#EFF6FF', color: '#2563EB' },
  PRODUCT_TEAM: { label: 'Product', bg: '#F5F3FF', color: '#7C3AED' },
  IT_MANAGER:   { label: 'Manager', bg: '#FFF7ED', color: '#D97706' },
  ADMIN:        { label: 'Admin',   bg: '#FEF2F2', color: '#DC2626' },
};

function Avatar({ name, photo, size = 28 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (photo) {
    return (
      <img
        src={`http://localhost:8080/${photo}`}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #CC2027, #8B1520)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36 + 'px', fontWeight: '700', color: 'white',
    }}>
      {initials}
    </div>
  );
}

function MemberPile({ members, max = 5, size = 26 }) {
  const shown = members.slice(0, max);
  const rest  = members.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <div key={m.id} title={m.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i, border: '2px solid white', borderRadius: '50%' }}>
          <Avatar name={m.name} photo={m.photoPath} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: '#F3F4F6', border: '2px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: '700', color: '#6B7280',
          marginLeft: -8, zIndex: 0, flexShrink: 0,
        }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, canEdit, canDelete, onEdit, onDelete, onAddMember, onRemoveMember, eligibleMembers, theme, isDark }) {
  const [open, setOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const isPermanent = team.type === 'PERMANENT';
  const memberIds   = new Set(team.members.map(m => m.id));

  const available = eligibleMembers.filter(u => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setBusy(true);
    try { await onAddMember(team.id, Number(selectedUserId)); setAddingMember(false); setSelectedUserId(''); }
    finally { setBusy(false); }
  };

  const handleRemove = async (userId) => {
    setBusy(true);
    try { await onRemoveMember(team.id, userId); }
    finally { setBusy(false); }
  };

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: '0.85rem',
      backgroundColor: theme.cardBg,
      overflow: 'hidden',
      borderLeft: `4px solid ${isPermanent ? '#CC2027' : '#7C3AED'}`,
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
      >
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: '0.6rem', flexShrink: 0,
          background: isPermanent ? 'rgba(204,32,39,0.1)' : 'rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPermanent ? <Users size={18} color="#CC2027" /> : <GitBranch size={18} color="#7C3AED" />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{team.name}</span>
            <span style={{
              fontSize: '0.62rem', fontWeight: '700', padding: '1px 7px', borderRadius: '9999px',
              background: isPermanent ? 'rgba(204,32,39,0.1)' : 'rgba(124,58,237,0.1)',
              color: isPermanent ? '#CC2027' : '#7C3AED',
              border: `1px solid ${isPermanent ? 'rgba(204,32,39,0.25)' : 'rgba(124,58,237,0.25)'}`,
            }}>
              {isPermanent ? 'Permanent' : 'Project'}
            </span>
            {team.parentTeamName && (
              <span style={{ fontSize: '0.7rem', color: theme.textSub }}>
                ↳ {team.parentTeamName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.2rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={11} />
              {team.manager?.name}
            </span>
            {team.leader && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706' }}>
                <Crown size={11} />
                {team.leader.name}
              </span>
            )}
            <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Member pile */}
        {team.members.length > 0 && <MemberPile members={team.members} />}

        {/* Action buttons */}
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {canEdit && (
              <button
                onClick={() => onEdit(team)}
                title="Edit team"
                style={{
                  padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${theme.borderMed}`, background: theme.cardBg,
                  color: theme.textSub, display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.75rem',
                }}
              >
                <Edit3 size={12} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(team)}
                title="Delete team"
                style={{
                  padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid #FECACA', background: 'rgba(220,38,38,0.06)',
                  color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.75rem',
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '2px' }}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded member list */}
      {open && (
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          padding: '1rem 1.25rem',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
        }}>
          {team.description && (
            <p style={{ fontSize: '0.8rem', color: theme.textSub, marginBottom: '0.75rem', lineHeight: 1.6 }}>
              {team.description}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {team.members.length === 0 && (
              <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>No members yet.</span>
            )}
            {team.members.map(m => {
              const rb = ROLE_BADGE[m.role] || ROLE_BADGE.DEVELOPER;
              const isLeader = team.leader?.id === m.id;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '4px 10px 4px 6px', borderRadius: '9999px',
                  border: `1px solid ${theme.borderMed}`,
                  background: theme.cardBg,
                }}>
                  <Avatar name={m.name} photo={m.photoPath} size={22} />
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: theme.text }}>{m.name}</span>
                  {isLeader && <Crown size={11} color="#D97706" title="Project Leader" />}
                  <span style={{
                    fontSize: '0.6rem', fontWeight: '700', padding: '0 5px',
                    borderRadius: '4px', background: rb.bg, color: rb.color,
                  }}>
                    {rb.label}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={busy}
                      title="Remove from team"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#DC2626', padding: '1px', display: 'flex',
                      }}
                    >
                      <UserMinus size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canEdit && (
            addingMember ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem',
                    border: `1px solid ${theme.borderMed}`, background: theme.inputBg,
                    color: theme.text, outline: 'none',
                  }}
                >
                  <option value="">Select a member…</option>
                  {available.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({ROLE_BADGE[u.role]?.label})</option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={busy || !selectedUserId}
                  style={{
                    padding: '6px 14px', borderRadius: '6px',
                    background: '#CC2027', color: 'white', border: 'none',
                    fontWeight: '700', fontSize: '0.78rem',
                    cursor: busy || !selectedUserId ? 'not-allowed' : 'pointer',
                    opacity: !selectedUserId ? 0.5 : 1,
                  }}
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => { setAddingMember(false); setSelectedUserId(''); }}
                  style={{
                    padding: '6px 10px', borderRadius: '6px',
                    background: 'none', color: theme.textMuted,
                    border: `1px solid ${theme.borderMed}`, cursor: 'pointer', fontSize: '0.78rem',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingMember(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px dashed ${theme.borderMed}`, background: 'none',
                  color: theme.textSub, fontSize: '0.78rem',
                }}
              >
                <UserPlus size={12} /> Add member
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Create / Edit Modal ────────────────────────────────────────────────────────

function TeamModal({ initial, permanentTeams, eligibleMembers, managers, currentUser, isAdminMode, onSave, onClose, theme, isDark }) {
  const isEdit = !!initial?.id;
  const [name,         setName]         = useState(initial?.name || '');
  const [description,  setDescription]  = useState(initial?.description || '');
  const [type,         setType]         = useState(initial?.type || 'PERMANENT');
  const [managerId,    setManagerId]    = useState(initial?.manager?.id || '');
  const [parentTeamId, setParentTeamId] = useState(initial?.parentTeamId || '');
  const [leaderId,     setLeaderId]     = useState(initial?.leader?.id || '');
  const [memberIds,    setMemberIds]    = useState(new Set(initial?.members?.map(m => m.id) || []));
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');

  const parentTeam = permanentTeams.find(t => t.id === Number(parentTeamId));
  const poolMembers = type === 'PROJECT' && parentTeam
    ? parentTeam.members
    : eligibleMembers;

  // The leader candidate list: team members + the manager (can lead their own project)
  const selectedManager = isAdminMode
    ? managers.find(m => m.id === Number(managerId))
    : currentUser;

  const toggleMember = (id) => {
    setMemberIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required');
    if (isAdminMode && !isEdit && !managerId) return setError('You must assign a manager to this team');
    if (type === 'PROJECT' && !parentTeamId) return setError('Select a parent permanent team');
    if (memberIds.size === 0) return setError('At least 1 Developer or Product Team member is required');
    if (type === 'PROJECT' && !leaderId) return setError('A project team must have a designated leader');
    setBusy(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        type,
        managerId: managerId || null,
        parentTeamId: parentTeamId || null,
        leaderId: leaderId || null,
        memberIds: [...memberIds],
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save team');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.cardBg, borderRadius: '1rem',
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          border: `1px solid ${theme.border}`,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`,
        }}>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>
            {isEdit ? 'Edit Team' : 'New Team'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1rem', borderRadius: '0.5rem',
              background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.82rem',
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Manager selector — ADMIN only, required on create */}
          {isAdminMode && !isEdit && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
                Assign Manager <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={managerId}
                onChange={e => { setManagerId(e.target.value); setParentTeamId(''); setMemberIds(new Set()); setLeaderId(''); }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '7px',
                  border: `1.5px solid ${!managerId ? 'rgba(220,38,38,0.4)' : theme.borderMed}`,
                  background: theme.inputBg, color: theme.text,
                  fontSize: '0.85rem', outline: 'none',
                }}
              >
                <option value="">Select an IT Manager…</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.7rem', color: theme.textMuted, marginTop: '0.3rem' }}>
                The assigned manager will own and manage this team.
              </p>
            </div>
          )}

          {/* Show assigned manager on edit (read-only) */}
          {isAdminMode && isEdit && initial?.manager && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '8px 12px', borderRadius: '8px',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
              border: `1px solid ${theme.borderMed}`,
            }}>
              <Shield size={14} color="#D97706" />
              <span style={{ fontSize: '0.82rem', color: theme.textSub }}>Manager:</span>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: theme.text }}>{initial.manager.name}</span>
            </div>
          )}

          {/* Type selector */}
          {!isEdit && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
                Team Type
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['PERMANENT', 'PROJECT'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setParentTeamId(''); setLeaderId(''); setMemberIds(new Set()); }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
                      border: `1.5px solid ${type === t ? (t === 'PERMANENT' ? '#CC2027' : '#7C3AED') : theme.borderMed}`,
                      background: type === t ? (t === 'PERMANENT' ? 'rgba(204,32,39,0.07)' : 'rgba(124,58,237,0.07)') : theme.cardBg,
                      color: type === t ? (t === 'PERMANENT' ? '#CC2027' : '#7C3AED') : theme.textSub,
                      fontWeight: type === t ? '700' : '500', fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {t === 'PERMANENT' ? <Users size={14} /> : <GitBranch size={14} />}
                    {t === 'PERMANENT' ? 'Permanent Team' : 'Project Team'}
                  </button>
                ))}
              </div>
              {type === 'PROJECT' && (
                <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.35rem' }}>
                  Project teams are sub-teams under a permanent team, with an optional designated leader.
                </p>
              )}
            </div>
          )}

          {/* Parent team (PROJECT only) */}
          {type === 'PROJECT' && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
                Parent Permanent Team <span style={{ color: '#DC2626' }}>*</span>
              </label>
              {isAdminMode && !managerId ? (
                <p style={{ fontSize: '0.78rem', color: theme.textMuted }}>Select a manager first to see their teams.</p>
              ) : (
                <select
                  value={parentTeamId}
                  onChange={e => { setParentTeamId(e.target.value); setMemberIds(new Set()); setLeaderId(''); }}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: '7px',
                    border: `1px solid ${theme.borderMed}`, background: theme.inputBg,
                    color: theme.text, fontSize: '0.85rem', outline: 'none',
                  }}
                >
                  <option value="">Select permanent team…</option>
                  {permanentTeams
                    .filter(t => !isAdminMode || t.manager?.id === Number(managerId))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
              Team Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Backend Squad"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: '7px',
                border: `1px solid ${theme.borderMed}`, background: theme.inputBg,
                color: theme.text, fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional team description…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: '7px', resize: 'vertical',
                border: `1px solid ${theme.borderMed}`, background: theme.inputBg,
                color: theme.text, fontSize: '0.85rem', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Leader (PROJECT only — required) */}
          {type === 'PROJECT' && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.4rem' }}>
                Project Leader <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={leaderId}
                onChange={e => setLeaderId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '7px',
                  border: `1.5px solid ${!leaderId ? 'rgba(220,38,38,0.4)' : theme.borderMed}`,
                  background: theme.inputBg, color: theme.text,
                  fontSize: '0.85rem', outline: 'none',
                }}
              >
                <option value="">Select a leader…</option>
                {/* The team's manager can also lead the project */}
                {selectedManager && (
                  <option value={selectedManager.id}>
                    {selectedManager.name} ({isAdminMode ? 'Manager' : 'Manager — you'})
                  </option>
                )}
                {poolMembers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({ROLE_BADGE[u.role]?.label})</option>
                ))}
              </select>
              <p style={{ fontSize: '0.7rem', color: theme.textMuted, marginTop: '0.3rem' }}>
                The manager retains overall responsibility. The leader handles day-to-day project execution.
              </p>
            </div>
          )}

          {/* Members */}
          {poolMembers.length > 0 && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, display: 'block', marginBottom: '0.5rem' }}>
                Members <span style={{ color: '#DC2626' }}>*</span>{' '}
                <span style={{ fontWeight: '400', color: memberIds.size === 0 ? '#DC2626' : theme.textMuted }}>
                  ({memberIds.size === 0 ? 'min. 1 required' : `${memberIds.size} selected`})
                </span>
              </label>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.35rem',
                maxHeight: '180px', overflowY: 'auto',
                border: `1px solid ${theme.borderMed}`, borderRadius: '8px',
                padding: '0.5rem',
              }}>
                {poolMembers.map(u => {
                  const rb = ROLE_BADGE[u.role] || ROLE_BADGE.DEVELOPER;
                  const selected = memberIds.has(u.id);
                  return (
                    <label
                      key={u.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                        background: selected ? (isDark ? 'rgba(204,32,39,0.08)' : '#FFF1F2') : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMember(u.id)}
                        style={{ accentColor: '#CC2027', width: 14, height: 14 }}
                      />
                      <Avatar name={u.name} photo={u.photoPath} size={22} />
                      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '500', color: theme.text }}>{u.name}</span>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: '700', padding: '1px 6px',
                        borderRadius: '4px', background: rb.bg, color: rb.color,
                      }}>
                        {rb.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'PROJECT' && !parentTeamId && (
            <p style={{ fontSize: '0.78rem', color: theme.textMuted, textAlign: 'center' }}>
              Select a parent team to pick members.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: '7px', cursor: 'pointer',
              border: `1px solid ${theme.borderMed}`, background: 'none',
              color: theme.textSub, fontSize: '0.85rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            style={{
              padding: '8px 22px', borderRadius: '7px', cursor: busy ? 'not-allowed' : 'pointer',
              background: '#CC2027', color: 'white', border: 'none',
              fontWeight: '700', fontSize: '0.85rem', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { theme, isDark } = useTheme();
  const { user }          = useAuthStore();

  const [teams,            setTeams]            = useState([]);
  const [eligibleMembers,  setEligibleMembers]  = useState([]);
  const [managers,         setManagers]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [tab,              setTab]              = useState('permanent');
  const [modal,            setModal]            = useState(null); // null | { team? }
  const [confirmDelete,    setConfirmDelete]    = useState(null);

  const isAdmin     = user?.role === 'ADMIN';
  const canCreate   = isAdmin;
  const canDelete   = isAdmin;
  // IT_MANAGER can edit (members, leader) only teams they own; admin can edit any
  const canEditAny  = isAdmin || user?.role === 'IT_MANAGER';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ts, em, mgrs] = await Promise.all([
        teamService.getMyTeams(),
        canEditAny ? teamService.getEligibleMembers() : Promise.resolve([]),
        isAdmin    ? teamService.getManagers()         : Promise.resolve([]),
      ]);
      setTeams(ts);
      setEligibleMembers(em);
      setManagers(mgrs);
    } catch {
      setError('Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }, [canEditAny, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const permanent = teams.filter(t => t.type === 'PERMANENT');
  const project   = teams.filter(t => t.type === 'PROJECT');
  const displayed = tab === 'permanent' ? permanent : project;

  // Permanent teams available for the modal's parent-team picker
  // Admin: pass all so the modal can filter by selected manager
  // IT_MANAGER: only their own
  const myPermanent = isAdmin
    ? permanent
    : permanent.filter(t => t.manager?.name === user?.name);

  const handleSave = async (data) => {
    if (modal.team) {
      await teamService.updateTeam(modal.team.id, data);
    } else {
      await teamService.createTeam(data);
    }
    await load();
  };

  const handleDelete = async (team) => {
    try {
      await teamService.deleteTeam(team.id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete team');
    }
  };

  const handleAddMember = async (teamId, userId) => {
    await teamService.addMember(teamId, userId);
    await load();
  };

  const handleRemoveMember = async (teamId, userId) => {
    await teamService.removeMember(teamId, userId);
    await load();
  };

  return (
    <PageWrapper
      title="Teams"
      subtitle="Manage permanent teams and project sub-teams"
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'permanent', label: 'Permanent Teams', icon: Users,      count: permanent.length },
          { key: 'project',   label: 'Project Teams',  icon: GitBranch,   count: project.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
              border: `1.5px solid ${tab === key ? (key === 'permanent' ? '#CC2027' : '#7C3AED') : theme.borderMed}`,
              background: tab === key ? (key === 'permanent' ? '#CC2027' : '#7C3AED') : theme.cardBg,
              color: tab === key ? 'white' : theme.textMed,
              fontSize: '0.82rem', fontWeight: '600',
            }}
          >
            <Icon size={14} />
            {label}
            <span style={{
              padding: '1px 7px', borderRadius: '9999px', fontSize: '0.68rem',
              background: tab === key ? 'rgba(255,255,255,0.25)' : theme.hoverBg,
              color: tab === key ? 'white' : theme.textSub,
            }}>
              {count}
            </span>
          </button>
        ))}

        <button
          onClick={load}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '7px 14px', borderRadius: '8px',
            border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
            color: theme.textMed, fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>

        {canCreate && (
          <button
            onClick={() => setModal({})}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 18px', borderRadius: '8px', cursor: 'pointer',
              background: '#CC2027', color: 'white', border: 'none',
              fontWeight: '700', fontSize: '0.82rem',
            }}
          >
            <Plus size={14} /> New Team
          </button>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', fontSize: '0.82rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
          Loading teams…
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3.5rem',
          border: `1px dashed ${theme.border}`, borderRadius: '0.85rem',
          color: theme.textMuted, fontSize: '0.875rem',
        }}>
          {tab === 'permanent'
            ? canCreate ? 'No permanent teams yet. Create one to get started.' : 'You are not part of any team yet.'
            : canCreate ? 'No project teams yet. Create one from a permanent team.' : 'No project teams visible.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayed.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              canEdit={canEditAny && (isAdmin || team.manager?.name === user?.name)}
              canDelete={canDelete}
              onEdit={t => setModal({ team: t })}
              onDelete={t => setConfirmDelete(t)}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              eligibleMembers={eligibleMembers}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <TeamModal
          initial={modal.team || null}
          permanentTeams={myPermanent}
          eligibleMembers={eligibleMembers}
          managers={managers}
          currentUser={user}
          isAdminMode={isAdmin}
          onSave={handleSave}
          onClose={() => setModal(null)}
          theme={theme}
          isDark={isDark}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: theme.cardBg, borderRadius: '0.85rem',
              padding: '1.5rem', maxWidth: '400px', width: '100%',
              border: `1px solid ${theme.border}`,
              boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: theme.text, marginBottom: '0.5rem' }}>
              Delete "{confirmDelete.name}"?
            </h3>
            <p style={{ fontSize: '0.82rem', color: theme.textSub, marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {confirmDelete.type === 'PERMANENT'
                ? 'This will also delete all project sub-teams under it. This action cannot be undone.'
                : 'This project team will be permanently removed.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '7px 16px', borderRadius: '7px', cursor: 'pointer',
                  border: `1px solid ${theme.borderMed}`, background: 'none',
                  color: theme.textSub, fontSize: '0.82rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  padding: '7px 18px', borderRadius: '7px', cursor: 'pointer',
                  background: '#DC2626', color: 'white', border: 'none',
                  fontWeight: '700', fontSize: '0.82rem',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
