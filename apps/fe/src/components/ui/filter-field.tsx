"use client";

import React, { type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FilterFieldProps = {
  label: string;
  icon?: ComponentType<{ className?: string }> | ReactNode;
  htmlFor?: string;
  hint?: string;
  isActive?: boolean;
  children: ReactNode;
  className?: string;
};

export function FilterField({
  label,
  icon: IconOrElement,
  htmlFor,
  hint,
  isActive = false,
  children,
  className,
}: FilterFieldProps) {
  const renderIcon = () => {
    if (!IconOrElement) return null;
    if (React.isValidElement(IconOrElement) || typeof IconOrElement === "string" || typeof IconOrElement === "number") {
      return (
        <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
          {IconOrElement}
        </span>
      );
    }
    const IconComponent = IconOrElement as ComponentType<{ className?: string }>;
    return <IconComponent className={cn("size-3 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />;
  };

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-1">
        <label
          htmlFor={htmlFor}
          className={cn(
            "flex items-center gap-1.5 truncate font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors",
            isActive ? "text-primary font-bold" : "text-muted-foreground",
          )}
        >
          {renderIcon()}
          <span className="truncate">{label}</span>
        </label>
        {isActive && (
          <span
            aria-label="Filter aktif"
            className="size-1.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/25"
          />
        )}
      </div>
      {children}
      {hint ? <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
