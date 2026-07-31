import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Layers, Package, Tag } from 'lucide-react';
import { Card } from '@/components/Card';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Product } from '@/types/entities';

interface IngredientCounts {
  total: number;
  supply: number;
  equipment: number;
}

interface ProductImageCardProps {
  product: Product;
  imageSrc: string | null;
  ingredientCounts: IngredientCounts;
  moneyLocale: string;
}

export const ProductImageCard: React.FC<ProductImageCardProps> = ({
  product,
  imageSrc,
  ingredientCounts,
  moneyLocale,
}) => {
  const { t } = useTranslation(['products', 'common']);

  return (
    <Card variant="glass" padding="md" className="shadow-sm">
      <div className="mb-4 rounded-2xl border border-border bg-surface-alt/30 p-2">
        {imageSrc ? (
          <OptimizedImage
            src={imageSrc}
            alt={product.name}
            className="w-full h-44 object-cover rounded-xl"
          />
        ) : (
          <div className="w-full h-44 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-12 w-12 text-primary opacity-40" />
          </div>
        )}
      </div>
      {!imageSrc && (
        <div className="mb-4 -mt-1 text-xs text-text-secondary">
          {t('products:form.upload_photo')}
        </div>
      )}
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
        {t('products:details.general_info')}
      </h2>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-secondary">{t('products:form.category')}</p>
            <p className="text-sm font-medium text-text">{product.category}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-secondary">{t('products:form.base_price')}</p>
            <p className="text-sm font-medium text-text">
              ${product.base_price.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-secondary">{t('products:form.composition')}</p>
            <p className="text-sm font-medium text-text">
              {ingredientCounts.total} {t('products:list.ingredients')}
              {ingredientCounts.supply > 0 &&
                `, ${ingredientCounts.supply} ${t('products:list.supplies')}`}
              {ingredientCounts.equipment > 0 &&
                `, ${ingredientCounts.equipment} ${t('products:list.equipment')}`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
