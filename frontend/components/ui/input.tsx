import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, labelClassName = "", type = "text", ...props }, ref) => {
    const hasCustomBg = /(^|\s)bg-/.test(className);
    const hasCustomText = /(^|\s)text-/.test(className);
    const hasCustomBorder = /(^|\s)border-/.test(className);

    const bgClass = hasCustomBg ? "" : "bg-white";
    const textClass = hasCustomText ? "" : "text-slate-900";
    const borderClass = hasCustomBorder
      ? ""
      : error
      ? "border-red-500 focus:ring-red-500/25"
      : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500";

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className={`text-xs font-bold text-slate-700 tracking-wide ${labelClassName}`}>
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full ${bgClass} border ${borderClass} ${textClass} rounded-xl px-4 py-3 text-base sm:text-sm transition-all duration-200 focus:outline-none focus:ring-4 placeholder-slate-400 ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
