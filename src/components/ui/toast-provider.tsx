import { Check } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { ToastContext } from '../../hooks/useToast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    window.clearTimeout((window as unknown as { __toastTimer?: number }).__toastTimer);
    (window as unknown as { __toastTimer?: number }).__toastTimer = window.setTimeout(() => {
      setMessage(null);
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-float md:bottom-8"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime text-ink">
            <Check className="h-3.5 w-3.5 stroke-[2.6]" />
          </span>
          <span>{message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
