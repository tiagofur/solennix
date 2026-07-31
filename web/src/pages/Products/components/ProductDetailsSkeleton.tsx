import React from 'react';
import { SkeletonCard } from '@/components/Skeleton';

export const ProductDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-surface-alt animate-pulse" />
        <div className="space-y-1">
          <div className="h-7 w-48 rounded-md bg-surface-alt animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-surface-alt animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border p-5"
          >
            <div className="h-3 w-20 rounded-md bg-surface-alt animate-pulse mb-3" />
            <div className="h-8 w-16 rounded-md bg-surface-alt animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <SkeletonCard rows={3} />
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
};
