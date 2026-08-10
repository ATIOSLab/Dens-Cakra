import Image from "next/image";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

const logoSizes = {
  sm: { box: "size-7", image: 28, src: "/brand/bin-logo-64.png" },
  md: { box: "size-9", image: 36, src: "/brand/bin-logo-96.png" },
  lg: { box: "size-12", image: 48, src: "/brand/bin-logo-128.png" },
  xl: { box: "size-16", image: 64, src: "/brand/bin-logo-192.png" },
} as const;

export function AppLogo({ size = "md", className, imageClassName, priority = false }: AppLogoProps) {
  const config = logoSizes[size];

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-400/30 bg-slate-950/75 shadow-[0_0_18px_rgba(20,184,255,0.16)]",
        config.box,
        className,
      )}
    >
      <Image
        src={config.src}
        alt="Logo Badan Intelijen Negara"
        width={config.image}
        height={config.image}
        sizes={`${config.image}px`}
        priority={priority}
        className={cn("size-full object-contain p-[2px]", imageClassName)}
      />
    </span>
  );
}
