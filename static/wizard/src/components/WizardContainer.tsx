import React, { useState } from 'react';
import { invoke } from '@forge/bridge';
import type { AppConfig, SQABugData } from '../types';
import { INITIAL_BUG_DATA, WIZARD_STEPS } from '../types';
import WizardProgress from './WizardProgress';
import StepNavigation from './common/StepNavigation';
import ValidationMessage from './common/ValidationMessage';

// Step components
import Step1Summary from './steps/Step1Summary';
import Step2Preconditions from './steps/Step3Preconditions';
import Step3ExpectedActual from './steps/Step5ExpectedActual';
import Step4Evidence from './steps/Step7Evidence';
import Step8Traceability from './steps/Step8Traceability';
import StepDuplicateSearch from './steps/StepDuplicateSearch';
import StepChecklistReview from './steps/StepChecklistReview';

interface WizardContainerProps {
  config: AppConfig;
  projects: Array<{ key: string; name: string }>;
}

const WizardContainer: React.FC<WizardContainerProps> = ({ config, projects }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bugData, setBugData] = useState<SQABugData>({
    ...INITIAL_BUG_DATA,
    projectKey: config.defaultProject ?? config.governedProjects[0] ?? '',
  });
  const [stepValid, setStepValid] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = WIZARD_STEPS;
  const currentStep = steps[currentIndex];

  function updateBugData(patch: Partial<SQABugData>) {
    setBugData((prev) => ({ ...prev, ...patch }));
  }

  function setValid(valid: boolean) {
    setStepValid((prev) => ({ ...prev, [currentIndex]: valid }));
  }

  const isCurrentValid = stepValid[currentIndex] !== false;

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await invoke<{
        success: boolean;
        issueKey?: string;
        issueUrl?: string;
        error?: string;
        failingItems?: string[];
      }>('createBug', { bugData });

      if (result.success && result.issueKey) {
        setSubmittedKey(result.issueKey);
        setSubmittedUrl(result.issueUrl ?? null);
      } else {
        setSubmitError(result.error ?? 'Unknown error creating bug.');
      }
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (submittedKey) {
    return (
      <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ color: '#006644' }}>SQA Bug Created</h2>
        <p style={{ color: '#344563', fontSize: '16px' }}>
          <strong>{submittedKey}</strong> has been created and passes the SQA gate.
        </p>
        {submittedUrl && (
          <a
            href={submittedUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block', marginBottom: '12px', padding: '8px 18px',
              background: '#0052CC', color: '#fff', borderRadius: '4px',
              fontSize: '14px', textDecoration: 'none', fontWeight: 600,
            }}
          >
            Open {submittedKey} in Jira ↗
          </a>
        )}
        <p style={{ color: '#5E6C84', fontSize: '14px' }}>
          Remember to attach any screenshots, videos, and log files to the issue.
        </p>
        <button
          style={{
            marginTop: '8px', padding: '10px 20px', background: '#F4F5F7',
            color: '#344563', border: '1px solid #DFE1E6', borderRadius: '4px', fontSize: '14px', cursor: 'pointer',
          }}
          onClick={() => {
            setBugData({ ...INITIAL_BUG_DATA, projectKey: config.defaultProject ?? config.governedProjects[0] ?? '' });
            setStepValid({});
            setCurrentIndex(0);
            setSubmittedKey(null);
            setSubmittedUrl(null);
          }}
        >
          Create Another Bug
        </button>
      </div>
    );
  }

  // ─── Render current step ────────────────────────────────────────────────────
  const stepProps = { bugData, onChange: updateBugData, onValidate: setValid, config };

  const stepMap: Record<string, React.ReactNode> = {
    summary:          <Step1Summary {...stepProps} />,
    preconditions:    <Step2Preconditions {...stepProps} />,
    expectedActual:   <Step3ExpectedActual {...stepProps} />,
    evidence:         <Step4Evidence {...stepProps} />,
    traceability:     <Step8Traceability {...stepProps} />,
    duplicateSearch:  <StepDuplicateSearch {...stepProps} />,
    review:           <StepChecklistReview {...stepProps} isSubmitting={isSubmitting} onSubmit={handleSubmit} />,
  };

  const isLastStep = currentIndex === steps.length - 1;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h2 style={{ margin: '0 0 4px', color: '#172B4D' }}>New SQA Bug</h2>
      <p style={{ margin: '0 0 20px', color: '#5E6C84', fontSize: '13px' }}>
        Noah Medical SQA Bug Report Quality Gate — all mandatory sections must pass before submission.
      </p>

      <WizardProgress steps={steps} currentIndex={currentIndex} onNavigate={setCurrentIndex} />

      <div style={{ background: '#fff', border: '1px solid #DFE1E6', borderRadius: '4px', padding: '24px' }}>
        {submitError && (
          <ValidationMessage appearance="error" title="Submission failed">
            {submitError}
          </ValidationMessage>
        )}

        {stepMap[currentStep.id]}

        {!isLastStep && (
          <StepNavigation
            stepIndex={currentIndex}
            totalSteps={steps.length}
            canGoNext={isCurrentValid}
            isLastStep={false}
            onBack={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            onNext={() => setCurrentIndex((i) => Math.min(steps.length - 1, i + 1))}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default WizardContainer;
