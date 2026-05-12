import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath: string): Record<string, unknown> {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, unknown>): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function storageGet<T>(key: string): Promise<T | undefined> {
  const store = readJson(STORE_FILE);
  return store[key] as T | undefined;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  const store = readJson(STORE_FILE);
  store[key] = value;
  writeJson(STORE_FILE, store);
}

export async function storageGetSecret(key: string): Promise<string | undefined> {
  const store = readJson(SECRETS_FILE);
  return store[key] as string | undefined;
}

export async function storageSetSecret(key: string, value: string): Promise<void> {
  const store = readJson(SECRETS_FILE);
  store[key] = value;
  writeJson(SECRETS_FILE, store);
}
