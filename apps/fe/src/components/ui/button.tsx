import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm leading-none font-medium whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.8] [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--dc-primary)_70%,transparent),0_8px_20px_color-mix(in_srgb,var(--dc-primary)_16%,transparent)] hover:bg-[var(--dc-primary-hover)]",
        outline:
          "border-border bg-background/70 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/25 dark:hover:bg-input/45",
        secondary:
          "bg-secondary/85 text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        success:
          "border-[var(--dc-success)] bg-[color-mix(in_srgb,var(--dc-success)_70%,black)] text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--dc-success)_65%,transparent),0_8px_20px_color-mix(in_srgb,var(--dc-success)_16%,transparent)] hover:bg-[color-mix(in_srgb,var(--dc-success)_78%,black)] focus-visible:border-[var(--dc-success)] focus-visible:ring-[color-mix(in_srgb,var(--dc-success)_35%,transparent)]",
        warning:
          "border-[var(--dc-warning)] bg-[var(--dc-warning)] text-slate-950 shadow-[0_0_0_1px_color-mix(in_srgb,var(--dc-warning)_60%,transparent),0_8px_20px_color-mix(in_srgb,var(--dc-warning)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--dc-warning)_88%,black)] focus-visible:border-[var(--dc-warning)] focus-visible:ring-[color-mix(in_srgb,var(--dc-warning)_30%,transparent)]",
        ghost:
          "hover:bg-muted/75 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "border-[var(--dc-danger)] bg-[color-mix(in_srgb,var(--dc-danger)_78%,black)] text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--dc-danger)_65%,transparent),0_8px_20px_color-mix(in_srgb,var(--dc-danger)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--dc-danger)_85%,black)] focus-visible:border-[var(--dc-danger)] focus-visible:ring-[color-mix(in_srgb,var(--dc-danger)_30%,transparent)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-7 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type: buttonType,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const type = asChild ? undefined : (buttonType ?? "button")

  return (
    <Comp
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
