import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext<{ show: (msg: string, error?: boolean) => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);
  const [visible, setVisible] = useState(false);

  const show = useCallback((m: string, error = false) => {
    setMsg(m);
    setErr(error);
    setVisible(true);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setVisible(false), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className={`toast ${visible ? 'show' : ''} ${err ? 'error' : ''}`}>{msg}</div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);