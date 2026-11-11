import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const TONE_STYLES = {
  success: {
    container: 'bg-[#0B1325]/92 border-emerald-500/40 text-emerald-100 shadow-[0_14px_34px_rgba(0,0,0,0.65)]',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400'
  },
  error: {
    container: 'bg-[#0B1325]/92 border-rose-500/40 text-rose-100 shadow-[0_14px_34px_rgba(0,0,0,0.65)]',
    icon: AlertCircle,
    iconColor: 'text-rose-400'
  },
  warning: {
    container: 'bg-[#0B1325]/92 border-amber-500/40 text-amber-100 shadow-[0_14px_34px_rgba(0,0,0,0.65)]',
    icon: AlertTriangle,
    iconColor: 'text-amber-400'
  },
  info: {
    container: 'bg-[#0B1325]/92 border-white/15 text-slate-100 shadow-[0_14px_34px_rgba(0,0,0,0.65)]',
    icon: Info,
    iconColor: 'text-orange-400'
  }
};

/**
 * Provides non-blocking toast notifications and an accessible promise-based
 * confirmation dialog so actions work seamlessly across desktop and Android WebView.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message: String(message), type }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const toast = useMemo(() => ({
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration = 6000) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration)
  }), [showToast]);

  const confirm = useCallback((options) => {
    const config = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setConfirmState({
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure you want to proceed?',
        confirmLabel: config.confirmLabel || 'Confirm',
        cancelLabel: config.cancelLabel || 'Cancel',
        tone: config.tone || 'danger',
        resolve
      });
    });
  }, []);

  const handleConfirmChoice = useCallback((accepted) => {
    setConfirmState((current) => {
      if (current?.resolve) {
        current.resolve(accepted);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!confirmState) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleConfirmChoice(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, handleConfirmChoice]);

  return (
    <ToastContext.Provider value={{ showToast, toast, confirm }}>
      {children}

      {/* Non-blocking Toast Stack */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const style = TONE_STYLES[t.type] || TONE_STYLES.info;
          const IconComponent = style.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg transition-colors ${style.container}`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
              <p className="text-sm font-medium flex-1 leading-snug break-words">{t.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="p-0.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Accessible In-App Confirm Modal */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4"
          onClick={() => handleConfirmChoice(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="bg-[#0B1325]/98 border border-white/15 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] w-full max-w-md p-6 modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-white mb-2">
              {confirmState.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {confirmState.message}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-200 bg-white/[0.08] border border-white/15 hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmChoice(true)}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer ${
                  confirmState.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      toast: { success: () => {}, error: () => {}, warning: () => {}, info: () => {} },
      confirm: async (msg) => window.confirm(typeof msg === 'string' ? msg : msg?.message || 'Confirm?')
    };
  }
  return ctx;
}
