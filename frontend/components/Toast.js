'use client';
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let _addToast = null;

export function toast(message, type = 'success', duration = 3500) {
  if (_addToast) _addToast(message, type, duration);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const iconMap = {
    success: <CheckCircle size={16} color="#10B981" />,
    error:   <AlertCircle size={16} color="#EF4444" />,
    info:    <Info size={16} color="#3B82F6" />,
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}${t.exiting ? ' toast-exit' : ''}`}
            role="alert"
          >
            {iconMap[t.type] || iconMap.info}
            <span className="toast-msg">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
