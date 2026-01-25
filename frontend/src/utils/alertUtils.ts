// Global alert utility for non-React contexts
// This allows showing alerts from API interceptors and other non-React code

type AlertCallback = (title: string, message?: string, duration?: number) => void;

let alertError: AlertCallback | null = null;
let alertSuccess: AlertCallback | null = null;
let alertWarning: AlertCallback | null = null;
let alertInfo: AlertCallback | null = null;

export const alertUtils = {
  setError: (callback: AlertCallback) => {
    alertError = callback;
  },
  setSuccess: (callback: AlertCallback) => {
    alertSuccess = callback;
  },
  setWarning: (callback: AlertCallback) => {
    alertWarning = callback;
  },
  setInfo: (callback: AlertCallback) => {
    alertInfo = callback;
  },
  error: (title: string, message?: string, duration?: number) => {
    if (alertError) {
      alertError(title, message, duration);
    } else {
      console.error('Alert not initialized:', title, message);
    }
  },
  success: (title: string, message?: string, duration?: number) => {
    if (alertSuccess) {
      alertSuccess(title, message, duration);
    }
  },
  warning: (title: string, message?: string, duration?: number) => {
    if (alertWarning) {
      alertWarning(title, message, duration);
    }
  },
  info: (title: string, message?: string, duration?: number) => {
    if (alertInfo) {
      alertInfo(title, message, duration);
    }
  },
};

