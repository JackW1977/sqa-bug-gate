import { storage } from '@forge/api';
import type { AppConfig, CategoryConfig } from './sqaInstructionModel';

const CONFIG_STORAGE_KEY = 'sqa:appConfig';

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    value: 'R&C',
    label: 'R&C – Robotic & Camera',
    subCategories: [{ value: 'BC', label: 'BC (Bronchoscope)' }],
  },
  {
    value: 'RA',
    label: 'RA – Robot Arm',
    subCategories: [{ value: 'Robot Arm', label: 'Robot Arm' }],
  },
  {
    value: 'WC',
    label: 'WC – Wire Controller',
    subCategories: [{ value: 'Wire Controller', label: 'Wire Controller' }],
  },
  {
    value: 'TPS',
    label: 'TPS – Treatment Planning System',
    subCategories: [{ value: 'WF', label: 'WF (Workflow)' }],
  },
  {
    value: 'PL',
    label: 'PL – Planning',
    subCategories: [{ value: 'Planning', label: 'Planning' }],
  },
  {
    value: 'SG',
    label: 'SG – Segmentation',
    subCategories: [{ value: 'Segmentation', label: 'Segmentation' }],
  },
  {
    value: 'TDS',
    label: 'TDS – Treatment Delivery System',
    subCategories: [{ value: 'IM', label: 'IM (Imaging)' }],
  },
  {
    value: 'WF',
    label: 'WF – Workflow',
    subCategories: [{ value: 'Workflow', label: 'Workflow' }],
  },
  {
    value: 'LOG',
    label: 'LOG – Logging / Diagnostics',
    subCategories: [{ value: 'NA', label: 'N/A' }],
  },
  {
    value: 'UI/UX',
    label: 'UI/UX – User Interface',
    subCategories: [{ value: 'NA', label: 'N/A' }],
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  governedProjects: [],
  governedIssueTypes: ['Bug'],
  gatedStatuses: ['Ready for Triage', 'Ready for Dev', 'Triage'],
  categories: DEFAULT_CATEGORIES,
};

export async function getAppConfig(): Promise<AppConfig> {
  const stored = await storage.get(CONFIG_STORAGE_KEY) as AppConfig | undefined;
  if (!stored) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  const current = await getAppConfig();
  const updated = { ...current, ...config };
  await storage.set(CONFIG_STORAGE_KEY, updated);
  return updated;
}

export function isGoverned(
  projectKey: string,
  issueType: string,
  config: AppConfig,
): boolean {
  const projectOk =
    config.governedProjects.length === 0 ||
    config.governedProjects.includes(projectKey);
  const typeOk = config.governedIssueTypes
    .map((t) => t.toLowerCase())
    .includes(issueType.toLowerCase());
  return projectOk && typeOk;
}

export function isGatedStatus(status: string, config: AppConfig): boolean {
  return config.gatedStatuses
    .map((s) => s.toLowerCase())
    .includes(status.toLowerCase());
}
