import React from 'react';
import type { WizardStepMeta } from '../types';

interface WizardProgressProps {
  steps: WizardStepMeta[];
  currentIndex: number;
  onNavigate?: (index: number) => void;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentIndex, onNavigate }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
    {steps.map((step, idx) => {
      const done = idx < currentIndex;
      const active = idx === currentIndex;
      return (
        <React.Fragment key={step.id}>
          <div
            onClick={() => onNavigate?.(idx)}
            title={`Go to: ${step.label}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px',
              cursor: onNavigate ? 'pointer' : 'default',
              borderRadius: '4px', padding: '3px 2px',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => { if (onNavigate) e.currentTarget.style.background = 'rgba(0,82,204,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              background: done ? '#00875A' : active ? '#0052CC' : '#DFE1E6',
              color: done || active ? '#fff' : '#6B778C',
              boxShadow: active ? '0 0 0 3px rgba(0,82,204,0.2)' : 'none',
              transition: 'box-shadow 0.15s',
            }}>
              {done ? '✓' : idx + 1}
            </div>
            <span style={{
              fontSize: '10px', marginTop: '4px', textAlign: 'center',
              fontWeight: active ? 700 : 400,
              color: active ? '#0052CC' : done ? '#00875A' : '#6B778C',
              whiteSpace: 'nowrap',
            }}>
              {step.label}
              {step.optional && <span style={{ color: '#B3BAC5' }}> *</span>}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: done ? '#00875A' : '#DFE1E6', minWidth: '12px', marginBottom: '16px' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export default WizardProgress;
