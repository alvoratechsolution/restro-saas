import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
  labelClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, labelClassName = "", rows = 3, ...props }, ref) => {
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
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full ${bgClass} border ${borderClass} ${textClass} rounded-xl px-4 py-3 text-base sm:text-sm transition-all duration-200 focus:outline-none focus:ring-4 placeholder-slate-400 min-h-[90px] resize-y ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
