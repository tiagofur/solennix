import React from 'react';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      maxWidth="sm"
    >
      <div className="space-y-6">
        {description && (
          <p id="dialog-description" className="text-text-secondary">
            {description}
          </p>
        )}
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-surface-alt text-text border border-border hover:bg-surface transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-error text-white hover:opacity-90 transition-opacity font-bold shadow-md shadow-error/20"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

