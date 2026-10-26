
/**
 * Reusable design-system Input component.
 */
export function Input({
  label,
  id,
  error,
  helperText,
  icon = null,
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-300 mb-1.5"
        >
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          required={required}
          className={`block w-full rounded-lg bg-slate-900 border text-slate-100 placeholder-slate-500 text-sm py-2 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-950 disabled:opacity-50 disabled:bg-slate-950 ${
            icon ? 'pl-9 pr-3' : 'px-3'
          } ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40 text-rose-100'
              : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
}

export default Input;
