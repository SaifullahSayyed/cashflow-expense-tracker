import React, { useState, useEffect } from "react";
import { Settings2, Save } from "lucide-react";
import { api } from "../api/endpoints";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";

const CURRENCY_PRESETS = [
  { symbol: "₹", code: "INR", label: "Indian Rupee (₹)" },
  { symbol: "$", code: "USD", label: "US Dollar ($)" },
  { symbol: "€", code: "EUR", label: "Euro (€)" },
  { symbol: "£", code: "GBP", label: "British Pound (£)" },
  { symbol: "¥", code: "JPY", label: "Japanese Yen (¥)" },
  { symbol: "A$", code: "AUD", label: "Australian Dollar (A$)" },
  { symbol: "S$", code: "SGD", label: "Singapore Dollar (S$)" },
];

const DEFAULT_PAYMENT_METHODS = ["UPI", "card", "cash", "bank", "other"];

export const SettingsPage: React.FC = () => {
  const { currencySymbol, refreshSettings } = useSettings();
  const { success, error: showError } = useToast();

  const [symbol, setSymbol] = useState(currencySymbol);
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [defaultPayment, setDefaultPayment] = useState("UPI");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    api.getSettings().then((res) => {
      const s = res.settings;
      setSymbol(s.currency_symbol ?? "₹");
      setCurrencyCode(s.currency_code ?? "INR");
      setDefaultPayment(s.default_payment_method ?? "UPI");
    }).catch((err) => {
      showError("Failed to load settings", err.detail || err.message);
    }).finally(() => setIsLoading(false));
  }, [showError]);

  const markDirty = () => setIsDirty(true);

  const handlePreset = (preset: (typeof CURRENCY_PRESETS)[0]) => {
    setSymbol(preset.symbol);
    setCurrencyCode(preset.code);
    markDirty();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return showError("Validation error", "Currency symbol cannot be empty");
    setIsSaving(true);
    try {
      await api.updateSettings({
        currency_symbol: symbol.trim(),
        currency_code: currencyCode.trim().toUpperCase(),
        default_payment_method: defaultPayment,
      });
      await refreshSettings();
      success("Settings saved", "Your preferences have been updated");
      setIsDirty(false);
    } catch (err: any) {
      showError("Failed to save settings", err.detail || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure currency, default payment method, and app preferences
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Currency */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Currency</h2>

            {/* Presets */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Quick Select</p>
              <div className="flex flex-wrap gap-2">
                {CURRENCY_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handlePreset(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      currencyCode === p.code
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Currency Symbol"
                value={symbol}
                onChange={(e) => { setSymbol(e.target.value); markDirty(); }}
                placeholder="₹"
                required
              />
              <Input
                label="Currency Code"
                value={currencyCode}
                onChange={(e) => { setCurrencyCode(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="INR"
                required
                maxLength={5}
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-300">
              Preview: <strong className="text-slate-900 dark:text-slate-100">{symbol}1,250.00</strong>
            </div>
          </div>

          {/* Default Payment Method */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Default Payment Method</h2>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setDefaultPayment(m); markDirty(); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border uppercase tracking-wide transition-all ${
                    defaultPayment === m
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              icon={<Save className="w-4 h-4" />}
              isLoading={isSaving}
              disabled={!isDirty}
            >
              Save Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
