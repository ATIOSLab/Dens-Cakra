import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestCacheStatus = 'BYPASS' | 'HIT' | 'MISS' | 'ERROR';

type PerformanceContext = {
  requestId: string;
  cacheStatus: RequestCacheStatus;
};

const storage = new AsyncLocalStorage<PerformanceContext>();

const CACHE_STATUS_PRIORITY: Record<RequestCacheStatus, number> = {
  BYPASS: 0,
  HIT: 1,
  MISS: 2,
  ERROR: 3,
};

export function runWithPerformanceContext(
  requestId: string,
  callback: () => void,
): void {
  storage.run({ requestId, cacheStatus: 'BYPASS' }, callback);
}

export function getPerformanceContext(): PerformanceContext | undefined {
  return storage.getStore();
}

export function markRequestCacheStatus(status: RequestCacheStatus): void {
  const context = storage.getStore();
  if (
    context &&
    CACHE_STATUS_PRIORITY[status] > CACHE_STATUS_PRIORITY[context.cacheStatus]
  ) {
    context.cacheStatus = status;
  }
}
