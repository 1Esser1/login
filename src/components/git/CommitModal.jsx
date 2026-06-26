import { useState, useRef } from 'react';
import { X, Trash2, GitFork, GitBranch, Loader2, AlertCircle, Upload, FolderOpen } from 'lucide-react';
import gitService from '../../services/gitService';

const PROVIDER_LABELS = { github: 'GitHub', gitlab: 'GitLab' };

// Directories and file patterns to skip — mirrors a typical .gitignore
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'target', 'build', 'dist', 'out', '.next', '.nuxt',
  '__pycache__', '.pytest_cache', 'venv', '.venv', 'env', '.env',
  'vendor', 'coverage', '.nyc_output', '.cache', '.parcel-cache',
  '.gradle', '.idea', '.vscode', '.mvn',
  'bin', 'obj',            // .NET
  '.terraform',
]);

const IGNORED_EXTENSIONS = new Set([
  '.class', '.jar', '.war', '.ear',           // Java compiled
  '.pyc', '.pyo',                             // Python compiled
  '.o', '.obj', '.so', '.dll', '.exe',        // native binaries
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp4', '.mp3', '.wav', '.ogg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.DS_Store', '.lock',                       // system / lock files
  '.min.js', '.min.css',                      // minified (use extension check below)
]);

const IGNORED_FILENAMES = new Set([
  '.DS_Store', 'Thumbs.db', 'desktop.ini',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
  '.gitignore', '.gitattributes', '.editorconfig',
]);

function shouldIgnore(path) {
  const parts = path.split('/');
  // Skip if any path segment is an ignored directory
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRS.has(part) || part.startsWith('.')) return true;
  }
  const filename = parts[parts.length - 1];
  if (IGNORED_FILENAMES.has(filename)) return true;
  // Extension check
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = filename.slice(dotIdx).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) return true;
  }
  // Minified files
  if (filename.endsWith('.min.js') || filename.endsWith('.min.css')) return true;
  return false;
}

// Read a File object as UTF-8 text
const readAsText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject();
    r.readAsText(file);
  });

// Recursively collect files from a FileSystemDirectoryEntry
const collectFromEntry = async (entry, basePath = '') => {
  if (entry.isFile) {
    const file = await new Promise(res => entry.file(res));
    return [{ file, path: basePath + entry.name }];
  }
  if (entry.isDirectory) {
    // Skip ignored directories early (no need to recurse into node_modules)
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) return [];
    const reader = entry.createReader();
    const allEntries = [];
    let batch;
    do {
      batch = await new Promise(res => reader.readEntries(res));
      allEntries.push(...batch);
    } while (batch.length > 0);
    const nested = await Promise.all(
      allEntries.map(child => collectFromEntry(child, basePath + entry.name + '/'))
    );
    return nested.flat();
  }
  return [];
};

function CommitModal({ subtask, subtaskIds, repoName, repoBranch, provider, taskTitle, onSuccess, onClose }) {
  const isBulk = !subtask && subtaskIds?.length > 0;
  const defaultMsg = subtask
    ? `feat: ${subtask.title}`
    : `feat: complete ${taskTitle || 'all subtasks'}`;

  const [files, setFiles]           = useState([]);
  const [commitMessage, setCommitMessage] = useState(defaultMsg);
  const [committing, setCommitting] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  const [error, setError]           = useState('');
  const [dragging, setDragging]     = useState(false);
  const [stats, setStats]           = useState({ binary: 0, ignored: 0, empty: 0 });

  const fileInputRef   = useRef(null);
  const folderInputRef = useRef(null);

  const branch = repoBranch || 'main';

  const removeFile = (i) =>
    setFiles(prev => prev.filter((_, idx) => idx !== i));

  const updateFile = (i, field, value) =>
    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));

  // Ingest an array of { file: File, path: string }
  const ingestItems = async (items) => {
    setLoading(true);
    setError('');
    let binary = 0, ignored = 0, empty = 0;
    const results = [];
    let processed = 0;

    for (const { file, path } of items) {
      processed++;
      if (processed % 20 === 0) setLoadProgress(`Reading… ${processed}/${items.length}`);

      const cleanPath = path.replace(/\\/g, '/');

      if (shouldIgnore(cleanPath)) { ignored++; continue; }

      try {
        const content = await readAsText(file);
        if (content.includes('\0')) { binary++; continue; }   // binary
        if (!content.trim())        { empty++;  continue; }   // empty file
        results.push({ path: cleanPath, content, action: 'update' });
      } catch {
        binary++;
      }
    }

    setStats(s => ({ binary: s.binary + binary, ignored: s.ignored + ignored, empty: s.empty + empty }));
    setFiles(prev => [...prev, ...results]);
    setLoadProgress('');
    setLoading(false);
  };

  const handleFileInput = async (e) => {
    const picked = Array.from(e.target.files).map(f => ({ file: f, path: f.name }));
    e.target.value = '';
    await ingestItems(picked);
  };

  const handleFolderInput = async (e) => {
    const picked = Array.from(e.target.files).map(f => {
      const rel = f.webkitRelativePath || f.name;
      const path = rel.includes('/') ? rel.slice(rel.indexOf('/') + 1) : rel;
      return { file: f, path };
    });
    e.target.value = '';
    await ingestItems(picked);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const collected = [];
    for (const item of items) {
      if (!item.webkitGetAsEntry) {
        const f = item.getAsFile();
        if (f) collected.push({ file: f, path: f.name });
        continue;
      }
      const entry = item.webkitGetAsEntry();
      if (!entry) continue;
      if (entry.isFile) {
        const f = item.getAsFile();
        if (f) collected.push({ file: f, path: f.name });
      } else {
        const inner = await collectFromEntry(entry);
        inner.forEach(({ file, path }) => {
          // Strip top-level folder name from dropped folder
          const stripped = path.includes('/') ? path.slice(path.indexOf('/') + 1) : path;
          collected.push({ file, path: stripped });
        });
      }
    }
    await ingestItems(collected);
  };

  const handleCommit = async () => {
    if (files.length === 0)              { setError('Add at least one file.'); return; }
    if (files.some(f => !f.path.trim())) { setError('All files need a path.'); return; }
    if (!commitMessage.trim())            { setError('Commit message is required.'); return; }

    setCommitting(true);
    setError('');
    try {
      const response = await gitService.commitFiles({
        subtaskId:  subtask?.id  ?? null,
        subtaskIds: isBulk ? subtaskIds : null,
        repoName, branch, provider, commitMessage,
        files: files.map(f => ({ path: f.path.trim(), content: f.content, action: f.action })),
      });
      onSuccess(response);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Commit failed. Check that the repo exists and your token has write access.');
      setCommitting(false);
    }
  };

  const totalSkipped = stats.binary + stats.ignored + stats.empty;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '2rem 1rem', overflowY: 'auto',
    }}>
      <input ref={fileInputRef}   type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
      <input ref={folderInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFolderInput}
             {...{ webkitdirectory: '', directory: '' }} />

      <div style={{
        backgroundColor: 'white', borderRadius: '0.875rem',
        width: '100%', maxWidth: '700px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #F0F0F0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <GitFork size={16} color="#1A1A2E" />
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
                {isBulk ? 'Push All Completed Subtasks' : 'Commit Code'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: '600', color: '#374151',
                backgroundColor: '#F3F4F6', padding: '0.15rem 0.5rem', borderRadius: '0.3rem',
                fontFamily: 'monospace',
              }}>{repoName}</span>
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>→</span>
              <span style={{
                fontSize: '0.72rem', fontWeight: '600', color: '#2563EB',
                backgroundColor: '#EFF6FF', padding: '0.15rem 0.5rem', borderRadius: '0.3rem',
              }}>
                <GitBranch size={10} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                {branch}
              </span>
              <span style={{
                fontSize: '0.68rem', color: '#6B7280',
                backgroundColor: '#F9FAFB', padding: '0.15rem 0.5rem', borderRadius: '0.3rem',
              }}>via {PROVIDER_LABELS[provider] || provider}</span>
            </div>
            {subtask && (
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.3rem' }}>
                Subtask: <strong>{subtask.title}</strong>
              </p>
            )}
            {isBulk && (
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.3rem' }}>
                {subtaskIds.length} done subtask{subtaskIds.length !== 1 ? 's' : ''} will be marked as committed
              </p>
            )}
          </div>
          <button onClick={onClose} disabled={committing} style={{
            border: 'none', background: 'none', cursor: committing ? 'not-allowed' : 'pointer',
            color: '#9CA3AF', padding: '0.25rem', flexShrink: 0,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* ── File picker area ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F0F0F0' }}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? '#1A1A2E' : '#D1D5DB'}`,
              borderRadius: '0.75rem', padding: '1.25rem 1rem',
              textAlign: 'center', marginBottom: '0.875rem',
              backgroundColor: dragging ? '#F3F4F6' : '#FAFAFA',
              transition: 'all 0.15s',
            }}
          >
            <Upload size={20} color={dragging ? '#1A1A2E' : '#9CA3AF'} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.82rem', fontWeight: '600', color: '#374151', marginBottom: '0.625rem' }}>
              {dragging ? 'Release to add files' : 'Drop your project folder or files here'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => folderInputRef.current?.click()}
                disabled={committing || loading} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 1rem', borderRadius: '0.45rem',
                  border: 'none', backgroundColor: '#1A1A2E',
                  color: 'white', fontSize: '0.8rem', fontWeight: '600',
                  cursor: committing || loading ? 'not-allowed' : 'pointer',
                }}>
                <FolderOpen size={14} /> Select project folder
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={committing || loading} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 1rem', borderRadius: '0.45rem',
                  border: '1px solid #D1D5DB', backgroundColor: 'white',
                  color: '#374151', fontSize: '0.8rem', fontWeight: '500',
                  cursor: committing || loading ? 'not-allowed' : 'pointer',
                }}>
                Select individual files
              </button>
            </div>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
              node_modules, target, .git, build artefacts and binaries are skipped automatically
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {loadProgress || 'Reading files…'}
            </div>
          )}

          {/* Skipped summary */}
          {totalSkipped > 0 && (
            <div style={{
              padding: '0.4rem 0.75rem', borderRadius: '0.4rem', marginBottom: '0.5rem',
              backgroundColor: '#F8F9FB', border: '1px solid #E5E7EB',
              fontSize: '0.72rem', color: '#6B7280',
              display: 'flex', gap: '1rem', flexWrap: 'wrap',
            }}>
              {stats.ignored > 0 && <span>⊘ {stats.ignored} ignored paths (node_modules, target…)</span>}
              {stats.binary  > 0 && <span>⊘ {stats.binary} binary files</span>}
              {stats.empty   > 0 && <span>⊘ {stats.empty} empty files</span>}
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {files.length} file{files.length !== 1 ? 's' : ''} queued
                </span>
                <button type="button" onClick={() => { setFiles([]); setStats({ binary: 0, ignored: 0, empty: 0 }); }}
                  disabled={committing} style={{
                    fontSize: '0.72rem', color: '#DC2626', background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}>
                  Clear all
                </button>
              </div>

              {/* Large commit warning */}
              {files.length > 200 && (
                <div style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.4rem', marginBottom: '0.5rem',
                  backgroundColor: '#FFF7ED', border: '1px solid #FDE68A',
                  fontSize: '0.73rem', color: '#92400E',
                  display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                }}>
                  <AlertCircle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    {files.length} files is a very large commit — GitHub/GitLab APIs may reject it.
                    Consider committing only the files changed for this specific subtask.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
                {files.map((file, i) => (
                  <div key={i} style={{
                    border: '1px solid #E5E7EB', borderRadius: '0.5rem',
                    overflow: 'hidden', backgroundColor: 'white',
                  }}>
                    {/* Path row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.625rem',
                      backgroundColor: '#F8F9FB',
                    }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', flexShrink: 0, fontWeight: '600' }}>PATH</span>
                      <input
                        type="text"
                        value={file.path}
                        onChange={e => updateFile(i, 'path', e.target.value)}
                        disabled={committing}
                        style={{
                          flex: 1, border: 'none', outline: 'none', fontSize: '0.78rem',
                          fontFamily: 'monospace', color: '#111827', backgroundColor: 'transparent',
                        }}
                      />
                      <div style={{ display: 'flex', borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                        {['update', 'create'].map(action => (
                          <button key={action} onClick={() => updateFile(i, 'action', action)} disabled={committing} style={{
                            padding: '0.15rem 0.4rem', border: 'none', fontSize: '0.6rem', fontWeight: '600',
                            cursor: committing ? 'not-allowed' : 'pointer',
                            backgroundColor: file.action === action ? '#1A1A2E' : 'white',
                            color: file.action === action ? 'white' : '#9CA3AF',
                          }}>
                            {action === 'update' ? 'Update' : 'New'}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeFile(i)} disabled={committing} style={{
                        border: 'none', background: 'none', color: '#DC2626',
                        cursor: committing ? 'not-allowed' : 'pointer', padding: '0.1rem', flexShrink: 0,
                      }}>
                        <X size={12} />
                      </button>
                    </div>

                    {/* Content — collapsed by default */}
                    <details>
                      <summary style={{
                        padding: '0.3rem 0.625rem', cursor: 'pointer',
                        fontSize: '0.68rem', color: '#9CA3AF', userSelect: 'none',
                        listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        <span style={{ fontSize: '0.6rem' }}>▶</span>
                        {file.content.split('\n').length} lines — click to preview / edit
                      </summary>
                      <textarea
                        value={file.content}
                        onChange={e => updateFile(i, 'content', e.target.value)}
                        disabled={committing}
                        rows={10}
                        style={{
                          width: '100%', padding: '0.625rem', border: 'none', outline: 'none',
                          fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: '1.55',
                          backgroundColor: '#FAFAFA', color: '#111827', resize: 'vertical',
                          boxSizing: 'border-box', borderTop: '1px solid #F3F4F6',
                        }}
                      />
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Commit message ── */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F0F0F0' }}>
          <label style={{
            display: 'block', fontSize: '0.75rem', fontWeight: '700',
            color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem',
          }}>
            Commit Message
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            disabled={committing}
            style={{
              width: '100%', padding: '0.6rem 0.875rem',
              border: '1.5px solid #E5E7EB', borderRadius: '0.5rem',
              fontSize: '0.85rem', fontFamily: 'monospace', color: '#111827',
              backgroundColor: 'white', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#CC2027'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            margin: '0 1.5rem', marginTop: '0.875rem',
            padding: '0.75rem 1rem', borderRadius: '0.5rem',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          }}>
            <AlertCircle size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '0.78rem', color: '#DC2626', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
          <button onClick={onClose} disabled={committing} style={{
            padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
            border: '1px solid #E5E7EB', backgroundColor: 'white',
            color: '#374151', fontSize: '0.85rem', fontWeight: '500',
            cursor: committing ? 'not-allowed' : 'pointer', opacity: committing ? 0.6 : 1,
          }}>
            Cancel
          </button>
          <button onClick={handleCommit} disabled={committing || loading || files.length === 0} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1.5rem', borderRadius: '0.5rem', border: 'none',
            backgroundColor: committing || loading || files.length === 0 ? '#9CA3AF' : '#1A1A2E',
            color: 'white', fontSize: '0.85rem', fontWeight: '600',
            cursor: committing || loading || files.length === 0 ? 'not-allowed' : 'pointer',
          }}>
            {committing
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Pushing…</>
              : <><GitFork size={14} /> Commit & Push ({files.length})</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitModal;
