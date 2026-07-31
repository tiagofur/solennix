import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/Button';
import type { Product } from '@/types/entities';

interface ProductDetailHeaderProps {
  product: Product;
  embedded: boolean;
  onBack: () => void;
  onDeleteClick: () => void;
}

export const ProductDetailHeader: React.FC<ProductDetailHeaderProps> = ({
  product,
  embedded,
  onBack,
  onDeleteClick,
}) => {
  const { t } = useTranslation(['products', 'common']);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {!embedded && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {product.name}
          </h1>
          <span className="px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            {product.category}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          to={`/products/${product.id}/edit`}
          className="inline-flex items-center justify-center font-semibold transition-all active-ios-scale disabled:opacity-50 disabled:pointer-events-none cursor-pointer liquid-glass text-text hover:bg-surface/60 px-5 py-2.5 text-sm rounded-xl gap-2"
        >
          <Edit className="h-4 w-4 mr-2" />
          {t('common:action.edit')}
        </Link>
        <Button variant="danger" onClick={onDeleteClick}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t('common:action.delete')}
        </Button>
      </div>
    </div>
  );
};
