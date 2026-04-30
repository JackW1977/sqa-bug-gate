import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAPreconditionsData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SQAPreconditionsData): string | null {
  if (!d.noPreconditions && !d.preconditions.trim())
    return 'Describe preconditions, or check "No special preconditions" and explain.';
  if (d.noPreconditions && !d.noPreconditionsExplanation.trim())
    return 'Provide a brief explanation when "No special preconditions" is checked.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step3Preconditions: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.preconditions;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAPreconditionsData>) {
    onChange({ preconditions: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>3 — Preconditions</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Describe the system state before step 1. Examples: uptime, connection state, user role, data loaded, prior actions performed.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={d.noPreconditions}
          onChange={(e) => update({ noPreconditions: e.target.checked })}
        />
        <span style={{ fontWeight: 500 }}>No special preconditions</span>
      </label>

      {d.noPreconditions ? (
        <FormField label="Brief explanation" required hint="Why are there no special preconditions?">
          <input type="text" value={d.noPreconditionsExplanation}
            placeholder="e.g. Reproducible from any fresh session with default settings"
            onChange={(e) => update({ noPreconditionsExplanation: e.target.value })}
            style={inp} />
        </FormField>
      ) : (
        <FormField label="Preconditions" required hint="List each precondition on its own line or as a numbered list.">
          <textarea rows={5} value={d.preconditions}
            placeholder={'1. System powered on and at home screen\n2. User logged in as clinical operator\n3. Prior planning session completed (no active case)\n4. USB scope BC-12 connected'}
            onChange={(e) => update({ preconditions: e.target.value })}
            style={{ ...inp, resize: 'vertical' }} />
        </FormField>
      )}
    </div>
  );
};

export default Step3Preconditions;
