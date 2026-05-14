import React, { useEffect, useState } from 'react';
import type { SoftwareBugData, AppConfig, SoftwareEnvironmentData } from '../../types';
import FormField from '../common/FormField';
import ValidationMessage from '../common/ValidationMessage';

interface Props {
  bugData: SoftwareBugData;
  onChange: (patch: Partial<SoftwareBugData>) => void;
  onValidate: (valid: boolean) => void;
  config: AppConfig;
}

function validate(d: SoftwareEnvironmentData): string | null {
  const hasUnknownReason = d.unknownReason.trim().length > 0;
  if (!d.softwareVersion.trim() && !hasUnknownReason)
    return 'Software version is required. If unknown, fill in the "Unknown – reason" field.';
  if (!d.branchRelease.trim() && !hasUnknownReason)
    return 'Branch / release line is required.';
  if (!d.hardwareConfig.trim() && !hasUnknownReason)
    return 'Hardware configuration is required.';
  if (!d.mode.trim() && !hasUnknownReason)
    return 'Mode / key settings is required.';
  return null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px', border: '2px solid #DFE1E6',
  borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit',
};

const Step2Environment: React.FC<Props> = ({ bugData, onChange, onValidate }) => {
  const d = bugData.environment;
  const [touched, setTouched] = useState(false);
  const error = validate(d);

  useEffect(() => { onValidate(!error); }, [error]);

  function update(patch: Partial<SoftwareEnvironmentData>) {
    onChange({ environment: { ...d, ...patch } });
    setTouched(true);
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', color: '#172B4D' }}>2 — Environment</h3>
      <p style={{ margin: '0 0 16px', color: '#5E6C84', fontSize: '13px' }}>
        Provide full environment context. If a value is genuinely unknown, use the "Unknown – reason" field and explain why.
      </p>

      {touched && error && <ValidationMessage>{error}</ValidationMessage>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <FormField label="Software Version / Build ID" required hint="e.g. 1.4.0.1-37">
          <input type="text" value={d.softwareVersion} placeholder="1.4.0.1-37"
            onChange={(e) => update({ softwareVersion: e.target.value })} style={inp} />
        </FormField>

        <FormField label="Branch / Release Line" required hint="e.g. 1D.0 dev / 1D.0 release">
          <input type="text" value={d.branchRelease} placeholder="1D.0 dev"
            onChange={(e) => update({ branchRelease: e.target.value })} style={inp} />
        </FormField>

        <FormField label="Build Number" hint="e.g. 1.4.0.1-XX">
          <input type="text" value={d.buildNumber} placeholder="1.4.0.1-XX"
            onChange={(e) => update({ buildNumber: e.target.value })} style={inp} />
        </FormField>

        <FormField label="Mode / Key Settings" required hint="Simulation vs live, feature flags, network type, locale">
          <input type="text" value={d.mode} placeholder="Live, EN-US, Wi-Fi"
            onChange={(e) => update({ mode: e.target.value })} style={inp} />
        </FormField>
      </div>

      <FormField label="Hardware Configuration" required hint="System type, TPS/TDS/TIC model, controller, peripherals">
        <textarea rows={3} value={d.hardwareConfig}
          placeholder="e.g. NovaCyclone Gen2, TIC v4, USB bronchoscope BC-12, standard OR cart"
          onChange={(e) => update({ hardwareConfig: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>

      <FormField label="Key Settings" hint="Additional flags, calibration state, software modes active">
        <input type="text" value={d.keySettings} placeholder="Fluoroscopy enabled, calibration expired"
          onChange={(e) => update({ keySettings: e.target.value })} style={inp} />
      </FormField>

      <FormField label="Data / Procedure Context" hint="Patient data state, case type, prior steps in the session">
        <textarea rows={2} value={d.dataProcedureContext}
          placeholder="e.g. Post-planning case, phantom lung, 45-min session uptime"
          onChange={(e) => update({ dataProcedureContext: e.target.value })}
          style={{ ...inp, resize: 'vertical' }} />
      </FormField>

      <FormField label="Unknown – Reason" hint="If any field above is genuinely unknown, explain why here (e.g. historic re-test, no build info available)">
        <textarea rows={2} value={d.unknownReason}
          placeholder="e.g. Historic re-test – build ID not recorded in test log"
          onChange={(e) => update({ unknownReason: e.target.value })}
          style={{ ...inp, resize: 'vertical', borderColor: d.unknownReason ? '#FF8B00' : '#DFE1E6' }} />
      </FormField>
    </div>
  );
};

export default Step2Environment;
