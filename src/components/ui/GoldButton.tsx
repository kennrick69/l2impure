import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "default" | "small" | "large" | "full";

export type GoldButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  function GoldButton(
    { variant = "primary", size = "default", className, children, ...props },
    ref,
  ) {
    const variantCls =
      variant === "primary"
        ? "text-black shadow-[0_5px_21px_rgba(212,161,74,0.25)] hover:-translate-y-0.5 hover:brightness-110"
        : variant === "outline"
          ? "border border-white/15 text-white hover:border-[color:var(--l2-text-gold)] hover:text-[color:var(--l2-text-gold)]"
          : "text-white/70 hover:text-[color:var(--l2-text-gold)]";
    const sizeCls =
      size === "small"
        ? "h-9 px-4 text-xs"
        : size === "large"
          ? "h-14 px-10 text-base"
          : size === "full"
            ? "h-12 w-full px-6 text-sm"
            : "h-11 px-6 text-sm";

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold uppercase tracking-[1px] transition disabled:cursor-not-allowed disabled:opacity-50",
          variantCls,
          sizeCls,
          className,
        )}
        style={
          variant === "primary"
            ? {
                background:
                  "linear-gradient(135deg, #e6b55a 0%, #d4a14a 50%, #b8862e 100%)",
              }
            : undefined
        }
        {...props}
      >
        {children}
      </button>
    );
  },
);
