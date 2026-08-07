import type { ReactNode } from "react";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-x-hidden bg-[#f4f7fa] p-4 py-6 text-foreground transition-colors duration-300 select-none sm:p-6 lg:p-8 dark:bg-[#020817]">
      {/* 1. Fine-mesh visual grid layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28] dark:opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20, 184, 255, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20, 184, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* 2. Ambient animated radial color glows (Cyber Blue & Gold) */}
      <div className="pointer-events-none absolute -left-[10%] -top-[20%] h-[55%] w-[55%] animate-pulse rounded-full bg-cyan-500/[0.04] blur-[140px] duration-[7000ms] motion-reduce:animate-none dark:bg-cyan-500/[0.07]" />
      <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] h-[55%] w-[55%] animate-pulse rounded-full bg-amber-500/[0.03] blur-[140px] duration-[9000ms] motion-reduce:animate-none dark:bg-amber-500/[0.05]" />
      <div className="pointer-events-none absolute left-[50%] top-[30%] h-[40%] w-[40%] -translate-x-1/2 rounded-full bg-cyan-400/[0.03] blur-[120px] dark:bg-[#14B8FF]/[0.05]" />

      {/* 3. Noise / Grain density overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.18]"
        style={{
          backgroundImage: `radial-gradient(rgba(20, 184, 255, 0.1) 0.5px, transparent 0.5px)`,
          backgroundSize: "8px 8px",
        }}
      />

      {/* Dynamic Children Content (Centered Login/Auth Views) */}
      <div className="relative z-10 flex w-full min-w-0 flex-col items-center justify-center">{children}</div>
    </main>
  );
}
