import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, FileText, Download,
  CheckCircle, AlertCircle, Clock, Users, BarChart3, Sparkles,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import api from '../services/api';
import sprintService from '../services/sprintService';
import slaService from '../services/slaService';
import useAuthStore from '../store/authStore';
import { useAutoT } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STRINGS = {
  page_title:      'Reports & Exports',
  page_subtitle:   'Generate and download management reports from live data',
  section_docs:    'Document Reports',
  section_csv:     'Data Exports — CSV',
  ai_title:        'AI Management Report',
  ai_badge:        'AI · PDF',
  ai_desc:         'Full presentation-quality report with AI narrative',
  includes:        'Includes',
  generate:        'Generate Report',
  generating:      'Generating…',
  ai_i1:           'AI-generated executive summary & key insights',
  ai_i2:           'Task priority ranking (top scored)',
  ai_i3:           'Active sprint status & subtasks',
  ai_i4:           'SLA compliance per workplace',
  ai_i5:           'Team workload distribution',
  excel_title:     'Full Backlog',
  excel_desc:      'Raw data export for Excel or Power BI',
  excel_btn:       'Export Excel',
  excel_i1:        'All scored tasks ranked by final score',
  excel_i2:        'Kano category & MoSCoW label',
  excel_i3:        'RICE score breakdown (Reach, Impact, Confidence, Effort)',
  excel_i4:        'Submission date & submitter name',
  pdf_title:       'Management PDF',
  pdf_desc:        'Presentation-ready report for stakeholders',
  pdf_btn:         'Export PDF',
  pdf_i1:          'Executive task priority list by final score',
  pdf_i2:          'Kano & MoSCoW labels per task',
  pdf_i3:          'Full RICE scoring data',
  pdf_i4:          'Attijari Bank branding & generation timestamp',
  sprint_title:    'Sprint Report',
  sprint_desc:     'Current active sprint subtasks by status',
  sprint_btn:      'Export Sprint CSV',
  sprint_i1:       'All subtasks from active workplaces',
  sprint_i2:       'Status (To Do / In Progress / Done)',
  sprint_i3:       'Complexity & estimated hours',
  sprint_i4:       'Assignee, Jira key, commit status',
  sla_title:       'SLA & Deadlines',
  sla_desc:        'Deadline compliance across all workplaces',
  sla_btn:         'Export SLA CSV',
  sla_i1:          'SLA status per workplace (On Track / At Risk / Overdue)',
  sla_i2:          'Due date & days remaining or overdue',
  sla_i3:          'Subtask progress percentage',
  sla_i4:          'Assignee & workplace status',
  workload_title:  'Team Workload',
  workload_desc:   'Sprint workload distribution by member',
  workload_btn:    'Export Workload CSV',
  workload_i1:     'Estimated hours per team member',
  workload_i2:     'Subtask count by status (To Do / In Progress / Done)',
  workload_i3:     'Complexity breakdown (Low / Medium / High)',
  workload_i4:     'All DEVELOPER & PRODUCT_TEAM members',
  footer:          'All reports reflect live database state — no files are cached on the server. CSV files open directly in Excel or Google Sheets.',
  success:         'File downloaded successfully.',
  error:           'Export failed — make sure the backend is running.',
};

// ── CSV helper ────────────────────────────────────────────────────────────────

function downloadCSV(filename, headers, rows) {
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Notification ──────────────────────────────────────────────────────────────

function Toast({ notification }) {
  if (!notification) return null;
  const ok = notification.type === 'success';
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1000,
      maxWidth: '360px', padding: '1rem 1.25rem',
      backgroundColor: ok ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`,
      borderRadius: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
    }}>
      {ok
        ? <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0 }} />
        : <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />}
      <p style={{ fontSize: '0.85rem', fontWeight: '500', color: ok ? '#16A34A' : '#DC2626' }}>
        {notification.message}
      </p>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ icon: Icon, iconBg, iconColor, title, badge, description, included, includesLabel, generatingLabel, btnLabel, btnColor, loading, onClick }) {
  const { theme } = useTheme();
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.375rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '0.625rem',
          backgroundColor: iconBg, border: `1px solid ${iconColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{title}</h3>
            {badge && (
              <span style={{
                fontSize: '0.6rem', fontWeight: '700', padding: '0.15rem 0.45rem',
                borderRadius: '9999px', backgroundColor: theme.tagBg,
                color: theme.textSub, border: `1px solid ${theme.borderMed}`,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{badge}</span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>{description}</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.125rem 1.375rem', flex: 1 }}>
        <p style={{ fontSize: '0.68rem', fontWeight: '700', color: theme.textMed, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          {includesLabel || 'Includes'}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.125rem 0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {included.map(item => (
            <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
              <span style={{ color: iconColor, fontSize: '0.65rem', marginTop: '0.15rem' }}>✓</span>
              <span style={{ fontSize: '0.775rem', color: theme.textSub }}>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onClick}
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.5rem',
            padding: '0.65rem', borderRadius: '0.5rem', border: 'none',
            backgroundColor: loading ? '#9CA3AF' : btnColor,
            color: 'white', fontSize: '0.825rem', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          <Download size={14} />
          {loading ? (generatingLabel || 'Generating…') : btnLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Export() {
  const tx        = useAutoT(STRINGS);
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { theme } = useTheme();
  const isManager = user?.role === 'IT_MANAGER' || user?.role === 'ADMIN';

  const [loading, setLoading]           = useState({});
  const [notification, setNotification] = useState(null);

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Backend blob downloads ──────────────────────────────────────────────────

  const blobDownload = async (key, url, filename) => {
    setLoad(key, true);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const href = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = href; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(href);
      notify(tx.success);
    } catch {
      notify(tx.error, 'error');
    } finally {
      setLoad(key, false);
    }
  };

  // ── CSV exports (client-side) ───────────────────────────────────────────────

  const exportSprint = async () => {
    setLoad('sprint', true);
    try {
      const data = await sprintService.getBoard();
      const subtasks = data.subtasks || [];
      downloadCSV('sprint-report',
        ['ID', 'Title', 'Task', 'Status', 'Complexity', 'Est. Hours', 'Assignee', 'Role', 'Jira Key', 'Code Committed', 'Started At', 'Completed At'],
        subtasks.map(s => [
          s.id, s.title, s.taskTitle, s.status, s.complexity ?? '',
          s.estimatedHours ?? '', s.submittedByName ?? '', s.submittedByRole ?? '',
          s.jiraIssueKey ?? '', s.codeCommitted ? 'Yes' : 'No',
          s.startedAt ?? '', s.completedAt ?? '',
        ])
      );
      notify(`Sprint report exported — ${subtasks.length} subtasks.`);
    } catch {
      notify('Failed to export sprint report.', 'error');
    } finally {
      setLoad('sprint', false);
    }
  };

  const exportSla = async () => {
    setLoad('sla', true);
    try {
      const items = await slaService.getAll();
      downloadCSV('sla-report',
        ['Task', 'Type', 'Assignee', 'Role', 'Workplace Status', 'Progress %', 'Total Subtasks', 'Done', 'Due Date', 'SLA Status', 'Days Remaining'],
        items.map(i => [
          i.taskTitle, i.taskType ?? '', i.assigneeName ?? '', i.assigneeRole ?? '',
          i.workplaceStatus, i.progressPercent, i.totalSubtasks, i.doneSubtasks,
          i.dueDate ?? 'No deadline', i.slaStatus,
          i.daysRemaining != null ? i.daysRemaining : '',
        ])
      );
      notify(`SLA report exported — ${items.length} workplaces.`);
    } catch {
      notify('Failed to export SLA report.', 'error');
    } finally {
      setLoad('sla', false);
    }
  };

  const exportWorkload = async () => {
    setLoad('workload', true);
    try {
      const data = await sprintService.getWorkload();
      const members = data.members || [];
      downloadCSV('team-workload-report',
        ['Member', 'Role', 'Est. Hours', 'To Do', 'In Progress', 'Done', 'Low Complexity', 'Medium Complexity', 'High Complexity', 'Total Active Subtasks'],
        members.map(m => [
          m.name, m.role, m.totalEstimatedHours,
          m.todoCount, m.inProgressCount, m.doneCount,
          m.lowCount, m.mediumCount, m.highCount,
          m.todoCount + m.inProgressCount + m.doneCount,
        ])
      );
      notify(`Workload report exported — ${members.length} members.`);
    } catch {
      notify('Failed to export workload report.', 'error');
    } finally {
      setLoad('workload', false);
    }
  };

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>
      <Toast notification={notification} />

      {/* Section: Document Reports */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: '3px', height: '16px', backgroundColor: '#CC2027', borderRadius: '9999px' }} />
          <p style={{ fontSize: '0.72rem', fontWeight: '700', color: theme.textMed, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tx.section_docs}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {isManager && (
            <div style={{ backgroundColor: '#1A1A2E', borderRadius: '0.75rem', border: '1px solid rgba(204,32,39,0.3)', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.25rem 1.375rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '0.625rem', backgroundColor: 'rgba(204,32,39,0.15)', border: '1px solid rgba(204,32,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} color="#CC2027" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>{tx.ai_title}</h3>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '9999px', backgroundColor: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.ai_badge}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{tx.ai_desc}</p>
                </div>
              </div>
              <div style={{ padding: '1.125rem 1.375rem', flex: 1 }}>
                <p style={{ fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{tx.includes}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.125rem 0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {[tx.ai_i1, tx.ai_i2, tx.ai_i3, tx.ai_i4, tx.ai_i5].map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                      <span style={{ color: '#CC2027', fontSize: '0.65rem', marginTop: '0.15rem' }}>✓</span>
                      <span style={{ fontSize: '0.775rem', color: '#6B7280' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/report')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#CC2027', color: 'white', fontSize: '0.825rem', fontWeight: '600', cursor: 'pointer' }}>
                  <Sparkles size={14} /> {tx.generate}
                </button>
              </div>
            </div>
          )}
          <ReportCard
            icon={FileSpreadsheet} iconBg="#F0FDF4" iconColor="#16A34A"
            title={tx.excel_title} badge=".xlsx"
            description={tx.excel_desc}
            includesLabel={tx.includes}
          generatingLabel={tx.generating}
            included={[tx.excel_i1, tx.excel_i2, tx.excel_i3, tx.excel_i4]}
            btnLabel={tx.excel_btn} btnColor="#16A34A"
            loading={loading.excel}
            onClick={() => blobDownload('excel', '/api/export/excel', `priorit-backlog-${new Date().toISOString().split('T')[0]}.xlsx`)}
          />
          <ReportCard
            icon={FileText} iconBg="#FEF2F2" iconColor="#CC2027"
            title={tx.pdf_title} badge=".pdf"
            description={tx.pdf_desc}
            includesLabel={tx.includes}
          generatingLabel={tx.generating}
            included={[tx.pdf_i1, tx.pdf_i2, tx.pdf_i3, tx.pdf_i4]}
            btnLabel={tx.pdf_btn} btnColor="#CC2027"
            loading={loading.pdf}
            onClick={() => blobDownload('pdf', '/api/export/pdf', `priorit-report-${new Date().toISOString().split('T')[0]}.pdf`)}
          />
        </div>
      </div>

      {/* Section: Data Exports */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ width: '3px', height: '16px', backgroundColor: '#2563EB', borderRadius: '9999px' }} />
        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: theme.textMed, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tx.section_csv}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <ReportCard
          icon={BarChart3} iconBg="#EFF6FF" iconColor="#2563EB"
          title={tx.sprint_title} badge=".csv"
          description={tx.sprint_desc}
          includesLabel={tx.includes}
          generatingLabel={tx.generating}
          included={[tx.sprint_i1, tx.sprint_i2, tx.sprint_i3, tx.sprint_i4]}
          btnLabel={tx.sprint_btn} btnColor="#2563EB"
          loading={loading.sprint}
          onClick={exportSprint}
        />
        <ReportCard
          icon={Clock} iconBg="#FFF7ED" iconColor="#D97706"
          title={tx.sla_title} badge=".csv"
          description={tx.sla_desc}
          includesLabel={tx.includes}
          generatingLabel={tx.generating}
          included={[tx.sla_i1, tx.sla_i2, tx.sla_i3, tx.sla_i4]}
          btnLabel={tx.sla_btn} btnColor="#D97706"
          loading={loading.sla}
          onClick={exportSla}
        />
        {isManager && (
          <ReportCard
            icon={Users} iconBg="#F5F3FF" iconColor="#7C3AED"
            title={tx.workload_title} badge=".csv"
            description={tx.workload_desc}
            includesLabel={tx.includes}
          generatingLabel={tx.generating}
            included={[tx.workload_i1, tx.workload_i2, tx.workload_i3, tx.workload_i4]}
            btnLabel={tx.workload_btn} btnColor="#7C3AED"
            loading={loading.workload}
            onClick={exportWorkload}
          />
        )}
      </div>

      {/* Footer note */}
      <div style={{ padding: '0.875rem 1.25rem', backgroundColor: theme.hoverBg, borderRadius: '0.625rem', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckCircle size={13} color={theme.textMuted} />
        <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>{tx.footer}</p>
      </div>
    </PageWrapper>
  );
}
