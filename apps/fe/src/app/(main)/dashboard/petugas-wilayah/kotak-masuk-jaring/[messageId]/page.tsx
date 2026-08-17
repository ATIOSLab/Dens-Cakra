import { IncomingDetailClient } from "./incoming-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ messageId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { messageId } = await params;
  return <IncomingDetailClient messageId={messageId} />;
}
