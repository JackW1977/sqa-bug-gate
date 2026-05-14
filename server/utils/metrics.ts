import { storageGet, storageSet } from './storage';
import type { MetricRecord, MetricType, ValidationResult } from './SoftwareInstructionModel';

const METRICS_PREFIX = 'Software:metric:';
const METRICS_INDEX_KEY = 'Software:metrics:index';

async function appendMetricKey(key: string): Promise<void> {
  const index = (await storageGet<string[]>(METRICS_INDEX_KEY)) ?? [];
  index.push(key);
  // Keep the last 1000 metric keys to avoid unbounded growth
  await storageSet(METRICS_INDEX_KEY, index.slice(-1000));
}

async function persistMetric(record: MetricRecord): Promise<void> {
  const key = `${METRICS_PREFIX}${record.issueKey}:${Date.now()}`;
  await storageSet(key, record);
  await appendMetricKey(key);
  console.log('[Software Metrics]', JSON.stringify(record));
}

// ─── Public metric recorders ─────────────────────────────────────────────────

export async function recordChecklistResult(
  issueKey: string,
  result: ValidationResult,
): Promise<void> {
  const type: MetricType = 'checklist_result';
  const failingItems = result.items.filter((i) => !i.passed).map((i) => i.key);
  await persistMetric({
    issueKey,
    timestamp: new Date().toISOString(),
    type,
    data: { passed: result.passed, failingItems },
  });
}

export async function recordDuplicatePrevented(
  issueKey: string,
  duplicateKey: string,
): Promise<void> {
  const type: MetricType = 'duplicate_prevented';
  await persistMetric({
    issueKey,
    timestamp: new Date().toISOString(),
    type,
    data: { duplicateKey },
  });
}

export async function recordMissingInfo(
  issueKey: string,
  failures: string[],
): Promise<void> {
  const type: MetricType = 'missing_info';
  await persistMetric({
    issueKey,
    timestamp: new Date().toISOString(),
    type,
    data: { failures },
  });
}

export async function getMetrics(limit = 100): Promise<MetricRecord[]> {
  const index = (await storageGet<string[]>(METRICS_INDEX_KEY)) ?? [];
  const keys = index.slice(-limit);
  const records = await Promise.all(
    keys.map(async (k) => storageGet<MetricRecord>(k)),
  );
  return records.filter((r): r is MetricRecord => r !== undefined);
}
