import React from "react";
import { Check, Minus, Plus } from "lucide-react";

interface PublicProduct {
  id: string;
  name: string;
  category: string;
  image_url?: string;
}

interface Props {
  product: PublicProduct;
  isSelected: boolean;
  quantity: number;
  brandColor: string;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onQuantityChange: (qty: number) => void;
}

export const PublicProductCard: React.FC<Props> = ({
  product,
  isSelected,
  quantity,
  brandColor,
  onToggle,
  onIncrement,
  onDecrement,
  onQuantityChange,
}) => {
  return (
    <div
      className={`rounded-xl border p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-2 shadow-sm"
          : "border-border bg-card hover:border-border-strong"
      }`}
      style={
        isSelected
          ? { borderColor: brandColor, backgroundColor: `${brandColor}08` }
          : undefined
      }
      onClick={() => {
        if (!isSelected) onToggle();
      }}
    >
      <div className="flex gap-3">
        {/* Image or placeholder */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-16 w-16 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="h-16 w-16 rounded-lg shrink-0 flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: `${brandColor}30` }}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {product.name}
              </p>
              <p className="text-xs text-text-secondary">{product.category}</p>
            </div>

            {/* Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`shrink-0 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                isSelected ? "text-white" : "border-border"
              }`}
              style={
                isSelected
                  ? { backgroundColor: brandColor, borderColor: brandColor }
                  : undefined
              }
            >
              {isSelected && <Check className="h-4 w-4" />}
            </button>
          </div>

          {/* Quantity picker */}
          {isSelected && (
            <div
              className="flex items-center gap-2 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-text-secondary">Cantidad:</span>
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={onDecrement}
                  className="px-2 py-1 hover:bg-surface-alt transition-colors text-text-secondary"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    onQuantityChange(parseInt(e.target.value) || 1)
                  }
                  className="w-12 text-center text-sm bg-card text-text border-x border-border py-1 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onIncrement}
                  className="px-2 py-1 hover:bg-surface-alt transition-colors text-text-secondary"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
