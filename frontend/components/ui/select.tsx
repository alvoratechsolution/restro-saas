import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, options, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-bold text-slate-700 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-white border ${
              error ? "border-red-500 focus:ring-red-500/25" : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
            } text-slate-900 rounded-xl px-4 py-3 text-base sm:text-sm transition-all duration-200 focus:outline-none focus:ring-4 appearance-none cursor-pointer pr-10 ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900 py-1">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
