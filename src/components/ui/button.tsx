import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary";
type ButtonSize = "default" | "sm" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-cedar text-white shadow-lg shadow-cedar/20 hover:bg-palm disabled:hover:bg-cedar",
  destructive:
    "bg-rose-700 text-white shadow-lg shadow-rose-950/15 hover:bg-rose-800 disabled:hover:bg-rose-700",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-sm",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", type = "button", variant = "default", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
