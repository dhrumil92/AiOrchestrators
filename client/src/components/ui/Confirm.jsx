import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmCtx = createContext(async () => false);
/** const confirm = useConfirm(); if (await confirm({ title, message })) … */
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);
  const okRef = useRef(null);
  const cancelRef = useRef(null);
  const prevFocus = useRef(null);

  const confirm = useCallback(o => new Promise(resolve => {
    prevFocus.current = document.activeElement;
    resolver.current = resolve;
    setOpts({ confirmText: 'Confirm', icon: '✅', danger: false, message: '', ...o });
  }), []);

  const close = useCallback(v => {
    setOpts(null);
    resolver.current?.(v);
    resolver.current = null;
    prevFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!opts) return;
    okRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === okRef.current ? cancelRef.current : okRef.current)?.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [opts, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="alertdialog" aria-modal="true" aria-labelledby="ui-confirm-title" aria-describedby="ui-confirm-msg"
          onClick={e => { if (e.target === e.currentTarget) close(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 bounce-in">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${opts.danger ? 'bg-red-100' : 'bg-green-100'}`} aria-hidden="true">{opts.icon}</div>
            <h2 id="ui-confirm-title" className="mt-4 font-extrabold text-gray-900 text-lg">{opts.title}</h2>
            <p id="ui-confirm-msg" className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{opts.message}</p>
            <div className="mt-6 flex gap-2 justify-end">
              <button ref={cancelRef} onClick={() => close(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</button>
              <button ref={okRef} onClick={() => close(true)} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white ${opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{opts.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
