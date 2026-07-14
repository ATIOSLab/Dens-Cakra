const port = process.env.PORT || '3001';
const url = `http://127.0.0.1:${port}/api/v1/health/live`;

try {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Health endpoint returned HTTP ${response.status}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[healthcheck] ${message}`);
  process.exit(1);
}

