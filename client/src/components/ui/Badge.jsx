
/**
 * Reusable design-system Badge component with status presets.
 */
export function Badge({
  children,
  variant = 'neutral',
  status = null,
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const statusMap = {
    queued: { variant: 'warning', label: 'Queued' },
    running: { variant: 'info', label: 'Running' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    cancelled: { variant: 'neutral', label: 'Cancelled' },
    online: { variant: 'success', label: 'Online' },
    offline: { variant: 'danger', label: 'Offline' },
  };

  const activeVariant = status && statusMap[status] ? statusMap[status].variant : variant;
  const content = children || (status && statusMap[status]?.label) || status;

  const variantStyles = {
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
    danger: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
    info: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80',
    neutral: 'bg-slate-800/70 text-slate-300 border-slate-700/80',
  };

  const dotColor = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-indigo-400',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${
        variantStyles[activeVariant] || variantStyles.neutral
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColor[activeVariant] || dotColor.neutral}`}
        />
      )}
      {content}
    </span>
  );
}

export default Badge;
