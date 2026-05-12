import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, hint, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>
      {label}
      {required && <span style={{ color: '#DE350B', marginLeft: '4px' }}>*</span>}
    </label>
    {hint && (
      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#5E6C84' }}>{hint}</p>
    )}
    {children}
    {error && (
      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DE350B' }}>{error}</p>
    )}
  </div>
);

export default FormField;
