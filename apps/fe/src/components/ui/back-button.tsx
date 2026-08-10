"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  href?: string;
  label?: string;
  icon?: ReactNode;
  variant?: "outline" | "ghost";
  preserveScroll?: boolean;
  className?: string;
}

export function BackButton({
  href,
  label = "Kembali",
  icon = <ArrowLeft className="size-3.5" />,
  variant = "outline",
  preserveScroll = true,
  className,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(href ?? "/dashboard", { scroll: !preserveScroll });
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-xs text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
