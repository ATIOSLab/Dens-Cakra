export function getBackendInternalUrl(): string {
  return (process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
}
