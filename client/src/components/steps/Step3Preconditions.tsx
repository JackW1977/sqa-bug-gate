import React, { useEffect, useState } from 'react';
import type { SoftwareBugData, AppConfig, SoftwarePreconditionsData, SoftwareStepsToReproduceData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';
import GleanButton from '../common/GleanButton';

interface Props {
  bugData: SoftwareBugData;
  onChange: (patch: Partial<SoftwareBugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

function validate(
  pre: SoftwarePreconditionsData,
  repro: SoftwareStepsToReproduceData,
  hardwareConfig: string,
): string | null {
  if (!hardwareConfig.trim()) return 'Hardware configuration is required.';
  if (!pre.noPreconditions && !pre.preconditions.trim())
    return 'Describe preconditions, or check "No special preconditions" and explain.';
  if (pre.noPreconditions && !pre.noPreconditionsExplanation.trim())
    return 'Provide a brief explanation when "No special preconditions" is checked.';
  if (!repro.initialState.trim()) return 'Initial state is required.';
  if (repro.steps.filter((s) => s.trim()).length < 2) return 'Provide at least 2 numbered steps.';
  return null;
}

const Step3Preconditions: React.FC<Props> = ({ bugData, onChange, onValidate, config }) => {
  const pre = bugData.preconditions;
  const repro = bugData.stepsToReproduce;
  const hardwareConfig = bugData.environment.hardwareConfig;
  const [touched, setTouched] = useState(false);
  const error = validate(pre, repro, hardwareConfig);

  useEffect(() => { onValidate(!error); }, [error]);

  function updatePre(patch: Partial<SoftwarePreconditionsData>) {
    onChange({ preconditions: { ...pre, ...patch } });
    setTouched(true);
  }

  function updateHardware(value: string) {
    onChange({ environment: { ...bugData.environment, hardwareConfig: value } });
    setTouched(true);
  }

  function updateRepro(patch: Partial<SoftwareStepsToReproduceData>) {
    onChange({ stepsToReproduce: { ...repro, ...patch } });
    setTouched(true);
  }

  function updateStep(idx: number, value: string) {
    const steps = [...repro.steps];
    steps[idx] = value;
    updateRepro({ steps });
  }

  function addStep() { updateRepro({ steps: [...repro.steps, ''] }); }

  function removeStep(idx: number) {
    if (repro.steps.length <= 1) return;
    updateRepro({ steps: repro.steps.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>2 — Preconditions & Steps to Reproduce</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Document the hardware, system state, and exact reproduction steps.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      {/* ── Hardware ── */}
      <FormField label="Hardware Configuration" required hint="System type, TIC model, controller, scope, peripherals">
        <textarea rows={3} value={hardwareConfig}
          placeholder="e.g. NovaCyclone Gen2, TIC v4, USB bronchoscope BC-12, standard OR cart, Win 11 TPS workstation"
          onChange={(e) => updateHardware(e.target.value)}
          style={{ ...inp, resize: 'vertical' }} />
        <GleanButton value={hardwareConfig} onAccept={updateHardware} fieldContext="hardware configuration listing system type, controller, scope, and peripherals" config={config} />
      </FormField>

      {/* ── Preconditions ── */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={pre.noPreconditions}
          onChange={(e) => updatePre({ noPreconditions: e.target.checked })}
        />
        <span style={{ fontWeight: 500 }}>No special preconditions</span>
      </label>

      {pre.noPreconditions ? (
        <FormField label="Brief explanation" required hint="Why are there no special preconditions?">
          <input type="text" value={pre.noPreconditionsExplanation}
            placeholder="e.g. Reproducible from any fresh session with default settings"
            onChange={(e) => updatePre({ noPreconditionsExplanation: e.target.value })}
            style={inp} />
          <GleanButton value={pre.noPreconditionsExplanation} onAccept={(v) => updatePre({ noPreconditionsExplanation: v })} fieldContext="explanation for why there are no special preconditions" config={config} />
        </FormField>
      ) : (
        <FormField label="Preconditions" required hint="List each precondition on its own line or as a numbered list.">
          <textarea rows={4} value={pre.preconditions}
            placeholder={'1. System powered on and at home screen\n2. User logged in as clinical operator\n3. Prior planning session completed (no active case)\n4. USB scope BC-12 connected'}
            onChange={(e) => updatePre({ preconditions: e.target.value })}
            style={{ ...inp, resize: 'vertical' }} />
          <GleanButton value={pre.preconditions} onAccept={(v) => updatePre({ preconditions: v })} fieldContext="list of preconditions required to reproduce a software bug" config={config} />
        </FormField>
      )}

      {/* ── Steps to Reproduce ── */}
      <div style={{ borderTop: '1px solid #DFE1E6', marginTop: '20px', paddingTop: '20px' }}>
        <FormField label="Initial State" required hint="What is the system state immediately before step 1?">
          <input type="text" value={repro.initialState}
            placeholder="e.g. System at home screen, scope connected, no active case"
            onChange={(e) => updateRepro({ initialState: e.target.value })} style={inp} />
          <GleanButton value={repro.initialState} onAccept={(v) => updateRepro({ initialState: v })} fieldContext="initial system state before reproduction steps begin" config={config} />
        </FormField>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
            Steps to Reproduce <span style={{ color: '#DE350B' }}>*</span>
          </label>
          {repro.steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                minWidth: '24px', height: '24px', background: '#0052CC', color: '#fff',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>
                {idx + 1}
              </span>
              <input type="text" value={step} placeholder={`Step ${idx + 1}…`}
                onChange={(e) => updateStep(idx, e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={() => removeStep(idx)} disabled={repro.steps.length <= 1}
                style={{
                  padding: '6px 10px', background: '#FFEBE6', color: '#DE350B',
                  border: '1px solid #FFBDAD', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
                }} title="Remove step">×</button>
            </div>
          ))}
          <button onClick={addStep}
            style={{
              padding: '6px 14px', background: '#DEEBFF', color: '#0052CC',
              border: '1px solid #B3D4FF', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginTop: '4px',
            }}>
            + Add Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step3Preconditions;
