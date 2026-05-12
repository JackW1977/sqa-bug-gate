import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAJiraFieldsData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

export interface VersionOption { id: string; name: string; released?: boolean; }
export interface SprintOption { id: string; name: string; state: string; }

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
  versions: VersionOption[];
  components: VersionOption[];
  sprints: SprintOption[];
  metaLoading: boolean;
}

function validate(d: SQAJiraFieldsData): string | null {
  if (!d.coreTeam) return 'Core Team is required — it is a mandatory field in the Jira issue form.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
};

const boxStyle: React.CSSProperties = {
  maxHeight: '150px', overflowY: 'auto', border: '2px solid #DFE1E6',
  borderRadius: '4px', padding: '8px', background: '#FAFBFC',
};

function CheckList({
  options, selected, onToggle, loading,
}: {
  options: VersionOption[];
  selected: string[];
  onToggle: (name: string) => void;
  loading?: boolean;
}) {
  if (loading) return <span style={{ color: '#5E6C84', fontSize: '13px' }}>Loading…</span>;
  if (!options.length) return <span style={{ color: '#5E6C84', fontSize: '13px' }}>None available</span>;
  return (
    <>
      {options.map((o) => (
        <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', cursor: 'pointer', fontSize: '14px' }}>
          <input type="checkbox" checked={selected.includes(o.name)} onChange={() => onToggle(o.name)} />
          {o.name}
          {o.released === false && <span style={{ fontSize: '11px', color: '#0052CC', marginLeft: '4px' }}>(unreleased)</span>}
        </label>
      ))}
    </>
  );
}

const Step10JiraFields: React.FC<Props> = ({
  bugData, onChange, onValidate, config,
  versions, components, sprints, metaLoading,
}) => {
  const d = bugData.jiraFields;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAJiraFieldsData>) {
    onChange({ jiraFields: { ...d, ...patch } });
    setTouched(true);
  }

  function toggleArr(field: 'affectsVersions' | 'fixVersions' | 'components', name: string) {
    const cur = d[field];
    update({ [field]: cur.includes(name) ? cur.filter((v) => v !== name) : [...cur, name] });
  }

  const selectedTags = (names: string[]) =>
    names.length > 0 ? (
      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {names.map((n) => (
          <span key={n} style={{ background: '#DEEBFF', color: '#0052CC', borderRadius: '3px', padding: '2px 7px', fontSize: '12px' }}>
            {n}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>10 — Jira Issue Fields</h3>
      <p style={{ margin: '0 0 8px', color: '#5E6C84', fontSize: '13px' }}>
        Set Jira organizational and versioning fields matching the SW project bug template.
        Core Team is required; all other fields are optional but encouraged.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      {/* Core Team — required */}
      <FormField label="Core Team" required hint="Team responsible for this area of the product.">
        <select value={d.coreTeam} onChange={(e) => update({ coreTeam: e.target.value })} style={inp}>
          <option value="">— Select —</option>
          {(config.coreTeamOptions ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      {/* Versions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Affects Versions" hint="Version(s) where the bug was observed.">
          <div style={boxStyle}>
            <CheckList options={versions} selected={d.affectsVersions}
              onToggle={(n) => toggleArr('affectsVersions', n)} loading={metaLoading} />
          </div>
          {selectedTags(d.affectsVersions)}
        </FormField>

        <FormField label="Fix Versions" hint="Version(s) planned for the fix.">
          <div style={boxStyle}>
            <CheckList options={versions} selected={d.fixVersions}
              onToggle={(n) => toggleArr('fixVersions', n)} loading={metaLoading} />
          </div>
          {selectedTags(d.fixVersions)}
        </FormField>
      </div>

      {/* Components */}
      <FormField label="Components" hint="Jira components related to this bug.">
        <div style={boxStyle}>
          <CheckList options={components} selected={d.components}
            onToggle={(n) => toggleArr('components', n)} loading={metaLoading} />
        </div>
        {selectedTags(d.components)}
      </FormField>

      {/* Sprint + Complexity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Sprint" hint="Target sprint (Jira Software sprint field).">
          <select value={d.sprint} onChange={(e) => update({ sprint: e.target.value })} style={inp}>
            <option value="">— Select sprint —</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.state === 'active' ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Complexity">
          <select value={d.complexity} onChange={(e) => update({ complexity: e.target.value })} style={inp}>
            <option value="">— Select —</option>
            {(config.complexityOptions ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Where to have caught */}
      <FormField label="Where should we have caught this in development?">
        <select value={d.whereToHaveCaught} onChange={(e) => update({ whereToHaveCaught: e.target.value })} style={inp}>
          <option value="">— Select —</option>
          {(config.whereToHaveCaughtOptions ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      {/* Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Number of Incidents" hint="Count of documented incidents related to this bug.">
          <input type="number" min="0" value={d.numberOfIncidents}
            onChange={(e) => update({ numberOfIncidents: e.target.value })}
            placeholder="0" style={inp} />
        </FormField>

        <FormField label="Related SoW Item" hint="Includes Bug and Epic tickets only.">
          <input type="text" value={d.relatedSoWItem}
            onChange={(e) => update({ relatedSoWItem: e.target.value })}
            placeholder="SW-1234" style={inp} />
        </FormField>
      </div>

      <FormField label="Incidents" hint="Linked incident ticket keys, if any.">
        <input type="text" value={d.incidents}
          onChange={(e) => update({ incidents: e.target.value })}
          placeholder="INC-001, INC-002" style={inp} />
      </FormField>
    </div>
  );
};

export default Step10JiraFields;
