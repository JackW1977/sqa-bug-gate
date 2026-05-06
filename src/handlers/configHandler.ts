import { getAppConfig, saveAppConfig, browseUrl, boardUrl } from '../utils/config';
import { getProjects } from '../utils/jiraClient';
import type { AppConfig } from '../utils/sqaInstructionModel';

export async function getConfig(): Promise<{
  success: boolean;
  config?: AppConfig;
  jiraSiteUrl?: string;
  boardUrl?: string;
  error?: string;
}> {
  try {
    const config = await getAppConfig();
    return {
      success: true,
      config,
      jiraSiteUrl: config.jiraSiteUrl,
      boardUrl: config.governedProjects[0]
        ? boardUrl(config.governedProjects[0], config)
        : undefined,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateConfig(
  payload: Partial<AppConfig>,
): Promise<{ success: boolean; config?: AppConfig; error?: string }> {
  try {
    const updated = await saveAppConfig(payload);
    return { success: true, config: updated };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function listProjects(): Promise<{
  success: boolean;
  projects?: Array<{ key: string; name: string }>;
  jiraSiteUrl?: string;
  error?: string;
}> {
  try {
    const [projects, config] = await Promise.all([getProjects(), getAppConfig()]);
    return { success: true, projects, jiraSiteUrl: config.jiraSiteUrl };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Returns the browse URL for a given issue key using stored config. */
export async function getIssueUrl(issueKey: string): Promise<{ url: string }> {
  const config = await getAppConfig();
  return { url: browseUrl(issueKey, config) };
}
