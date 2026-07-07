import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  User,
  Building2,
  ShieldCheck,
  Search,
  MapPin,
  Monitor,
  Radio,
  Lock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  {
    id: "super-admin",
    title: "Super Admin Nasional",
    subtitle: "SELURUH INDONESIA",
    icon: Globe,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    features: [
      "Seluruh Indonesia",
      "Seluruh BINDA",
      "Dashboard Nasional",
      "KPI Nasional",
      "Master Data",
    ],
    actionText: "MASUK SEBAGAI SUPER ADMIN",
    href: "/dashboard/default",
  },
  {
    id: "admin-nasional",
    title: "Administrator Nasional",
    subtitle: "NASIONAL",
    icon: User,
    iconColor: "text-cyan-500",
    iconBg: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
    features: ["Monitoring Nasional", "Laporan Nasional", "Monitoring BINDA"],
    actionText: "MASUK SEBAGAI ADMINISTRATOR",
    href: "/dashboard/default",
  },
  {
    id: "kabin-sumut",
    title: "Kepala BINDA Sumatera Utara",
    subtitle: "SUMATERA UTARA",
    icon: Building2,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-400/10",
    borderColor: "border-indigo-400/30",
    glow: "shadow-[0_0_15px_rgba(129,140,248,0.3)]",
    features: ["Dashboard BINDA", "KPI Wilayah", "Monitoring Personel"],
    actionText: "MASUK SEBAGAI KEPALA BINDA",
    href: "/dashboard/default",
  },
  {
    id: "admin-riau",
    title: "Admin BINDA Riau",
    subtitle: "RIAU",
    icon: ShieldCheck,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    glow: "shadow-[0_0_15px_rgba(96,165,250,0.3)]",
    features: ["Kelola Personel", "Verifikasi Laporan", "KPI Wilayah"],
    actionText: "MASUK SEBAGAI ADMIN BINDA",
    href: "/dashboard/default",
  },
  {
    id: "analis",
    title: "Analis Nasional",
    subtitle: "NASIONAL",
    icon: Search,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    features: ["Verifikasi", "Analisis", "Eskalasi"],
    actionText: "MASUK SEBAGAI ANALIS",
    href: "/dashboard/default",
  },
  {
    id: "koordinator",
    title: "Koordinator Wilayah",
    subtitle: "JAWA BARAT",
    icon: MapPin,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]",
    features: ["Monitoring Wilayah", "Monitoring Personel"],
    actionText: "MASUK SEBAGAI KOORDINATOR",
    href: "/dashboard/default",
  },
  {
    id: "operator",
    title: "Operator Command Center",
    subtitle: "PUSAT KOMANDO NASIONAL",
    icon: Monitor,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.3)]",
    features: ["Command Center", "Alert Center", "Incident Feed"],
    actionText: "MASUK COMMAND CENTER",
    href: "/dashboard/default",
  },
  {
    id: "personel",
    title: "Personel Lapangan",
    subtitle: "MOBILE APP DEMO",
    icon: Radio,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    features: ["Buat Laporan", "KPI Pribadi", "Panic Button"],
    actionText: "MASUK APLIKASI MOBILE",
    href: "/dashboard/default",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050B14] text-slate-300 font-sans relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dotted Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at center, #334155 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      
      {/* Top Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-12 flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="flex flex-col items-center justify-center text-center space-y-6 pt-8 pb-16">
          <div className="w-36 h-36 rounded-full bg-slate-900/80 border border-slate-700/50 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden p-0">
            <Image
              src="/logo-badan-intelijen-negara.png"
              alt="Logo Badan Intelijen Negara"
              width={144}
              height={144}
              className="object-contain scale-125 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              priority
            />
          </div>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400"
            style={{ textShadow: "0 0 40px rgba(6,182,212,0.4)" }}
          >
            DENS CAKRA
          </h1>
          
          <p className="text-slate-400 text-xs md:text-sm tracking-[0.15em] max-w-3xl font-mono uppercase leading-relaxed">
            Dashboard Evaluasi Nasional dan Situational Awareness -<br className="hidden md:block" /> Command, Analytic, Knowledge, Response & Awareness
          </p>
          
          <p className="text-slate-500 italic font-serif mt-2 tracking-wide">
            "Velox Et Exactus"
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-8 border-b border-slate-800/60 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm md:text-base tracking-[0.2em] uppercase font-semibold text-slate-300">Masuk Sebagai</h2>
            <span className="text-[10px] md:text-xs px-2.5 py-1 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10 font-mono tracking-wider">
              MODE DEMO
            </span>
          </div>
          <Button 
            variant="outline" 
            className="border-slate-700/50 hover:bg-slate-800/80 hover:text-white text-slate-400 bg-slate-900/50 transition-all font-mono tracking-wider text-xs h-9"
          >
            <Lock className="w-3.5 h-3.5 mr-2" /> Login Enterprise
          </Button>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pb-20">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className="relative group rounded-xl border border-slate-800/60 bg-[#0B1221]/80 backdrop-blur-md p-6 flex flex-col transition-all duration-300 hover:border-slate-700 hover:bg-[#0E1629] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
            >
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-8">
                <div className={`p-3 rounded-full border ${role.borderColor} ${role.iconBg} ${role.glow} transition-all duration-300 group-hover:scale-110`}>
                  <role.icon className={`w-6 h-6 ${role.iconColor}`} />
                </div>
                <div className="flex-1 mt-1">
                  <h3 className="text-slate-200 font-semibold text-sm leading-tight">{role.title}</h3>
                  <p className="text-slate-500 text-[10px] tracking-[0.15em] uppercase mt-1.5 font-mono">
                    {role.subtitle}
                  </p>
                </div>
              </div>

              {/* Features List */}
              <div className="mb-8 flex-1">
                <p className="text-slate-500 text-[10px] tracking-[0.2em] uppercase mb-4 font-semibold">Hak Akses</p>
                <ul className="space-y-3">
                  {role.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300/80 group-hover:text-slate-200 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-blue-500/80 shrink-0 mt-0.5" />
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card Action */}
              <Link 
                href={role.href} 
                className="group-hover:text-cyan-400 text-slate-500 text-[10px] tracking-[0.15em] uppercase font-bold flex items-center justify-between pt-5 border-t border-slate-800/50 mt-auto transition-colors"
              >
                {role.actionText}
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-auto flex flex-col items-center justify-center text-center space-y-2 pt-8 pb-4 opacity-60">
          <p className="text-slate-400 text-xs tracking-[0.2em] font-semibold uppercase">
            National Intelligence Monitoring Platform
          </p>
        </footer>
      </main>
    </div>
  );
}
