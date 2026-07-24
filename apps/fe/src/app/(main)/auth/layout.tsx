import type { ReactNode } from "react";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="h-screen max-h-screen w-full flex flex-col items-center justify-center relative bg-background dark:bg-[#020617] text-foreground overflow-hidden p-4 select-none transition-colors duration-300">
      {/* 1. Fine-mesh visual grid layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25] dark:opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20, 184, 255, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20, 184, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* 2. Ambient animated radial color glows (Cyber Blue & Gold) */}
      <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] bg-cyan-500/[0.04] dark:bg-cyan-500/[0.07] rounded-full blur-[140px] pointer-events-none animate-pulse duration-[7000ms]" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[55%] h-[55%] bg-amber-500/[0.03] dark:bg-amber-500/[0.05] rounded-full blur-[140px] pointer-events-none animate-pulse duration-[9000ms]" />
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-cyan-400/[0.03] dark:bg-[#14B8FF]/[0.05] rounded-full blur-[120px] pointer-events-none" />

      {/* 3. Noise / Grain density overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12] dark:opacity-[0.18]"
        style={{
          backgroundImage: `radial-gradient(rgba(20, 184, 255, 0.1) 0.5px, transparent 0.5px)`,
          backgroundSize: "8px 8px",
        }}
      />

      {/* Dynamic Children Content (Centered Login/Auth Views) */}
      <div className="w-full flex flex-col items-center justify-center relative z-10">{children}</div>
    </main>
  );
}
