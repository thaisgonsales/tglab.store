import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-0.5",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-fg shadow-[0_7px_18px_rgba(217,92,130,.18)] hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_10px_24px_rgba(217,92,130,.25)]",
        secondary:
          "bg-surface-muted text-brand hover:-translate-y-0.5 hover:bg-[#f4e4ea]",
        outline:
          "border border-brand/35 bg-white/70 text-brand hover:-translate-y-0.5 hover:border-brand hover:bg-surface-muted",
        ghost: "hover:bg-surface-muted hover:text-brand",
        danger: "bg-red-600 text-white hover:bg-red-700",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
