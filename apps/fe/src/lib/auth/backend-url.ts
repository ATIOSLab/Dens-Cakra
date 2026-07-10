export function getBackendInternalUrl(): string {
  return (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001").replace(/\/$/, "");
}
