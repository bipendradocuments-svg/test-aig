import { createContext, useContext } from 'react';

export interface ToastContextValue {
  showToast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}
