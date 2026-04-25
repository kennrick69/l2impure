import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, hint, error, className, id, ...props }, ref) {
    const inputId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-display text-[11px] font-semibold uppercase tracking-[1px] text-white/60"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-[21px] py-[13px] text-base text-white placeholder:text-white/35 transition focus:border-[color:var(--l2-text-gold)] focus:outline-none focus:ring-2 focus:ring-[color:var(--l2-text-gold)]/15",
            error && "border-l2-red focus:border-l2-red focus:ring-l2-red/15",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <span className="text-xs text-white/45">{hint}</span>
        )}
        {error && <span className="text-xs text-l2-red">{error}</span>}
      </div>
    );
  },
);
