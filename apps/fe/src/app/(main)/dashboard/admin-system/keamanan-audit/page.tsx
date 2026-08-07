import type { AuditSearchParams } from "./_components/audit-types";
import KeamananAuditPage from "./_components/keamanan-audit-page";

export default async function Page({ searchParams }: { searchParams: Promise<AuditSearchParams> }) {
  return <KeamananAuditPage searchParams={await searchParams} />;
}
