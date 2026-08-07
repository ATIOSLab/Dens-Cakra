import { Activity, Crosshair, Network, Radar, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  officerOnly?: boolean;
};

const capabilities = [
  { icon: Radar, label: "Pemantauan", description: "Situasi dan aktivitas lapangan" },
  { icon: Network, label: "Analisis", description: "Relasi data dan jaringan informasi" },
  { icon: Crosshair, label: "Respons", description: "Kendali tindak lanjut terarah" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-cyan-400/35 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.12)]",
          compact ? "size-11" : "size-12",
        )}
      >
        <div className="absolute inset-[5px] rotate-45 border border-cyan-300/25" />
        <span className="relative font-mono text-sm font-black tracking-[-0.08em] text-cyan-200">DC</span>
      </div>
      <div className="min-w-0">
        <p className={cn("font-black tracking-[0.16em]", compact ? "text-lg text-foreground" : "text-xl text-white")}>
          DENS CAKRA
        </p>
        <p
          className={cn(
            "font-mono text-[9px] font-semibold uppercase tracking-[0.16em]",
            compact ? "text-muted-foreground" : "text-slate-400",
          )}
        >
          Velox et Exactus
        </p>
      </div>
    </div>
  );
}

export function AuthBrandPanel({ officerOnly = false }: AuthBrandPanelProps) {
  return (
    <>
      <div className="mb-1 flex w-full items-center justify-between gap-3 px-1 lg:hidden">
        <BrandMark compact />
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Sistem Aktif
        </div>
      </div>

      <section className="relative hidden min-h-[640px] overflow-hidden rounded-[28px] border border-cyan-300/10 bg-[#06111f] p-8 text-white shadow-[0_28px_80px_rgba(2,8,23,0.34)] lg:flex lg:flex-col lg:justify-between xl:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "linear-gradient(to bottom right, black, transparent 78%)",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-cyan-400/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-amber-400/[0.07] blur-[110px]" />

        <div className="relative flex items-start justify-between gap-5">
          <BrandMark />
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Sistem Aktif
          </div>
        </div>

        <div className="relative max-w-xl py-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Activity className="size-3.5" />
            {officerOnly ? "Gerbang Operasi Lapangan" : "Ruang Kerja Intelijen Terpadu"}
          </div>
          <h1 className="max-w-lg text-balance text-4xl font-black leading-[1.08] tracking-[-0.035em] xl:text-5xl">
            {officerOnly ? "Akses aman untuk operasi di wilayah." : "Kendali informasi dalam satu ruang operasi."}
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-sm leading-6 text-slate-300/85 xl:text-[15px]">
            {officerOnly
              ? "Kelola Jaring, laporan, penugasan, dan perkembangan wilayah melalui akses khusus Petugas Wilayah (Gaswil)."
              : "Satukan pemantauan, analisis, koordinasi, dan respons untuk mendukung keputusan yang cepat, terukur, dan dapat ditelusuri."}
          </p>

          <div className="mt-9 grid grid-cols-3 gap-3">
            {capabilities.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5 backdrop-blur-sm transition-colors hover:border-cyan-300/20 hover:bg-cyan-300/[0.055]"
              >
                <Icon className="size-4 text-cyan-300" />
                <p className="mt-3 text-xs font-bold text-slate-100">{label}</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-5 border-t border-white/[0.08] pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="size-4 text-emerald-300" />
            <span>Akses terlindungi dan aktivitas tercatat</span>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
            DENS Secure Gateway
          </span>
        </div>
      </section>
    </>
  );
}
