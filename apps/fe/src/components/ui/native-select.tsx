import * as React from "react";

import { ChevronDownIcon } from "lucide-react";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
  isActive?: boolean;
};

function NativeSelect({
  className,
  size = "default",
  isActive: propIsActive,
  value,
  ...props
}: NativeSelectProps) {
  const isValueActive =
    propIsActive !== undefined
      ? propIsActive
      : Boolean(value !== undefined && value !== "ALL" && value !== "" && value !== "newest" && value !== "TODAY");

  return (
    <div
      className={cn(
        "group/native-select relative w-fit max-w-full has-[select:disabled]:opacity-50",
        className,
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        value={value}
        className={cn(
          DC_CONTROLS.selectTrigger,
          DC_TYPOGRAPHY.control,
          "w-full min-w-0 appearance-none py-1 pr-8 pl-2.5 outline-none select-none transition-colors selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=sm]:h-8 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&>option]:bg-background [&>option]:text-foreground dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100",
          isValueActive && "border-primary/45 bg-primary/[0.04] font-medium text-foreground dark:bg-primary/10 hover:border-primary/60",
        )}
        {...props}
      />
      <ChevronDownIcon
        className={cn(
          "pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none transition-colors",
          isValueActive && "text-primary/70",
        )}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-background text-foreground dark:bg-slate-900 dark:text-slate-100", className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
