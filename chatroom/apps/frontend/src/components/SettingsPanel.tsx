import '../styles/components/SettingsPanel.css';
import { useState, useEffect, useCallback } from 'react';
import { useAgentStore } from '../stores/agent-store';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const USER_NAME: string = import.meta.env.VITE_USER_NAME ?? 'Bex';

async function getAuthToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: USER_NAME }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

type Tab = 'repo' | 'setup' | 'settings';

interface CheckResult {
  ok: boolean;
  version: string;
}

interface SetupResult {
  bun: CheckResult;
  claude: CheckResult;
  plugins: { ok: boolean; count: number };
}

interface SettingsPanelProps {
  onClose: () => void;
  initialTab?: Tab;
}

export function SettingsPanel({ onClose, initialTab = 'repo' }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const room = useAgentStore((s) => s.room);

  // ── Repo tab state ──
  const [cwdInput, setCwdInput] = useState('');
  const [cwdFeedback, setCwdFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cwdSaving, setCwdSaving] = useState(false);

  // Pre-fill input with current cwd when panel opens or room changes
  useEffect(() => {
    setCwdInput(room?.cwd ?? '');
    setCwdFeedback(null);
  }, [room?.cwd]);

  const saveCwd = useCallback(async (path: string) => {
    if (!room) return;
    setCwdFeedback(null);
    setCwdSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setCwdFeedback({ msg: 'No se pudo obtener token de auth', ok: false });
        return;
      }
      const res = await fetch(`/api/rooms/${room.id}/cwd`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cwd: path }),
      });
      if (res.ok) {
        const data = (await res.json()) as { cwd: string | null };
        setCwdInput(data.cwd ?? '');
        setCwdFeedback({ msg: data.cwd ? `Proyecto: ${data.cwd.split('/').pop() || data.cwd}` : 'Proyecto guardado', ok: true });
      } else {
        const err = (await res.json()) as { error: string };
        setCwdFeedback({ msg: err.error ?? 'Error al guardar', ok: false });
      }
    } catch {
      setCwdFeedback({ msg: 'Error de red', ok: false });
    } finally {
      setCwdSaving(false);
    }
  }, [room]);

  const handlePickFolder = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, title: 'Seleccionar proyecto' });
      if (typeof selected === 'string' && selected) {
        setCwdInput(selected);
        void saveCwd(selected);
      }
    } catch {
      setCwdFeedback({ msg: 'No se pudo abrir el selector de carpetas', ok: false });
    }
  }, [saveCwd]);

  const handleSaveCwd = useCallback(async () => {
    void saveCwd(cwdInput.trim());
  }, [saveCwd, cwdInput]);

  // ── Setup tab state ──
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const runSetupCheck = useCallback(async () => {
    setSetupLoading(true);
    setSetupResult(null);
    try {
      const res = await fetch('/api/setup/validate');
      if (res.ok) {
        const data = (await res.json()) as SetupResult;
        setSetupResult(data);
      }
    } catch {
      // network error — leave result null
    } finally {
      setSetupLoading(false);
    }
  }, []);

  // Auto-run checks when switching to setup tab
  useEffect(() => {
    if (tab === 'setup' && !setupResult && !setupLoading) {
      void runSetupCheck();
    }
  }, [tab, setupResult, setupLoading, runSetupCheck]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentCwd = room?.cwd ?? null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="settings-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button className={`settings-tab${tab === 'repo' ? ' active' : ''}`} type="button" onClick={() => setTab('repo')}>Repo</button>
          <button className={`settings-tab${tab === 'setup' ? ' active' : ''}`} type="button" onClick={() => setTab('setup')}>Setup</button>
          <button className={`settings-tab${tab === 'settings' ? ' active' : ''}`} type="button" onClick={() => setTab('settings')}>General</button>
        </div>

        {/* Body */}
        <div className="settings-body">
          {tab === 'repo' && (
            <div>
              <div className="settings-field">
                <label className="settings-label">Proyecto actual</label>
                <div className="settings-current">
                  {currentCwd
                    ? <strong>{currentCwd.split('/').pop() || currentCwd}</strong>
                    : <span className="settings-no-project">Sin proyecto seleccionado</span>}
                </div>
              </div>

              {isTauri ? (
                /* Tauri: native folder picker — auto-saves on selection */
                <div className="settings-actions">
                  <button
                    className="settings-btn settings-btn-primary"
                    type="button"
                    onClick={() => void handlePickFolder()}
                    disabled={cwdSaving}
                  >
                    {cwdSaving ? 'Guardando…' : 'Seleccionar proyecto'}
                  </button>
                </div>
              ) : (
                /* Web fallback: text input */
                <>
                  <div className="settings-field">
                    <input
                      className="settings-input"
                      type="text"
                      placeholder="/ruta/absoluta/al/proyecto"
                      value={cwdInput}
                      onChange={(e) => { setCwdInput(e.target.value); setCwdFeedback(null); }}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="settings-actions">
                    <button
                      className="settings-btn settings-btn-primary"
                      type="button"
                      onClick={() => void handleSaveCwd()}
                      disabled={cwdSaving || !cwdInput.trim()}
                    >
                      {cwdSaving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </>
              )}

              {cwdFeedback && (
                <div className={`settings-feedback ${cwdFeedback.ok ? 'ok' : 'err'}`}>
                  {cwdFeedback.msg}
                </div>
              )}
            </div>
          )}

          {tab === 'setup' && (
            <div>
              <div className="setup-checks">
                <SetupCheck
                  name="Bun"
                  detail={setupResult?.bun.version ?? (setupLoading ? 'comprobando…' : '—')}
                  ok={setupResult?.bun.ok}
                  loading={setupLoading}
                />
                <SetupCheck
                  name="Claude CLI"
                  detail={setupResult?.claude.version ?? (setupLoading ? 'comprobando…' : '—')}
                  ok={setupResult?.claude.ok}
                  loading={setupLoading}
                />
                <SetupCheck
                  name="Plugins"
                  detail={setupResult ? `${setupResult.plugins.count} plugins instalados` : (setupLoading ? 'comprobando…' : '—')}
                  ok={setupResult?.plugins.ok}
                  loading={setupLoading}
                />
              </div>
              <button
                className="settings-btn settings-btn-ghost"
                type="button"
                onClick={() => void runSetupCheck()}
                disabled={setupLoading}
              >
                {setupLoading ? 'Comprobando…' : 'Volver a comprobar'}
              </button>
            </div>
          )}

          {tab === 'settings' && (
            <div className="settings-placeholder">
              Más ajustes próximamente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SetupCheckProps {
  name: string;
  detail: string;
  ok: boolean | undefined;
  loading: boolean;
}

function SetupCheck({ name, detail, ok, loading }: SetupCheckProps) {
  const iconClass = loading || ok === undefined ? 'pending' : ok ? 'ok' : 'fail';
  const icon = loading || ok === undefined ? '·' : ok ? '✓' : '✕';
  return (
    <div className="setup-check">
      <div className={`setup-check-icon ${iconClass}`}>{icon}</div>
      <div className="setup-check-info">
        <div className="setup-check-name">{name}</div>
        <div className="setup-check-detail">{detail}</div>
      </div>
    </div>
  );
}
