import React from "react";
import { SkeletonLine } from "@/components/Skeleton";
import { Card } from "@/components/Card";

/**
 * Loading skeleton shaped like the public profile layout (hero + identity +
 * sections) so the page feels premium while fetching instead of showing a
 * bare spinner. Uses the shared `animate-shimmer` utility.
 */
export const PublicProfileSkeleton: React.FC = () => (
  <div className="min-h-screen bg-bg">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Header card with hero + identity */}
      <Card variant="default" padding="lg" className="overflow-hidden">
        {/* Hero cover banner */}
        <div className="-mx-8 -mt-8">
          <div className="h-32 sm:h-40 w-full animate-shimmer bg-surface-alt" />
        </div>
        {/* Logo + name row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 -mt-10 sm:-mt-12">
          <div className="h-20 w-20 rounded-2xl animate-shimmer bg-surface-alt border-4 border-bg shrink-0" />
          <div className="flex-1 space-y-3 sm:pt-10">
            <SkeletonLine className="h-7 w-48" />
            <SkeletonLine className="h-4 w-72" />
            <div className="flex gap-2">
              <SkeletonLine className="h-6 w-28 rounded-full" />
              <SkeletonLine className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </div>
        {/* Contact CTA placeholder */}
        <div className="mt-6">
          <SkeletonLine className="h-11 w-40 rounded-xl" />
        </div>
      </Card>

      {/* Section skeletons */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-4" role="status" aria-busy="true">
          <SkeletonLine className="h-3 w-24" />
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            <SkeletonLine className="h-28 w-full rounded-2xl" />
            <SkeletonLine className="h-28 w-full rounded-2xl" />
            <SkeletonLine className="h-28 w-full rounded-2xl hidden sm:block" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
