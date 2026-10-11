import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.14em] transition-[background,color,border-color,transform] duration-200 disabled:pointer-events-none disabled:opacity-40 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        signal: "bg-signal text-signal-ink hover:bg-fg",
        outline: "border border-line-2 text-fg hover:border-fg hover:bg-fg/5",
        ghost: "text-fg-2 hover:text-fg",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3.5 text-[11px]", lg: "h-14 px-7 text-[13px]" },
    },
    defaultVariants: { variant: "signal", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { buttonVariants };
