export async function api<T>(endpoint: string, payload?: unknown): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    method: payload !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
