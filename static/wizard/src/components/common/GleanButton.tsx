import React, { useState } from 'react';
import { invoke } from '@forge/bridge';
import type { AppConfig } from '../../types';

interface Props {
  /** Current value of the field to rephrase */
  value: string;
  /** Called when the user accepts the Glean suggestion */
  onAccept: (rephrased: string) => void;
  /** Describes the field so Glean knows the context, e.g. "expected behavior" */
  fieldContext: string;
  config: AppConfig;
}

type Status = 'idle' | 'loading' | 'preview' | 'error';

const GleanButton: React.FC<Props> = ({ value, onAccept, fieldContext, config }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [rephrased, setRephrased] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Only render if Glean is enabled and there is text to rephrase
  if (!config.glean?.enabled || !value.trim()) return null;

  async function handleRephrase() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const result = await invoke<{ success: boolean; rephrased?: string; error?: string }>(
        'rephraseWithGlean',
        { text: value, fieldContext },
      );
      if (result.success && result.rephrased) {
        setRephrased(result.rephrased);
        setStatus('preview');
      } else {
        setErrorMsg(result.error ?? 'Glean returned no response.');
        setStatus('error');
      }
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  }

  const smallBtn = (bg: string, color: string): React.CSSProperties => ({
    padding: '3px 10px', fontSize: '12px', fontWeight: 600,
    border: 'none', borderRadius: '3px', cursor: 'pointer',
    background: bg, color,
  });

  if (status === 'loading') {
    return (
      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', color: '#5243AA' }}>✨ Rephrasing…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', color: '#DE350B' }}>⚠ {errorMsg}</span>
        <button style={smallBtn('#FFEBE6', '#DE350B')} onClick={() => setStatus('idle')}>Dismiss</button>
      </div>
    );
  }

  if (status === 'preview') {
    return (
      <div style={{
        marginTop: '6px', padding: '10px 12px',
        background: '#F3F0FF', border: '1px solid #C0B6F2', borderRadius: '4px',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#5243AA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ✨ Glean Suggestion
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#172B4D', whiteSpace: 'pre-wrap' }}>
          {rephrased}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button style={smallBtn('#DFE1E6', '#344563')} onClick={() => setStatus('idle')}>
            Discard
          </button>
          <button
            style={smallBtn('#5243AA', '#fff')}
            onClick={() => { onAccept(rephrased); setStatus('idle'); }}
          >
            Accept
          </button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        style={smallBtn('#EAE6FF', '#5243AA')}
        onClick={handleRephrase}
        title="Use Glean AI to rephrase this field for Software clarity"
      >
        ✨ Rephrase with Glean
      </button>
    </div>
  );
};

export default GleanButton;
