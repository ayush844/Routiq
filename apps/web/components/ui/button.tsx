import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[20px] text-base font-medium tracking-[-0.02em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[1.5px] border-ink bg-ink text-canvas hover:bg-charcoal",
        secondary:
          "border-[1.5px] border-ink bg-white text-ink hover:bg-lifted",
        ghost: "text-muted hover:text-ink hover:bg-ink/5",
        outline:
          "border-[1.5px] border-ink bg-transparent text-ink hover:bg-lifted",
        signal:
          "border-[1.5px] border-signal bg-signal text-white shadow-lg shadow-signal/25 hover:border-signal-light hover:bg-signal-light",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
