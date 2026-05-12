import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
};

const sectionCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #DFE1E6', borderRadius: '4px',
  marginBottom: '20px', overflow: 'hidden',
};

const sectionHeader: React.CSSProperties = {
  background: '#F4F5F7', padding: '10px 20px',
  fontWeight: 700, fontSize: '12px', color: '#344563',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: '2px solid #DFE1E6',
};

const sectionBody: React.CSSProperties = {
  padding: '20px',
};

const fieldRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '200px 1fr',
  gap: '12px', alignItems: 'start', marginBottom: '16px',
};

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>{children}</div>
      {hint && <div style={{ fontSize: '11px', color: '#6B778C', marginTop: '2px' }}>{hint}</div>}
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
      }}
    >
      <div style={{
        width: '40px', height: '22px', borderRadius: '11px', position: 'relative',
        background: checked ? '#0052CC' : '#DFE1E6',
        transition: 'background 0.15s',
      }}>
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.15s',
        }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: checked ? '#0052CC' : '#6B778C' }}>
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
}

// ── Tag list display ───────────────────────────────────────────────────────────

function TagList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map((item) => (
        <span key={item} style={{
          background: '#DEEBFF', color: '#0052CC', borderRadius: '3px',
          padding: '2px 8px', fontSize: '12px', fontWeight: 500,
        }}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const AdminConfig: React.FC<Props> = ({ config }) => {
  // ── General settings state
  const [siteUrl, setSiteUrl] = useState(config.jiraSiteUrl ?? '');
  const [governedProjects, setGovernedProjects] = useState(config.governedProjects.join(', '));
  const [defaultProject, setDefaultProject] = useState(config.defaultProject ?? config.governedProjects[0] ?? '');
  const [gatedStatuses, setGatedStatuses] = useState(config.gatedStatuses.join(', '));
  const [governedIssueTypes, setGovernedIssueTypes] = useState(config.governedIssueTypes.join(', '));

  // ── Glean state
  const [gleanEnabled, setGleanEnabled] = useState(config.glean?.enabled ?? false);
  const [gleanBaseUrl, setGleanBaseUrl] = useState(config.glean?.baseUrl ?? '');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // ── Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    invoke<{ tokenConfigured: boolean }>('getGleanTokenStatus').then((r) => {
      setTokenConfigured(r.tokenConfigured);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      // Save general + glean config
      const parsedProjects = governedProjects.split(',').map((s) => s.trim()).filter(Boolean);
      const patch: Partial<AppConfig> = {
        jiraSiteUrl: siteUrl.trim(),
        governedProjects: parsedProjects,
        defaultProject: defaultProject.trim() || parsedProjects[0] || '',
        gatedStatuses: gatedStatuses.split(',').map((s) => s.trim()).filter(Boolean),
        governedIssueTypes: governedIssueTypes.split(',').map((s) => s.trim()).filter(Boolean),
        glean: { enabled: gleanEnabled, baseUrl: gleanBaseUrl.trim() },
      };

      const configResult = await invoke<{ success: boolean; error?: string }>(
        'updateConfig', patch,
      );
      if (!configResult.success) throw new Error(configResult.error ?? 'Config save failed');

      // Save Glean token if entered
      if (showTokenInput && tokenInput.trim()) {
        const tokenResult = await invoke<{ success: boolean; error?: string }>(
          'setGleanToken',
          { token: tokenInput.trim(), baseUrl: gleanBaseUrl.trim() },
        );
        if (!tokenResult.success) throw new Error(tokenResult.error ?? 'Token save failed');
        setTokenConfigured(true);
        setShowTokenInput(false);
        setTokenInput('');
      }

      setSaveResult({ ok: true, msg: 'Settings saved successfully.' });
    } catch (e) {
      setSaveResult({ ok: false, msg: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      maxWidth: '860px', margin: '0 auto', padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: '#172B4D' }}>⚙ SQA Bug Gate — Settings</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#5E6C84' }}>
            Configure gate behaviour, governed projects, and AI integrations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', background: saving ? '#B3BAC5' : '#0052CC',
            color: '#fff', border: 'none', borderRadius: '4px',
            fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {saveResult && (
        <div style={{
          padding: '10px 16px', marginBottom: '20px', borderRadius: '4px',
          background: saveResult.ok ? '#E3FCEF' : '#FFEBE6',
          border: `1px solid ${saveResult.ok ? '#00875A' : '#DE350B'}`,
          color: saveResult.ok ? '#006644' : '#BF2600',
          fontSize: '13px', fontWeight: 500,
        }}>
          {saveResult.ok ? '✓ ' : '⚠ '}{saveResult.msg}
        </div>
      )}

      {/* ── Section 1: Jira Settings ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>Jira Settings</div>
        <div style={sectionBody}>
          <div style={fieldRow}>
            <FieldLabel hint="Your Atlassian site URL">Jira Site URL</FieldLabel>
            <input style={inp} value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://company.atlassian.net" />
          </div>
          <div style={fieldRow}>
            <FieldLabel hint="Comma-separated project keys">Governed Projects</FieldLabel>
            <input style={inp} value={governedProjects} onChange={(e) => setGovernedProjects(e.target.value)}
              placeholder="SW, HW, FW" />
          </div>
          <div style={fieldRow}>
            <FieldLabel hint="Default project pre-selected in the bug wizard">Default Project</FieldLabel>
            <select
              style={{ ...inp, background: '#fff' }}
              value={defaultProject}
              onChange={(e) => setDefaultProject(e.target.value)}
            >
              {governedProjects.split(',').map((s) => s.trim()).filter(Boolean).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <div style={fieldRow}>
            <FieldLabel hint="Comma-separated issue types">Governed Issue Types</FieldLabel>
            <input style={inp} value={governedIssueTypes} onChange={(e) => setGovernedIssueTypes(e.target.value)}
              placeholder="Bug" />
          </div>
          <div style={{ ...fieldRow, marginBottom: 0 }}>
            <FieldLabel hint="Statuses that trigger the quality gate">Gated Statuses</FieldLabel>
            <div>
              <input style={inp} value={gatedStatuses} onChange={(e) => setGatedStatuses(e.target.value)}
                placeholder="Ready for Triage, Ready for Dev, Triage" />
              <div style={{ marginTop: '6px' }}>
                <TagList items={gatedStatuses.split(',').map((s) => s.trim()).filter(Boolean)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: AI Configuration — Glean ── */}
      <div style={sectionCard}>
        <div style={{ ...sectionHeader, background: '#EAE6FF', borderBottom: '2px solid #C0B6F2', color: '#403294' }}>
          ✨ AI Configuration — Glean
        </div>
        <div style={sectionBody}>

          {/* Enable toggle */}
          <div style={{ ...fieldRow, alignItems: 'center' }}>
            <FieldLabel hint="Show ✨ Rephrase with Glean on all text fields">Enable Glean Rephrase</FieldLabel>
            <Toggle checked={gleanEnabled} onChange={setGleanEnabled} />
          </div>

          {/* Base URL */}
          <div style={fieldRow}>
            <FieldLabel hint="Your Glean backend URL">Base URL</FieldLabel>
            <input
              style={{ ...inp, borderColor: gleanEnabled ? '#C0B6F2' : '#DFE1E6' }}
              value={gleanBaseUrl}
              onChange={(e) => setGleanBaseUrl(e.target.value)}
              placeholder="https://company-be.glean.com"
              disabled={!gleanEnabled}
            />
          </div>

          {/* API Token */}
          <div style={fieldRow}>
            <FieldLabel hint="Stored encrypted in Forge secret storage">API Token</FieldLabel>
            <div>
              {tokenConfigured && !showTokenInput ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '13px', color: '#006644', fontWeight: 600,
                    background: '#E3FCEF', padding: '6px 12px', borderRadius: '4px',
                    border: '1px solid #ABF5D1',
                  }}>
                    ✓ Token configured
                  </span>
                  <button
                    onClick={() => setShowTokenInput(true)}
                    style={{
                      padding: '6px 14px', background: '#F4F5F7', color: '#344563',
                      border: '1px solid #DFE1E6', borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    Replace Token
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="password"
                    style={{ ...inp, borderColor: '#C0B6F2' }}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste your Glean API token…"
                    autoComplete="off"
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B778C' }}>
                    Token is encrypted and stored in Forge secret storage. It is never sent to the browser.
                  </p>
                  {tokenConfigured && (
                    <button
                      onClick={() => { setShowTokenInput(false); setTokenInput(''); }}
                      style={{
                        marginTop: '6px', padding: '4px 10px', background: 'transparent',
                        border: 'none', color: '#6B778C', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      ← Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: '#EAE6FF', border: '1px solid #C0B6F2', borderRadius: '4px',
            padding: '12px 16px', fontSize: '13px', color: '#403294',
          }}>
            <strong>How it works:</strong> When enabled, a purple <strong>✨ Rephrase with Glean</strong> button
            appears below every free-text field in the wizard. Clicking it sends the field text to your Glean
            AI backend, which returns a professionally rephrased suggestion. The reporter can Accept or Discard
            the suggestion before proceeding.
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#5243AA' }}>
              Glean API endpoint used: <code style={{ background: '#F3F0FF', padding: '1px 4px', borderRadius: '3px' }}>
                {gleanBaseUrl || 'https://company-be.glean.com'}/api/v1/chat
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Categories (read-only) ── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>Bug Categories</div>
        <div style={sectionBody}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#5E6C84' }}>
            {config.categories.length} categories configured. Edit via the Forge app configuration file.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {config.categories.map((cat) => (
              <div key={cat.value} style={{
                background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: '4px',
                padding: '8px 12px', fontSize: '13px',
              }}>
                <div style={{ fontWeight: 600, color: '#172B4D', marginBottom: '4px' }}>{cat.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {cat.subCategories.map((sub) => (
                    <span key={sub.value} style={{
                      background: '#DEEBFF', color: '#0052CC', borderRadius: '3px',
                      padding: '1px 6px', fontSize: '11px',
                    }}>
                      {sub.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', paddingBottom: '24px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px', background: saving ? '#B3BAC5' : '#0052CC',
            color: '#fff', border: 'none', borderRadius: '4px',
            fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminConfig;
