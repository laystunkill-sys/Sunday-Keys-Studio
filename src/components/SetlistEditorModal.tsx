import { X } from 'lucide-react';
import React, { useState } from 'react';

interface SetlistEditorModalProps {
  mode: 'new' | 'edit';
  initialName: string;
  initialServiceLabel: string;
  canDelete: boolean;
  onSave: (name: string, serviceLabel: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const inputClass =
  'w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60';

export function SetlistEditorModal({
  mode,
  initialName,
  initialServiceLabel,
  canDelete,
  onSave,
  onDelete,
  onClose,
}: SetlistEditorModalProps) {
  const [name, setName] = useState(initialName);
  const [serviceLabel, setServiceLabel] = useState(initialServiceLabel);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), serviceLabel.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setlist-editor-title"
    >
      <div className="w-full max-w-md bg-[#141822] border border-white/[0.12] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="setlist-editor-title" className="font-display text-base font-semibold text-slate-100">
            {mode === 'new' ? 'New Setlist' : 'Edit Setlist'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Setlist Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Service Details</label>
            <input
              type="text"
              value={serviceLabel}
              onChange={(e) => setServiceLabel(e.target.value)}
              placeholder="e.g. Main Sanctuary · 9:00 AM"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              {mode === 'edit' && canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete) {
                      onDelete();
                      onClose();
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  className="px-3 py-2 rounded-md text-xs font-medium border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                >
                  {confirmDelete ? 'Click again to delete' : 'Delete Setlist'}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
              >
                {mode === 'new' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
