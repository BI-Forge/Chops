import React, { createContext, useContext, useState, useCallback } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id'>) => void;
  removeAlert: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAlert: Alert = { ...alert, id };
    
    setAlerts((prev) => [...prev, newAlert]);

    // Auto remove after duration
    const duration = alert.duration || 5000;
    setTimeout(() => {
      removeAlert(id);
    }, duration);
  }, [removeAlert]);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addAlert({ type: 'success', title, message, duration });
  }, [addAlert]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addAlert({ type: 'error', title, message, duration });
  }, [addAlert]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addAlert({ type: 'warning', title, message, duration });
  }, [addAlert]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addAlert({ type: 'info', title, message, duration });
  }, [addAlert]);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, success, error, warning, info }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
