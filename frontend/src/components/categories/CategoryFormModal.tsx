import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Category } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api/endpoints";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSuccess: (cat: Category) => void;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#10B981", "#06B6D4", "#3B82F6",
  "#6366F1", "#8B5CF6", "#EC4899", "#64748B",
];

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccess,
}) => {
  const { success, error: showError } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setColor(categoryToEdit.color);
    } else {
      setName("");
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    }
    setErrors({});
  }, [categoryToEdit, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color))
      newErrors.color = "Enter a valid hex color (e.g. #FF5733)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      let result: Category;
      if (categoryToEdit) {
        result = await api.updateCategory(categoryToEdit.id, { name: name.trim(), color });
        success("Category updated", `"${result.name}" has been updated`);
      } else {
        result = await api.createCategory({ name: name.trim(), color });
        success("Category created", `"${result.name}" is ready to use`);
      }
      onSuccess(result);
      onClose();
    } catch (err: any) {
      showError("Failed to save category", err.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? "Edit Category" : "New Category"}
      description="Custom categories help you organize your spending"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Category Name"
          placeholder="e.g. Gym, Hobbies, Travel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          autoFocus
          disabled={categoryToEdit?.is_default && categoryToEdit.name !== name}
        />

        {/* Color Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Color <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition-all ${
                  color === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"
                }`}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent p-0.5"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6366F1"
              error={errors.color}
              className="font-mono text-sm"
            />
          </div>
          {/* Preview */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border"
            style={{ backgroundColor: color + "20", borderColor: color + "60", color }}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {name || "Category Preview"}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {categoryToEdit ? "Update" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
