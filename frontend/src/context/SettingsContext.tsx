import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/endpoints";
import { AppSettings } from "../api/types";

interface SettingsContextType {
  settings: AppSettings;
  currencySymbol: string;
  defaultPaymentMethod: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Record<string, string>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    currency_symbol: "₹",
    currency_code: "INR",
    default_payment_method: "UPI",
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      if (data && data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch {
      // Keep defaults on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Record<string, string>) => {
    const updated: AppSettings = { ...settings, ...newSettings };
    setSettings(updated);
    await api.updateSettings(updated);
  };

  const currencySymbol = settings.currency_symbol || "₹";
  const defaultPaymentMethod = settings.default_payment_method || "UPI";

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currencySymbol,
        defaultPaymentMethod,
        isLoading,
        refreshSettings: fetchSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
