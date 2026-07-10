type ComingSoonPageProps = {
  title?: string;
  description?: string;
};

export function ComingSoonPage({
  title = "Coming Soon",
  description = "Halaman ini sedang disiapkan dan akan segera tersedia pada pembaruan berikutnya.",
}: ComingSoonPageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">{title}</h1>
      <p className="max-w-xl text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Page() {
  return <ComingSoonPage />;
}
