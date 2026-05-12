import React from 'react';

type Appearance = 'error' | 'warning' | 'info' | 'success';

const COLOURS: Record<Appearance, { bg: string; border: string; text: string }> = {
  error:   { bg: '#FFEBE6', border: '#DE350B', text: '#BF2600' },
  warning: { bg: '#FFFAE6', border: '#FF8B00', text: '#974F0C' },
  info:    { bg: '#DEEBFF', border: '#0052CC', text: '#0747A6' },
  success: { bg: '#E3FCEF', border: '#00875A', text: '#006644' },
};

interface ValidationMessageProps {
  appearance?: Appearance;
  title?: string;
  children: React.ReactNode;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  appearance = 'error',
  title,
  children,
}) => {
  const c = COLOURS[appearance];
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '4px',
      padding: '12px 16px',
      marginBottom: '16px',
      color: c.text,
      fontSize: '14px',
    }}>
      {title && <strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>}
      {children}
    </div>
  );
};

export default ValidationMessage;
