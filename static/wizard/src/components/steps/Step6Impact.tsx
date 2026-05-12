import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAImpactData, WorkaroundPracticality, OccurrenceEstimate } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SQAImpactData): string | null {
  if (!d.userWorkflowImpact.trim()) return 'Describe at least one concrete user or workflow effect.';
  if (!d.workaroundPracticality && !d.workaroundDescription.trim())
    return 'Workaround information is required — describe the workaround or select "N/A (no workaround)".';
  if (!d.estimatedOccurrence) return 'Estimated occurrence frequency is required.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step6Impact: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.impact;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAImpactData>) {
    onChange({ impact: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>5 — Impact (SQA View)</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Describe impact in user and workflow terms. The goal is to help triage understand urgency, not to assign priority.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <FormField label="User / Workflow Impact" required
        hint="Delays, interruptions, repeated steps, lost confidence, inability to complete a step. Be concrete.">
        <textarea rows={4} value={d.userWorkflowImpact}
          placeholder="e.g. Clinician cannot visualise the bronchoscope during navigation phase. Must restart the session (approx. 10 min delay). Observed during 3 separate procedure simulations."
          onChange={(e) => update({ userWorkflowImpact: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>

      <FormField label="Safety Relevance" hint="Only if patient safety is evidently at risk — describe potential for bad decisions, data loss, inability to complete critical steps.">
        <textarea rows={3} value={d.safetyRelevance}
          placeholder="Leave blank if no evident safety concern."
          onChange={(e) => update({ safetyRelevance: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>

      <FormField label="Workaround Description" hint="If there is a workaround, describe it. If none, leave blank and select 'No workaround' below.">
        <textarea rows={3} value={d.workaroundDescription}
          placeholder="e.g. Disconnect and reconnect the USB scope; restart TPS session."
          onChange={(e) => update({ workaroundDescription: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Workaround Practicality" required>
          <select value={d.workaroundPracticality}
            onChange={(e) => update({ workaroundPracticality: e.target.value as WorkaroundPracticality })}
            style={inp}>
            <option value="">— Select —</option>
            <option value="trivial">Trivial (quick, no disruption)</option>
            <option value="acceptable">Acceptable (minor effort)</option>
            <option value="cumbersome">Cumbersome (significant effort)</option>
            <option value="unrealistic">Unrealistic / No workaround</option>
          </select>
        </FormField>

        <FormField label="Estimated Occurrence in Realistic Use" required>
          <select value={d.estimatedOccurrence}
            onChange={(e) => update({ estimatedOccurrence: e.target.value as OccurrenceEstimate })}
            style={inp}>
            <option value="">— Select —</option>
            <option value="remote">Remote (edge case)</option>
            <option value="occasional">Occasional (sometimes)</option>
            <option value="frequent">Frequent (common path)</option>
          </select>
        </FormField>
      </div>
    </div>
  );
};

export default Step6Impact;
