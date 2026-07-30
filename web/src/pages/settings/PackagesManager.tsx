import React, { useEffect, useState } from "react";
import { Plus, Trash2, Star, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  publicProfileConfigService,
  type OrganizerPublicPackage,
} from "@/services/publicProfileConfigService";
import { logError } from "@/lib/errorHandler";

interface PackagesManagerProps {
  /** Paid plan gates the whole manager (Pro+ only backend). */
  enabled: boolean;
}

const emptyDraft = {
  title: "",
  description: "",
  from_price: "",
  inclusions: "",
  is_featured: false,
};

export const PackagesManager: React.FC<PackagesManagerProps> = ({ enabled }) => {
  const { t } = useTranslation("settings");
  const [items, setItems] = useState<OrganizerPublicPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    publicProfileConfigService
      .listPackages()
      .then(setItems)
      .catch((e) => logError("list packages", e))
      .finally(() => setLoading(false));
  }, [enabled]);

  const add = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const created = await publicProfileConfigService.createPackage({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        from_price: draft.from_price ? Number(draft.from_price) : null,
        inclusions: draft.inclusions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        is_featured: draft.is_featured,
        sort_order: items.length,
      });
      setItems([...items, created]);
      setDraft(emptyDraft);
    } catch (e) {
      logError("create package", e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await publicProfileConfigService.deletePackage(id);
      setItems(items.filter((p) => p.id !== id));
    } catch (e) {
      logError("delete package", e);
    }
  };

  const toggleFeatured = async (pkg: OrganizerPublicPackage) => {
    try {
      const updated = await publicProfileConfigService.updatePackage(pkg.id, {
        is_featured: !pkg.is_featured,
      });
      setItems(items.map((p) => (p.id === pkg.id ? updated : p)));
    } catch (e) {
      logError("toggle featured", e);
    }
  };

  if (!enabled) {
    return (
      <p className="text-xs text-text-secondary">
        {t("publicProfile.packagesProHint", {
          defaultValue: "Packages require a Pro plan.",
        })}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
      ) : (
        <ul className="space-y-2">
          {items.map((pkg) => (
            <li
              key={pkg.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface-alt/40"
            >
              <button
                type="button"
                onClick={() => toggleFeatured(pkg)}
                className="p-1 rounded hover:bg-surface-alt"
                aria-label="toggle featured"
              >
                <Star
                  className={`h-4 w-4 ${
                    pkg.is_featured
                      ? "fill-primary text-primary"
                      : "text-text-tertiary"
                  }`}
                />
              </button>
              <span className="flex-1 text-sm font-medium text-text truncate">
                {pkg.title}
                {pkg.from_price != null && (
                  <span className="text-text-secondary font-normal">
                    {" "}
                    · ${pkg.from_price}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => remove(pkg.id)}
                className="p-1 rounded hover:bg-error/10 text-error"
                aria-label="delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 p-3 rounded-xl border border-dashed border-border">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={t("publicProfile.packageTitle", {
            defaultValue: "Package title",
          })}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={t("publicProfile.packageDesc", {
            defaultValue: "Short description",
          })}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={draft.from_price}
            onChange={(e) => setDraft({ ...draft, from_price: e.target.value })}
            placeholder={t("publicProfile.packagePrice", {
              defaultValue: "From price",
            })}
            className="w-32 bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={draft.is_featured}
              onChange={(e) =>
                setDraft({ ...draft, is_featured: e.target.checked })
              }
            />
            {t("publicProfile.packageFeatured", { defaultValue: "Featured" })}
          </label>
        </div>
        <textarea
          value={draft.inclusions}
          onChange={(e) => setDraft({ ...draft, inclusions: e.target.value })}
          placeholder={t("publicProfile.packageInclusions", {
            defaultValue: "Inclusions (one per line)",
          })}
          rows={3}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !draft.title.trim()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("publicProfile.packageAdd", { defaultValue: "Add package" })}
        </button>
      </div>
    </div>
  );
};
