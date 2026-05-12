import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import type { SQABugData, AppConfig, DuplicateSearchResult, DuplicateOutcome, SQADuplicateSearchData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
  projects: Array<{ key: string; name: string }>;
}

interface SearchResponse {
  success: boolean;
  openResults: DuplicateSearchResult[];
  closedResults: DuplicateSearchResult[];
  openJql: string;
  error?: string;
}

function isValid(projectKey: string, d: SQADuplicateSearchData): boolean {
  if (!projectKey) return false;
  if (!d.searchPerformed) return false;
  if (!d.outcome) return false;
  if (d.outcome === 'open_match') return false; // blocks creation
  return true;
}

const StepDuplicateSearch: React.FC<Props> = ({ bugData, onChange, onValidate, config, projects }) => {
  const d = bugData.duplicateSearch;
  const governed = config.governedProjects.length > 0
    ? projects.filter((p) => config.governedProjects.includes(p.key))
    : projects;
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openResults, setOpenResults] = useState<DuplicateSearchResult[]>(d.results.filter(r => r.statusCategory !== 'done'));
  const [closedResults, setClosedResults] = useState<DuplicateSearchResult[]>(d.results.filter(r => r.statusCategory === 'done'));
  const [selectedOpenKey, setSelectedOpenKey] = useState<string | null>(
    d.outcome === 'open_match' ? d.linkedIssueKeys[0] ?? null : null,
  );
  const [selectedClosedKey, setSelectedClosedKey] = useState<string | null>(
    d.outcome === 'closed_match' ? d.linkedIssueKeys[0] ?? null : null,
  );
  const [outcome, setOutcome] = useState<DuplicateOutcome>(d.outcome);

  useEffect(() => {
    onValidate(isValid(bugData.projectKey, d));
  }, [bugData.projectKey, d]);

  function updateDupData(patch: Partial<SQADuplicateSearchData>) {
    onChange({ duplicateSearch: { ...d, ...patch } });
  }

  async function runSearch() {
    setSearching(true);
    setError(null);
    setOutcome('');
    updateDupData({ searchPerformed: false, outcome: '', linkedIssueKeys: [], results: [] });

    try {
      const res = await invoke<SearchResponse>('searchDuplicates', { bugData });
      if (!res.success) throw new Error(res.error ?? 'Search failed');

      setOpenResults(res.openResults);
      setClosedResults(res.closedResults);
      updateDupData({
        searchPerformed: true,
        searchQuery: res.openJql,
        results: [...res.openResults, ...res.closedResults],
        outcome: '',
        linkedIssueKeys: [],
      });
      setSelectedOpenKey(null);
      setSelectedClosedKey(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSearching(false);
    }
  }

  function selectOutcome(newOutcome: DuplicateOutcome, keys: string[]) {
    setOutcome(newOutcome);
    updateDupData({ outcome: newOutcome, linkedIssueKeys: keys });
  }

  const rowStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid #DFE1E6',
    display: 'grid', gridTemplateColumns: '80px 1fr 100px',
    gap: '12px', alignItems: 'start', fontSize: '13px',
  };

  return (
    <div>
      {/* ── Project selector ───────────────────────────────────────────── */}
      <FormField label="Jira Project" required>
        <select
          value={bugData.projectKey}
          onChange={(e) => onChange({ projectKey: e.target.value })}
          style={{ width: '100%', padding: '8px', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '14px' }}
        >
          <option value="">— Select a project —</option>
          {governed.map((p) => (
            <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
          ))}
        </select>
      </FormField>
      {bugData.projectKey && (
        <p style={{ margin: '-8px 0 16px', color: '#006644', fontSize: '13px' }}>
          ✓ Project <strong>{bugData.projectKey}</strong> is governed by the SQA Bug Gate.
        </p>
      )}

      <div style={{ borderTop: '1px solid #DFE1E6', margin: '20px 0' }} />

      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>Duplicate Search</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Search existing bugs before creating a new one. You must run the search and pick an outcome.
      </p>

      {error && <ValidationMessage>{error}</ValidationMessage>}

      {outcome === 'open_match' && (
        <ValidationMessage appearance="warning" title="Open duplicate found">
          A matching open bug exists. Add evidence to that bug instead of creating a new one.
          This wizard will not create a duplicate.
        </ValidationMessage>
      )}

      <button
        onClick={runSearch}
        disabled={searching || !bugData.summary.category}
        style={{
          padding: '9px 20px', background: '#0052CC', color: '#fff',
          border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer',
          marginBottom: '20px', opacity: searching ? 0.7 : 1,
        }}
      >
        {searching ? '🔍 Searching…' : '🔍 Run Duplicate Search'}
      </button>

      {!d.searchPerformed && !searching && (
        <ValidationMessage appearance="info">
          Click "Run Duplicate Search" to continue. The search uses your category, keywords, and project.
        </ValidationMessage>
      )}

      {d.searchPerformed && (
        <>
          {/* ── Open bugs ─────────────────────────────────────────────── */}
          <h4 style={{ margin: '0 0 8px', color: '#172B4D' }}>
            Open Bugs ({openResults.length})
          </h4>
          {openResults.length === 0 ? (
            <p style={{ color: '#5E6C84', fontSize: '13px', marginBottom: '16px' }}>No open matches found.</p>
          ) : (
            <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ ...rowStyle, background: '#F4F5F7', fontWeight: 600, borderBottom: '2px solid #DFE1E6' }}>
                <span>Key</span><span>Summary / Description</span><span>Status</span>
              </div>
              {openResults.map((r) => (
                <div
                  key={r.key}
                  style={{ ...rowStyle, background: selectedOpenKey === r.key ? '#DEEBFF' : '#fff', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedOpenKey(r.key);
                    setSelectedClosedKey(null);
                    selectOutcome('open_match', [r.key]);
                  }}
                >
                  <span>
                    <input type="radio" name="dupOpen" checked={selectedOpenKey === r.key} onChange={() => {}} />
                    {' '}<strong style={{ color: '#0052CC' }}>{r.key}</strong>
                  </span>
                  <span>
                    <div style={{ fontWeight: 500 }}>{r.summary}</div>
                    {r.description && <div style={{ color: '#6B778C', marginTop: '2px', fontSize: '12px' }}>{r.description.slice(0, 120)}…</div>}
                  </span>
                  <span style={{
                    background: '#FFEBE6', color: '#BF2600', borderRadius: '3px',
                    padding: '2px 6px', fontSize: '11px', fontWeight: 600,
                  }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Closed bugs ───────────────────────────────────────────── */}
          <h4 style={{ margin: '0 0 8px', color: '#172B4D' }}>
            Closed / Resolved Bugs ({closedResults.length})
          </h4>
          {closedResults.length === 0 ? (
            <p style={{ color: '#5E6C84', fontSize: '13px', marginBottom: '16px' }}>No closed matches found.</p>
          ) : (
            <div style={{ border: '1px solid #DFE1E6', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ ...rowStyle, background: '#F4F5F7', fontWeight: 600, borderBottom: '2px solid #DFE1E6' }}>
                <span>Key</span><span>Summary / Description</span><span>Status</span>
              </div>
              {closedResults.map((r) => (
                <div
                  key={r.key}
                  style={{ ...rowStyle, background: selectedClosedKey === r.key ? '#E3FCEF' : '#fff', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedClosedKey(r.key);
                    setSelectedOpenKey(null);
                    selectOutcome('closed_match', [r.key]);
                  }}
                >
                  <span>
                    <input type="radio" name="dupClosed" checked={selectedClosedKey === r.key} onChange={() => {}} />
                    {' '}<strong style={{ color: '#0052CC' }}>{r.key}</strong>
                  </span>
                  <span>
                    <div style={{ fontWeight: 500 }}>{r.summary}</div>
                    {r.description && <div style={{ color: '#6B778C', marginTop: '2px', fontSize: '12px' }}>{r.description.slice(0, 120)}…</div>}
                  </span>
                  <span style={{
                    background: '#E3FCEF', color: '#006644', borderRadius: '3px',
                    padding: '2px 6px', fontSize: '11px', fontWeight: 600,
                  }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Outcome selection ─────────────────────────────────────── */}
          <h4 style={{ margin: '0 0 12px', color: '#172B4D' }}>Select Outcome</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {[
              { value: 'none', label: '✅ None of these match — proceed with new bug', color: '#006644', bg: '#E3FCEF' },
              { value: 'closed_match', label: '🔄 Same as a CLOSED bug — re-occurrence (will link to closed bug)', color: '#974F0C', bg: '#FFFAE6' },
              { value: 'open_match', label: '🚫 Same as an OPEN bug — add evidence there instead', color: '#BF2600', bg: '#FFEBE6' },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '4px', cursor: 'pointer',
                  background: outcome === opt.value ? opt.bg : '#F4F5F7',
                  border: `1px solid ${outcome === opt.value ? opt.color : '#DFE1E6'}`,
                  color: opt.color, fontWeight: outcome === opt.value ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="outcome"
                  value={opt.value}
                  checked={outcome === opt.value}
                  onChange={() => {
                    const keys = opt.value === 'open_match' && selectedOpenKey
                      ? [selectedOpenKey]
                      : opt.value === 'closed_match' && selectedClosedKey
                        ? [selectedClosedKey]
                        : [];
                    selectOutcome(opt.value as DuplicateOutcome, keys);
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StepDuplicateSearch;
