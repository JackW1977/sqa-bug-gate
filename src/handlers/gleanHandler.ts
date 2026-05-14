import { storage } from '@forge/api';

// ── Token management ──────────────────────────────────────────────────────────

export async function setGleanToken(
  payload: { token: string; baseUrl: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await storage.setSecret('gleanToken', payload.token.trim());
    await storage.set('gleanBaseUrl', payload.baseUrl.trim());
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getGleanTokenStatus(): Promise<{ tokenConfigured: boolean }> {
  try {
    const token = await storage.getSecret('gleanToken');
    return { tokenConfigured: !!token };
  } catch {
    return { tokenConfigured: false };
  }
}

// ── Rephrase ──────────────────────────────────────────────────────────────────

interface RephrasePayload {
  text: string;
  fieldContext: string;
}

interface RephraseResult {
  success: boolean;
  rephrased?: string;
  error?: string;
}

const Software_SYSTEM_PROMPT =
  'You are an Software technical writer for a medical device software company. ' +
  'Your task is to rephrase the provided text to be clear, precise, and professional, ' +
  'suitable for IEC 62304 / ISO 14971 documentation. ' +
  'Preserve all technical details, version numbers, hardware names, error messages, ' +
  'file names, and IDs exactly as given. ' +
  'Return only the rephrased text — no preamble, explanation, or quotation marks.';

export async function rephraseWithGlean({ text, fieldContext }: RephrasePayload): Promise<RephraseResult> {
  if (!text.trim()) return { success: false, error: 'No text to rephrase.' };

  let token: string | undefined;
  let baseUrl: string | undefined;

  try {
    token = await storage.getSecret('gleanToken');
    baseUrl = await storage.get<string>('gleanBaseUrl');
  } catch {
    return { success: false, error: 'Could not read Glean credentials from storage.' };
  }

  if (!token || !baseUrl) {
    return {
      success: false,
      error: 'Glean is not configured. Add your Glean API token and base URL in the admin settings.',
    };
  }

  const prompt = `${Software_SYSTEM_PROMPT}\n\nField context: "${fieldContext}"\n\nText to rephrase:\n${text}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ author: 'USER', fragments: [{ text: prompt }] }],
        stream: false,
      }),
    });
  } catch (e) {
    return { success: false, error: `Glean connection failed: ${String(e)}` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      success: false,
      error: `Glean API error ${response.status}${body ? ': ' + body.slice(0, 120) : ''}`,
    };
  }

  let data: { messages?: Array<{ author: string; fragments?: Array<{ text: string }> }> };
  try {
    data = await response.json() as typeof data;
  } catch {
    return { success: false, error: 'Could not parse Glean response.' };
  }

  const rephrased = data.messages
    ?.find((m) => m.author !== 'USER')
    ?.fragments?.[0]?.text;

  if (!rephrased) return { success: false, error: 'Glean returned an empty response.' };

  return { success: true, rephrased: rephrased.trim() };
}
