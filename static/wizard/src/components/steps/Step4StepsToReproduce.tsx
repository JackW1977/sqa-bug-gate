import React, { useEffect, useState } from 'react';
import type { SQABugData, AppConfig, SQAStepsToReproduceData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SQABugData;
  onChange: (patch: Partial<SQABugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

const REPRODUCIBILITY_OPTIONS = [
  '3/3', '2/3', '1/3', '5/5', '2/5', '1/5',
  '2/10', '1/10', 'Observed once', 'Consistent', 'Intermittent',
];

function validate(d: SQAStepsToReproduceData): string | null {
  if (!d.initialState.trim()) return 'Initial state is required.';
  const nonEmpty = d.steps.filter((s) => s.trim());
  if (nonEmpty.length < 2) return 'Provide at least 2 numbered steps.';
  if (!d.reproducibility.trim()) return 'Reproducibility rate is required.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step4StepsToReproduce: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.stepsToReproduce;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SQAStepsToReproduceData>) {
    onChange({ stepsToReproduce: { ...d, ...patch } });
    setTouched(true);
  }

  function updateStep(idx: number, value: string) {
    const steps = [...d.steps];
    steps[idx] = value;
    update({ steps });
  }

  function addStep() { update({ steps: [...d.steps, ''] }); }

  function removeStep(idx: number) {
    if (d.steps.length <= 1) return;
    update({ steps: d.steps.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>4 — Steps to Reproduce</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Number every action from a known starting state. Be concrete — another engineer must be able to follow these steps cold.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <FormField label="Initial State" required hint="What is the system state before step 1? (e.g. at home screen, fresh boot, planning complete)">
        <input type="text" value={d.initialState}
          placeholder="e.g. System at home screen, scope connected, no active case"
          onChange={(e) => update({ initialState: e.target.value })} style={inp} />
      </FormField>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
          Steps <span style={{ color: '#DE350B' }}>*</span>
        </label>
        {d.steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              minWidth: '24px', height: '24px', background: '#0052CC', color: '#fff',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
            }}>
              {idx + 1}
            </span>
            <input
              type="text"
              value={step}
              placeholder={`Step ${idx + 1}…`}
              onChange={(e) => updateStep(idx, e.target.value)}
              style={{ ...inp, flex: 1 }}
            />
            <button
              onClick={() => removeStep(idx)}
              disabled={d.steps.length <= 1}
              style={{
                padding: '6px 10px', background: '#FFEBE6', color: '#DE350B',
                border: '1px solid #FFBDAD', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
              }}
              title="Remove step"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addStep}
          style={{
            padding: '6px 14px', background: '#DEEBFF', color: '#0052CC',
            border: '1px solid #B3D4FF', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginTop: '4px',
          }}
        >
          + Add Step
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Reproducibility Rate" required hint="How often does this occur?">
          <select value={d.reproducibility}
            onChange={(e) => update({ reproducibility: e.target.value })} style={inp}>
            <option value="">— Select —</option>
            {REPRODUCIBILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="custom">Other (specify below)</option>
          </select>
        </FormField>

        <FormField label="Intermittent / Pattern Notes" hint="Timing, data size, device state, environmental factors">
          <textarea rows={2} value={d.intermittentNotes}
            placeholder="e.g. Occurs only when scope temp is low (<15°C)"
            onChange={(e) => update({ intermittentNotes: e.target.value })}
            style={{ ...inp, resize: 'vertical' }} />
        </FormField>
      </div>
    </div>
  );
};

export default Step4StepsToReproduce;
