import React, { useState, useRef } from "react";
import { Upload, CheckCircle, FileText, X } from "lucide-react";
import { CsvPreviewResponse, CsvImportRowItem } from "../../api/types";
import { api } from "../../api/endpoints";
import { formatPaise } from "../../utils/currency";
import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";

interface CsvImportPanelProps {
  onImportComplete: () => void;
}

export const CsvImportPanel: React.FC<CsvImportPanelProps> = ({ onImportComplete }) => {
  const { currencySymbol } = useSettings();
  const { success, error: showError, info } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
  const [rowSelections, setRowSelections] = useState<Record<number, boolean>>({});
  const [categoryMappings, setCategoryMappings] = useState<Record<number, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      return showError("Invalid file", "Please upload a .csv file");
    }
    setIsPreviewing(true);
    setPreview(null);
    try {
      const result = await api.previewCsvImport(file);
      setPreview(result);
      // Default: select all non-duplicate rows; flag duplicates as unselected
      const selections: Record<number, boolean> = {};
      const mappings: Record<number, string> = {};
      result.rows.forEach((row) => {
        selections[row.row_index] = !row.is_duplicate;
        if (row.category_id) mappings[row.row_index] = String(row.category_id);
        else if (result.available_categories.length > 0)
          mappings[row.row_index] = String(result.available_categories[0].id);
      });
      setRowSelections(selections);
      setCategoryMappings(mappings);
    } catch (err: any) {
      showError("Preview failed", err.detail || err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const selectedRows = preview.rows.filter((r) => rowSelections[r.row_index]);
    if (selectedRows.length === 0) {
      return info("Nothing to import", "Select at least one row to import");
    }

    setIsImporting(true);
    try {
      const rows: CsvImportRowItem[] = selectedRows.map((row) => ({
        date: row.date,
        amount_paise: row.amount_paise,
        description: row.description,
        category_id: parseInt(categoryMappings[row.row_index] || "0"),
        payment_method: row.payment_method || "other",
        notes: row.notes ?? null,
        import_confirmed: true,
      }));
      const result = await api.confirmCsvImport(rows);
      success("Import complete", `${result.imported_count} expense${result.imported_count !== 1 ? "s" : ""} imported`);
      setPreview(null);
      onImportComplete();
    } catch (err: any) {
      showError("Import failed", err.detail || err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleAll = (val: boolean) => {
    if (!preview) return;
    const updated: Record<number, boolean> = {};
    preview.rows.forEach((r) => (updated[r.row_index] = val));
    setRowSelections(updated);
  };

  const selectedCount = Object.values(rowSelections).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            dragOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <Upload className="w-8 h-8 text-indigo-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isPreviewing ? "Analyzing…" : "Drop a CSV file or click to browse"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Columns: date, amount, description, category (optional), payment_method (optional), notes (optional)
            </p>
          </div>
          {isPreviewing && (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Preview table */}
      {preview && (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                {preview.total_rows} rows total
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold">
                {preview.probable_duplicates} probable duplicates
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                {selectedCount} selected
              </span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Select All</Button>
              <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Deselect All</Button>
              <Button variant="outline" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={handleConfirmImport}
                isLoading={isImporting}
                disabled={selectedCount === 0}
              >
                Import {selectedCount} Row{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedCount === preview.rows.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Amount</th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Category</th>
                  <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.rows.map((row) => (
                  <tr
                    key={row.row_index}
                    className={`transition-colors ${
                      rowSelections[row.row_index]
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/50 dark:bg-slate-900/50 opacity-60"
                    } ${row.is_duplicate ? "border-l-2 border-amber-400" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!rowSelections[row.row_index]}
                        onChange={(e) =>
                          setRowSelections((p) => ({ ...p, [row.row_index]: e.target.checked }))
                        }
                        className="rounded accent-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100 max-w-[200px] truncate">{row.description}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {formatPaise(row.amount_paise, currencySymbol)}
                    </td>
                    <td className="px-3 py-2 min-w-[130px]">
                      <select
                        value={categoryMappings[row.row_index] || ""}
                        onChange={(e) =>
                          setCategoryMappings((p) => ({ ...p, [row.row_index]: e.target.value }))
                        }
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {preview.available_categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {row.is_duplicate ? (
                        <div className="flex items-center gap-1">
                          <Badge color="#f59e0b" size="sm">Duplicate</Badge>
                          {rowSelections[row.row_index] && (
                            <span className="text-xs text-amber-600 font-semibold">→ import anyway</span>
                          )}
                        </div>
                      ) : (
                        <Badge color="#10b981" size="sm">
                          <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" />
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
