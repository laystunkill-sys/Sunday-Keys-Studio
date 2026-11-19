import { X } from 'lucide-react';
import React, { useState } from 'react';
import { PatchCategory } from '../types/worship';

interface SavePatchModalProps {
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  onSaveNewPatch: (name: string, category: PatchCategory, description: string) => void;
}

export function SavePatchModal({
  initialName,
  initialDescription,
  onClose,
  onSaveNewPatch,
}: SavePatchModalProps) {
  const [name, setName] = useState(`${initialName} (Custom)`);
  const [category, setCategory] = useState<PatchCategory>('Custom');
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveNewPatch(name.trim(), category, description.trim() || 'Custom layered worship patch.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-patch-title"
    >
      <div className="w-full max-w-md bg-[#141822] border border-white/[0.12] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="save-patch-title" className="font-display text-base font-semibold text-slate-100">
            Save Patch to Library
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Patch Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PatchCategory)}
              className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
            >
              <option value="Custom">Custom</option>
              <option value="Layered Worship">Layered Worship</option>
              <option value="Piano + Pad">Piano + Pad</option>
              <option value="Synth & Lead">Synth & Lead</option>
              <option value="Ambient">Ambient</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Save Patch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
