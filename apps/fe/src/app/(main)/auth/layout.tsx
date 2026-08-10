import type { ReactNode } from "react";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-50 p-4 text-foreground transition-colors duration-300 sm:p-6 dark:bg-zinc-950">
      <div className="flex w-full min-w-0 flex-col items-center justify-center">{children}</div>
    </main>
  );
}
