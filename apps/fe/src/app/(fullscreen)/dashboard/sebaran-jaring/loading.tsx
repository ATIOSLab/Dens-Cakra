export default function Loading() {
  return (
    <main className="min-h-screen bg-[#07101d] p-4 text-white">
      <div className="h-14 animate-pulse rounded-lg border border-white/10 bg-white/5" />
      <div className="mt-4 h-[calc(100vh-6rem)] animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
    </main>
  );
}
