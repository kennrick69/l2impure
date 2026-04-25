"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; msg: string; type: ToastType };

const ToastContext = createContext<{
  show: (msg: string, type?: ToastType) => void;
}>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((msg: string, type: ToastType = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[10000] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastBubble key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const colors =
    toast.type === "success"
      ? { bg: "#1a3a2a", border: "#4ade80", text: "#4ade80" }
      : toast.type === "info"
        ? { bg: "#1a253a", border: "#60a5fa", text: "#60a5fa" }
        : { bg: "#3a1a1a", border: "#ef4444", text: "#ef4444" };
  return (
    <div
      className="pointer-events-auto rounded-lg border px-5 py-3 text-sm font-semibold transition-opacity duration-300"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        opacity: visible ? 1 : 0,
        minWidth: 220,
      }}
    >
      {toast.msg}
    </div>
  );
}
