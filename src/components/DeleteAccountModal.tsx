'use client';

import { useState } from 'react';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetEmail: string;
  targetName: string;
  onDeleted: (result: { fullyDeleted: boolean; message?: string }) => void;
}

export function DeleteAccountModal({ open, onClose, targetId, targetEmail, targetName, onDeleted }: DeleteAccountModalProps) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleClose() {
    if (deleting) return;
    setConfirmEmail('');
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${targetId}/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to delete');
        setDeleting(false);
        return;
      }
      setConfirmEmail('');
      onDeleted({ fullyDeleted: json.fullyDeleted, message: json.message });
    } catch {
      setError('Network error. Please try again.');
      setDeleting(false);
    }
  }

  const matches = confirmEmail.trim().toLowerCase() === targetEmail.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] px-4"
      onClick={handleClose}
    >
      <div
        className="bg-surface-container-low border border-error/30 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-error/20">
          <h2 className="font-[family-name:var(--font-heading)] text-lg text-error">Permanently Delete Account</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            This will permanently erase <strong className="text-on-surface">{targetName}</strong> ({targetEmail}) &mdash; login account, registration details, and identity documents &mdash; or fully anonymize and lock the account out if linked activity prevents outright removal. <strong className="text-error">This cannot be undone.</strong>
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">
              Type <span className="text-on-surface font-semibold">{targetEmail}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-3 py-2 text-sm text-on-surface focus:outline-none focus:border-error/50"
              placeholder="Confirm email address"
              autoComplete="off"
              autoFocus
            />
          </div>
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-none px-3 py-2">
              <p className="text-xs text-error">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="flex-1 border border-outline-variant/20 text-on-surface-variant font-semibold py-2 rounded-nonetext-sm hover:text-on-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || !matches}
              className="flex-1 bg-error text-white font-semibold py-2 rounded-nonetext-sm hover:bg-error/80 transition-colors disabled:opacity-40"
            >
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
