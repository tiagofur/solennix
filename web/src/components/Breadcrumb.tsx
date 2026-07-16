import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { t } = useTranslation("common");
  return (
    <nav aria-label={t("a11y.breadcrumb")} className="flex items-center gap-1 mb-4">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronRight
                className="h-3 w-3 text-text-tertiary shrink-0"
                aria-hidden="true"
              />
            )}
            {isLast || !item.href ? (
              <span className="text-sm text-text truncate">{item.label}</span>
            ) : (
              <Link
                to={item.href}
                className="text-sm text-text-secondary hover:text-primary transition-colors truncate"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
