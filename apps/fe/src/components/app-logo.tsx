import Image from "next/image";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

const logoSizes = {
  sm: { box: "size-7", image: 28 },
  md: { box: "size-9", image: 36 },
  lg: { box: "size-12", image: 48 },
  xl: { box: "size-16", image: 64 },
} as const;

const BRAND_LOGO_SRC = "/brand/bin-logo.svg";

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
        src={BRAND_LOGO_SRC}
        alt="Logo Badan Intelijen Negara"
        width={config.image}
        height={config.image}
        sizes={`${config.image}px`}
        priority={priority}
        unoptimized
        className={cn("size-full object-contain p-[2px]", imageClassName)}
      />
    </span>
  );
}
