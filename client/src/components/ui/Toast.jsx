import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

const COLORS = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed bottom-6 right-6 z-[10001] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`${COLORS[t.type] || COLORS.info} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium slide-in max-w-xs`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
