import React from 'react';

interface GateStatusProps {
  passed: boolean;
  lastChecked?: string;
}

const GateStatus: React.FC<GateStatusProps> = ({ passed, lastChecked }) => {
  const bg = passed ? '#E3FCEF' : '#FFEBE6';
  const border = passed ? '#00875A' : '#DE350B';
  const color = passed ? '#006644' : '#BF2600';
  const label = passed ? '✓ SQA GATE: PASSED' : '✗ SQA GATE: FAILED';

  return (
    <div style={{
      background: bg, border: `2px solid ${border}`, borderRadius: '6px',
      padding: '12px 16px', marginBottom: '16px',
    }}>
      <div style={{ fontWeight: 800, fontSize: '15px', color, letterSpacing: '0.3px' }}>
        {label}
      </div>
      {lastChecked && (
        <div style={{ fontSize: '11px', color: '#6B778C', marginTop: '4px' }}>
          Last checked: {new Date(lastChecked).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default GateStatus;
