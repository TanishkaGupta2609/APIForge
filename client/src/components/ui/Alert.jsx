
export function Alert({
  children,
  variant = 'info',
  title = null,
  onClose = null,
  className = '',
  ...props
}) {
  const variantStyles = {
    info: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200',
    success: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    danger: 'bg-rose-950/40 border-rose-800/60 text-rose-200',
  };

  const iconMap = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    danger: '✕',
  };

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
        variantStyles[variant] || variantStyles.info
      } ${className}`}
      {...props}
    >
      <div className="font-bold text-base leading-none select-none">
        {iconMap[variant] || iconMap.info}
      </div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-1">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs opacity-60 hover:opacity-100 transition p-1"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default Alert;
