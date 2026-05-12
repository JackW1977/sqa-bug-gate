import { getAppConfig, saveAppConfig, browseUrl, boardUrl } from '../utils/config';
import { getProjects, listProjectVersions, listProjectComponents, listProjectSprints } from '../utils/jiraClient';
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

export async function listVersions(payload: { projectKey: string }): Promise<{
  success: boolean;
  versions?: Array<{ id: string; name: string; released: boolean }>;
  error?: string;
}> {
  try {
    const versions = await listProjectVersions(payload.projectKey);
    return { success: true, versions };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function listComponents(payload: { projectKey: string }): Promise<{
  success: boolean;
  components?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const components = await listProjectComponents(payload.projectKey);
    return { success: true, components };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function listSprints(payload: { projectKey: string }): Promise<{
  success: boolean;
  sprints?: Array<{ id: string; name: string; state: string }>;
  error?: string;
}> {
  try {
    const sprints = await listProjectSprints(payload.projectKey);
    return { success: true, sprints };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
