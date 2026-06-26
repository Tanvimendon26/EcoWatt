import React, { createContext, useContext, useState } from "react";

export interface NotificationStore {
  success: string;
  error: string;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  clear: () => void;
}

export const ConsumerNotificationContext = createContext<NotificationStore | undefined>(undefined);
export const AdminNotificationContext = createContext<NotificationStore | undefined>(undefined);

export function useConsumerNotification() {
  const context = useContext(ConsumerNotificationContext);
  if (!context) {
    throw new Error("useConsumerNotification must be used within a ConsumerNotificationProvider");
  }
  return context;
}

export function useAdminNotification() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error("useAdminNotification must be used within an AdminNotificationProvider");
  }
  return context;
}

export const ConsumerNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [success, setSuccessState] = useState("");
  const [error, setErrorState] = useState("");

  const setSuccess = (msg: string) => {
    setSuccessState(msg);
    if (msg) {
      localStorage.setItem("consumerSuccess", msg);
    } else {
      localStorage.removeItem("consumerSuccess");
    }
  };

  const setError = (msg: string) => {
    setErrorState(msg);
    if (msg) {
      localStorage.setItem("consumerError", msg);
    } else {
      localStorage.removeItem("consumerError");
    }
  };

  const clear = () => {
    setSuccessState("");
    setErrorState("");
    localStorage.removeItem("consumerSuccess");
    localStorage.removeItem("consumerError");
    sessionStorage.removeItem("consumerSuccess");
    sessionStorage.removeItem("consumerError");
  };

  return (
    <ConsumerNotificationContext.Provider value={{ success, error, setSuccess, setError, clear }}>
      {children}
    </ConsumerNotificationContext.Provider>
  );
};

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [success, setSuccessState] = useState("");
  const [error, setErrorState] = useState("");

  const setSuccess = (msg: string) => {
    setSuccessState(msg);
    if (msg) {
      localStorage.setItem("adminSuccess", msg);
    } else {
      localStorage.removeItem("adminSuccess");
    }
  };

  const setError = (msg: string) => {
    setErrorState(msg);
    if (msg) {
      localStorage.setItem("adminError", msg);
    } else {
      localStorage.removeItem("adminError");
    }
  };

  const clear = () => {
    setSuccessState("");
    setErrorState("");
    localStorage.removeItem("adminSuccess");
    localStorage.removeItem("adminError");
    sessionStorage.removeItem("adminSuccess");
    sessionStorage.removeItem("adminError");
  };

  return (
    <AdminNotificationContext.Provider value={{ success, error, setSuccess, setError, clear }}>
      {children}
    </AdminNotificationContext.Provider>
  );
};
