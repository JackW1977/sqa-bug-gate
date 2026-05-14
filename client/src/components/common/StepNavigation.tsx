import React from 'react';

interface StepNavigationProps {
  stepIndex: number;
  totalSteps: number;
  canGoNext: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const btn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
};

const StepNavigation: React.FC<StepNavigationProps> = ({
  stepIndex,
  canGoNext,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #DFE1E6' }}>
    <button
      style={{ ...btn, background: '#F4F5F7', color: '#344563' }}
      onClick={onBack}
      disabled={stepIndex === 0}
    >
      ← Back
    </button>

    {isLastStep ? (
      <button
        style={{ ...btn, background: canGoNext ? '#0052CC' : '#B3D4FF', color: '#fff' }}
        onClick={onSubmit}
        disabled={!canGoNext || isSubmitting}
      >
        {isSubmitting ? 'Creating Bug…' : '✓ Create Software Bug'}
      </button>
    ) : (
      <button
        style={{ ...btn, background: canGoNext ? '#0052CC' : '#B3D4FF', color: '#fff' }}
        onClick={onNext}
        disabled={!canGoNext}
      >
        Next →
      </button>
    )}
  </div>
);

export default StepNavigation;
