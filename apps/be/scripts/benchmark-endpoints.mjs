import { performance } from 'node:perf_hooks';

const baseUrl = process.env.BENCHMARK_BASE_URL?.replace(/\/$/, '');
const cookie = process.env.BENCHMARK_COOKIE;
const paths = (
  process.env.BENCHMARK_PATHS ??
  '/api/v1/health/ready,/api/v1/dashboard/briefing'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const iterations = Math.max(
  1,
  Number.parseInt(process.env.BENCHMARK_ITERATIONS ?? '30', 10),
);
const warmupIterations = Math.max(
  0,
  Number.parseInt(process.env.BENCHMARK_WARMUP_ITERATIONS ?? '3', 10),
);

if (!baseUrl || !cookie) {
  console.error(
    'Set BENCHMARK_BASE_URL and BENCHMARK_COOKIE. The cookie value is never printed.',
  );
  process.exitCode = 1;
} else {
  const percentile = (values, percentage) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)
    ];
  };

  const measure = async (path) => {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    const payload = await response.arrayBuffer();
    return {
      durationMs: performance.now() - startedAt,
      bytes: payload.byteLength,
      status: response.status,
      cacheStatus: response.headers.get('x-cache-status') ?? 'UNKNOWN',
    };
  };

  const results = [];
  for (const path of paths) {
    for (let index = 0; index < warmupIterations; index += 1) {
      await measure(path);
    }

    const samples = [];
    for (let index = 0; index < iterations; index += 1) {
      samples.push(await measure(path));
    }

    const durations = samples.map((sample) => sample.durationMs);
    results.push({
      path,
      requests: samples.length,
      statusCounts: Object.fromEntries(
        [...new Set(samples.map((sample) => sample.status))].map((status) => [
          status,
          samples.filter((sample) => sample.status === status).length,
        ]),
      ),
      cacheCounts: Object.fromEntries(
        [...new Set(samples.map((sample) => sample.cacheStatus))].map(
          (status) => [
            status,
            samples.filter((sample) => sample.cacheStatus === status).length,
          ],
        ),
      ),
      p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      averageBytes: Math.round(
        samples.reduce((sum, sample) => sum + sample.bytes, 0) / samples.length,
      ),
    });
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        iterations,
        warmupIterations,
        measuredAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}
