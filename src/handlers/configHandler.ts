import { getAppConfig, saveAppConfig } from '../utils/config';
import { getProjects } from '../utils/jiraClient';
import type { AppConfig } from '../utils/sqaInstructionModel';

export async function getConfig(): Promise<{ success: boolean; config?: AppConfig; error?: string }> {
  try {
    const config = await getAppConfig();
    return { success: true, config };
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
  error?: string;
}> {
  try {
    const projects = await getProjects();
    return { success: true, projects };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
