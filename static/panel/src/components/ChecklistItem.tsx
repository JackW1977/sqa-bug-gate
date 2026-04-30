import React from 'react';

interface ChecklistItemProps {
  label: string;
  passed: boolean;
  message?: string;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ label, passed, message }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    padding: '8px 12px', borderBottom: '1px solid #F4F5F7',
    background: passed ? '#fff' : '#FFF4F4',
  }}>
    <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
      {passed ? '✅' : '❌'}
    </span>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '13px', fontWeight: passed ? 400 : 600,
        color: passed ? '#344563' : '#BF2600',
      }}>
        {label}
      </div>
      {!passed && message && (
        <div style={{ fontSize: '12px', color: '#DE350B', marginTop: '2px' }}>
          {message}
        </div>
      )}
    </div>
  </div>
);

export default ChecklistItem;
