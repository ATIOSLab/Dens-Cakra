"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const PARTICLES = [
  { id: "north-1", className: "left-[8%] top-[14%] size-1.5", delay: 0 },
  { id: "north-2", className: "left-[22%] top-[8%] size-1", delay: 0.4 },
  { id: "north-3", className: "right-[18%] top-[12%] size-1.5", delay: 0.8 },
  { id: "east-1", className: "right-[9%] top-[38%] size-1", delay: 1.2 },
  { id: "east-2", className: "right-[16%] bottom-[24%] size-1.5", delay: 1.6 },
  { id: "south-1", className: "bottom-[12%] left-[16%] size-1", delay: 2 },
  { id: "south-2", className: "bottom-[18%] left-[42%] size-1.5", delay: 2.4 },
  { id: "west-1", className: "left-[10%] top-[48%] size-1", delay: 2.8 },
] as const;

type LoadingParticlesProps = {
  className?: string;
};

export function LoadingParticles({ className }: LoadingParticlesProps) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent"
        animate={{ opacity: [0.2, 0.7, 0.2], scaleX: [0.82, 1, 0.82] }}
        transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-y-8 left-1/2 w-px bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent"
        animate={{ opacity: [0.18, 0.55, 0.18], scaleY: [0.78, 1, 0.78] }}
        transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn(
            "absolute rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.75)] dark:bg-cyan-300",
            particle.className,
          )}
          animate={{
            opacity: [0.18, 1, 0.18],
            scale: [0.75, 1.35, 0.75],
            y: [0, -14, 0],
          }}
          transition={{
            delay: particle.delay,
            duration: 3.8,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </div>
  );
}
