import { ComingSoonPage } from "@/app/(main)/dashboard/coming-soon/page";

type UniversalDensRoutePageProps = {
  routePattern: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildDescription(routePattern: string) {
  return `Halaman ${routePattern} sedang dinonaktifkan sementara dan akan digantikan pada implementasi berikutnya.`;
}

export function UniversalDensRoutePage({
  routePattern,
}: UniversalDensRoutePageProps) {
  return (
    <ComingSoonPage
      title="Coming Soon"
      description={buildDescription(routePattern)}
    />
  );
}

export default UniversalDensRoutePage;
