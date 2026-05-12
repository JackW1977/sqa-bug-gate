import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAExpectedActualData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

const ROOT_CAUSE = /\b(race condition|memory leak|null pointer|db issue|database|server error|timeout|crash in|exception in)\b/i;

function validate(d: SQAExpectedActualData): string | null {
  if (!d.expectedBehavior.trim()) return 'Expected behavior is required.';
  if (!d.actualBehavior.trim()) return 'Actual behavior is required.';
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  if (norm(d.expectedBehavior) === norm(d.actualBehavior))
    return 'Expected and actual behavior must be different.';
  if (ROOT_CAUSE.test(d.expectedBehavior))
    return 'Expected behavior should describe the user-facing outcome. Move root-cause theories to the Notes field.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical',
};

const Step5ExpectedActual: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.expectedActual;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAExpectedActualData>) {
    onChange({ expectedActual: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>3 — Expected vs Actual Behavior</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Expected = what the product should do per design/requirements. Actual = what it actually did. Keep root-cause theories in Notes.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <FormField label="Expected Behavior" required hint="Describe the correct, intended system behavior from the user's perspective.">
        <textarea rows={4} value={d.expectedBehavior}
          placeholder="e.g. The bronchoscope view should display a live video feed within 3 seconds of connection."
          onChange={(e) => update({ expectedBehavior: e.target.value })} style={inp} />
      </FormField>

      <FormField label="Actual Behavior" required hint="Describe exactly what was observed, including any error messages, UI state, or system response.">
        <textarea rows={4} value={d.actualBehavior}
          placeholder="e.g. The view remains black with a spinner indefinitely. No error message is displayed. The scope LED is active."
          onChange={(e) => update({ actualBehavior: e.target.value })} style={inp} />
      </FormField>

      <FormField label="Notes / Suspected Cause" hint="Optional — root-cause theories, related observations, or suspicions go here, not in the fields above.">
        <textarea rows={3} value={d.notes}
          placeholder="e.g. May be related to USB driver initialisation timeout observed in logs."
          onChange={(e) => update({ notes: e.target.value })} style={inp} />
      </FormField>
    </div>
  );
};

export default Step5ExpectedActual;
