import type { ReactNode } from "react";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-center relative bg-background overflow-hidden p-4 select-none">
      {/* 1. Fine-mesh visual grid layer */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.25] dark:opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20, 184, 255, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20, 184, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px"
        }}
      />

      {/* 2. Topographical wave contour layer (Subtle custom SVG data-URI) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.6]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cpath d='M0 20 Q40 40 80 20 T160 20 M0 60 Q40 80 80 60 T160 60 M0 100 Q40 120 80 100 T160 100 M0 140 Q40 160 80 140 T160 140' fill='none' stroke='rgba(20,184,255,0.025)' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px"
        }}
      />

      {/* 3. Noise / Grain density overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(rgba(20, 184, 255, 0.12) 0.5px, transparent 0.5px)`,
          backgroundSize: "8px 8px"
        }}
      />

      {/* 4. Ambient radial color glow circles */}
      <div className="absolute -top-[25%] -left-[15%] w-[60%] h-[60%] bg-cyan-500/[0.04] dark:bg-cyan-500/[0.08] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-[25%] -right-[15%] w-[60%] h-[60%] bg-[#14B8FF]/[0.04] dark:bg-[#14B8FF]/[0.08] rounded-full blur-[130px] pointer-events-none" />

      {/* Dynamic Children Content (Centred Login/Auth Views) */}
      <div className="w-full flex flex-col items-center justify-center relative z-10 animate-fade-in">
        {children}
      </div>
    </main>
  );
}
