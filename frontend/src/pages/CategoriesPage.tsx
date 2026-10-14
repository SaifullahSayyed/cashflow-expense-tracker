import React, { useState, useEffect, useCallback } from "react";
import { Tags, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { Category } from "../api/types";
import { api } from "../api/endpoints";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Select } from "../components/common/Select";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/common/SkeletonLoader";
import { CategoryFormModal } from "../components/categories/CategoryFormModal";
import { useToast } from "../context/ToastContext";

export const CategoriesPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignToId, setReassignToId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err: any) {
      showError("Failed to load categories", err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchCategories();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const reassign = reassignToId ? parseInt(reassignToId) : undefined;
      await api.deleteCategory(deletingCategory.id, reassign);
      success("Category deleted", `"${deletingCategory.name}" removed`);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: any) {
      showError("Delete failed", err.detail || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (cat: Category) => {
    setDeletingCategory(cat);
    const other = categories.find((c) => c.name === "Other" && c.id !== cat.id);
    setReassignToId(other ? String(other.id) : "");
  };

  const reassignOptions = categories
    .filter((c) => c.id !== deletingCategory?.id)
    .map((c) => ({ value: c.id, label: c.name }));

  const defaultCategories = categories.filter((c) => c.is_default);
  const customCategories = categories.filter((c) => !c.is_default);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tags className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Categories
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize your expenses with color-coded categories
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={handleCreate}>
          New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Default Categories */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Default Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {defaultCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{ borderLeftColor: cat.color }}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: cat.color + "25" }}>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{cat.name}</p>
                      <p className="text-xs text-slate-400">
                        {cat.expense_count ?? 0} expense{cat.expense_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2" title="Default categories are protected">
                    <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Categories */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Custom Categories
            </h2>
            {customCategories.length === 0 ? (
              <EmptyState
                title="No custom categories yet"
                description="Create your own categories to better organize your spending"
                actionText="Create Category"
                onAction={handleCreate}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {customCategories.map((cat) => (
                  <div
                    key={cat.id}
                    style={{ borderLeftColor: cat.color }}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: cat.color + "25" }}>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{cat.name}</p>
                        <p className="text-xs text-slate-400">
                          {cat.expense_count ?? 0} expense{cat.expense_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        aria-label={`Edit ${cat.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingCategory(null); }}
        categoryToEdit={editingCategory}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="Delete Category"
        description="This action cannot be undone"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You are about to delete{" "}
            <strong className="text-slate-900 dark:text-slate-100">"{deletingCategory?.name}"</strong>.
            {(deletingCategory?.expense_count ?? 0) > 0 && (
              <> It has <strong>{deletingCategory?.expense_count}</strong> linked expense{deletingCategory?.expense_count !== 1 ? "s" : ""} that must be reassigned.</>
            )}
          </p>

          {(deletingCategory?.expense_count ?? 0) > 0 && (
            <Select
              label="Reassign existing expenses to"
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
              options={reassignOptions}
              required
            />
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setDeletingCategory(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isDeleting}>
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
