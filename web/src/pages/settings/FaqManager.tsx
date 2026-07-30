import React, { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  publicProfileConfigService,
  type OrganizerPublicFaqItem,
} from "@/services/publicProfileConfigService";
import { logError } from "@/lib/errorHandler";

interface FaqManagerProps {
  enabled: boolean;
}

const emptyDraft = { question: "", answer: "" };

export const FaqManager: React.FC<FaqManagerProps> = ({ enabled }) => {
  const { t } = useTranslation("settings");
  const [items, setItems] = useState<OrganizerPublicFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    publicProfileConfigService
      .listFaq()
      .then(setItems)
      .catch((e) => logError("list faq", e))
      .finally(() => setLoading(false));
  }, [enabled]);

  const add = async () => {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setSaving(true);
    try {
      const created = await publicProfileConfigService.createFaqItem({
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        sort_order: items.length,
      });
      setItems([...items, created]);
      setDraft(emptyDraft);
    } catch (e) {
      logError("create faq", e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await publicProfileConfigService.deleteFaqItem(id);
      setItems(items.filter((f) => f.id !== id));
    } catch (e) {
      logError("delete faq", e);
    }
  };

  if (!enabled) {
    return (
      <p className="text-xs text-text-secondary">
        {t("publicProfile.faqProHint", {
          defaultValue: "FAQ requires a Pro plan.",
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
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border bg-surface-alt/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">
                  {item.question}
                </p>
                <p className="text-xs text-text-secondary line-clamp-2">
                  {item.answer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="p-1 rounded hover:bg-error/10 text-error shrink-0"
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
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          placeholder={t("publicProfile.faqQuestion", {
            defaultValue: "Question",
          })}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          placeholder={t("publicProfile.faqAnswer", {
            defaultValue: "Answer",
          })}
          rows={2}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={
            saving || !draft.question.trim() || !draft.answer.trim()
          }
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("publicProfile.faqAdd", { defaultValue: "Add FAQ item" })}
        </button>
      </div>
    </div>
  );
};
