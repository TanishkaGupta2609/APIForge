import { useEffect } from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          className={`relative w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-10 text-left transition-all my-auto`}
        >
          <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-800 shrink-0">
            <div>
              {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
              {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-lg p-1 text-sm hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 text-sm text-slate-200">
            {children}
          </div>

          {footer && (
            <div className="p-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
