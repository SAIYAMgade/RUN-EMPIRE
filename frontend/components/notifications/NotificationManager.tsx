import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, BellRing } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'alert';
  stolenByColor?: string;
}

export function NotificationManager() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const addToast = (message: string, type: 'success' | 'error' | 'alert', stolenByColor?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, message, type, stolenByColor };

      setToasts(prev => [newToast, ...prev].slice(0, 5));

      // Remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    // 1. Listen for generic toasts
    const handleToastEvent = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      addToast(message, type);
    };

    // 2. Listen for stole alerts
    const handleStolenAlert = (e: Event) => {
      const { tileKey, stolenBy, stolenByColor } = (e as CustomEvent).detail;
      addToast(`🔴 Warning! ${stolenBy} stole your territory at tile ${tileKey}!`, 'alert', stolenByColor);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('toast', handleToastEvent);
      window.addEventListener('stolen-alert', handleStolenAlert);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('toast', handleToastEvent);
        window.removeEventListener('stolen-alert', handleStolenAlert);
      }
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none select-none max-w-[90%] w-[380px]">
      {toasts.map((toast) => {
        const borderShadowColor = toast.type === 'success' 
          ? 'rgba(16,185,129,0.3)' 
          : toast.type === 'alert' 
          ? toast.stolenByColor || 'rgba(239,68,68,0.4)' 
          : 'rgba(244,63,94,0.3)';

        const bgClass = toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
          : toast.type === 'alert'
          ? 'bg-rose-950/90 border-rose-500/60 text-rose-100 font-bold animate-bounce'
          : 'bg-slate-950/95 border-rose-500/40 text-rose-300';

        return (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all duration-300 transform scale-100 translate-y-0`}
            style={{
              boxShadow: `0 0 20px ${borderShadowColor}`
            }}
          >
            {/* Icon */}
            <div className="shrink-0">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : toast.type === 'alert' ? (
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              )}
            </div>

            {/* Message */}
            <span className="text-xs flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
