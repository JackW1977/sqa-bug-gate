import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAClassificationData, BugType, ImpactCategory, PrioritySuggestion } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SQAClassificationData): string | null {
  if (d.impactCategory === 'Blocker' && !d.priorityRationale.trim())
    return 'A Blocker impact category requires a brief priority rationale.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step9Classification: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.classification;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAClassificationData>) {
    onChange({ classification: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>7 — Classification Suggestion</h3>
      <p style={{ margin: '0 0 8px', color: '#5E6C84', fontSize: '13px' }}>
        Optional SQA suggestions only. Final severity and priority are set by triage/product/engineering.
      </p>

      <div style={{
        background: '#FFFAE6', border: '1px solid #FF8B00', borderRadius: '4px',
        padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#974F0C',
      }}>
        ⚠️ <strong>SQA suggestion only.</strong> These fields advise triage — they do not set the official Jira priority or severity.
      </div>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <FormField label="Type">
          <select value={d.type} onChange={(e) => update({ type: e.target.value as BugType })} style={inp}>
            <option value="">— Optional —</option>
            <option value="Bug">Bug</option>
            <option value="Improvement">Improvement</option>
          </select>
        </FormField>

        <FormField label="Impact Category">
          <select value={d.impactCategory} onChange={(e) => update({ impactCategory: e.target.value as ImpactCategory })} style={inp}>
            <option value="">— Optional —</option>
            <option value="Minor">Minor</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Major">Major</option>
            <option value="Blocker">Blocker</option>
          </select>
        </FormField>

        <FormField label="Priority Suggestion">
          <select value={d.prioritySuggestion} onChange={(e) => update({ prioritySuggestion: e.target.value as PrioritySuggestion })} style={inp}>
            <option value="">— Optional —</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </FormField>
      </div>

      <FormField label="Priority Rationale" hint="Brief reason for the priority suggestion (required if Blocker).">
        <textarea rows={3} value={d.priorityRationale}
          placeholder="e.g. Blocks the core navigation workflow in every procedure; no workaround in simulation mode."
          onChange={(e) => update({ priorityRationale: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>
    </div>
  );
};

export default Step9Classification;
