import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Eye,
  Pencil,
  RotateCcw,
  Lock,
  Bold,
  Italic,
  Underline,
  Plus,
  Save,
} from "lucide-react";
import {
  CONTRACT_TEMPLATE_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE,
  renderContractTemplate,
  TOKEN_REGEX,
} from "@/lib/contractTemplate";
import { renderFormattedReact } from "@/lib/inlineFormatting";
import type { Event, Client, User, EventProduct } from "@/types/entities";

// ─── Types ────────────────────────────────────────────────────────
interface PreviewEvent {
  event_date: string; start_time: string; end_time: string;
  service_type: string; num_people: number; total_amount: number;
  location: string; city: string; deposit_percent: number;
  cancellation_days: number; refund_percent: number;
  client?: { name: string; phone: string; email: string; address: string; city: string } | null;
}
interface PreviewProfile { name: string; business_name: string; email: string; }
// Preview product mirrors the backend contract shape for EventProduct:
// a flat `product_name` via SQL join (see backend EventProduct schema).
interface PreviewProduct { product_name: string; quantity?: number; }

// ─── Preview mock data ────────────────────────────────────────────
const PREVIEW_EVENT: PreviewEvent = {
  event_date: "2026-06-15", start_time: "14:00", end_time: "22:00",
  service_type: "Banquete", num_people: 150, total_amount: 45000,
  location: "Salón Los Arcos", city: "Ciudad de México",
  deposit_percent: 50, cancellation_days: 15, refund_percent: 80,
  client: { name: "María García López", phone: "555-123-4567", email: "maria@ejemplo.com", address: "Av. Reforma 123", city: "Ciudad de México" },
};
const PREVIEW_PROFILE: PreviewProfile = { name: "Juan Eventos", business_name: "Mi Empresa de Eventos", email: "info@mieventos.com" };
const PREVIEW_PRODUCTS: PreviewProduct[] = [
  { product_name: "Paquete Premium", quantity: 1 },
  { product_name: "Iluminación", quantity: 1 },
  { product_name: "Decoración Floral", quantity: 1 },
];
const PREVIEW_PAYMENTS = [{ amount: 15000 }, { amount: 7500 }];

// ─── Constants ────────────────────────────────────────────────────
const CHIP_MARKER = "\uFEFF"; // zero-width no-break space used for chip detection
const CHIP_CLASSES =
  "inline-flex items-center px-2.5 py-0.5 mx-0.5 bg-primary/10 border border-primary/30 rounded-lg text-xs font-semibold font-sans text-primary cursor-default select-all align-baseline leading-relaxed whitespace-nowrap transition-all hover:bg-primary/20 hover:border-primary/50 hover:-translate-y-px hover:shadow-sm dark:bg-primary/15 dark:border-primary/40 dark:text-primary";

// ─── Helpers ──────────────────────────────────────────────────────

/** Convert a template string like "Hello [Nombre del cliente]..." into HTML with chips */
const templateToHTML = (template: string): string => {
  return template
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(TOKEN_REGEX, (_match, label) => {
      const safeLabel = label.replace(/"/g, "&quot;");
      return `<span contenteditable="false" data-variable="${safeLabel}" class="${CHIP_CLASSES}">${CHIP_MARKER}${label}${CHIP_MARKER}</span>`;
    })
    .replace(/\n/g, "<br>");
};

/** Extract a plain template string from the contentEditable DOM */
const htmlToTemplate = (container: HTMLDivElement): string => {
  let result = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent?.replace(/\uFEFF/g, "") || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Variable chip
      if (el.hasAttribute("data-variable")) {
        const varName = el.getAttribute("data-variable") || "";
        result += `[${varName}]`;
        return; // Don't recurse into chip children
      }

      // Line breaks
      if (el.tagName === "BR") {
        result += "\n";
        return;
      }

      // Block elements add newlines
      if (el.tagName === "DIV" && result.length > 0 && !result.endsWith("\n")) {
        result += "\n";
      }

      // Recurse children
      for (const child of Array.from(el.childNodes)) {
        walk(child);
      }
    }
  };

  for (const child of Array.from(container.childNodes)) {
    walk(child);
  }

  return result;
};

// ─── Component ────────────────────────────────────────────────────

interface ContractTemplateEditorProps {
  template: string;
  onChange: (template: string) => void;
  onSave: () => void;
  isBasicPlan: boolean;
}

export const ContractTemplateEditor: React.FC<ContractTemplateEditorProps> = ({
  template,
  onChange,
  onSave,
  isBasicPlan,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [variablePanelOpen, setVariablePanelOpen] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);

  // ─── Sync template → DOM when template changes externally ─────
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && !isPreview) {
      const html = templateToHTML(template);
      if (el.innerHTML !== html) {
        el.innerHTML = html;
      }
    }
  }, [template, isPreview]);

  // ─── Save cursor position ─────────────────────────────────────
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  }, []);

  // ─── Handle editor input ──────────────────────────────────────
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalUpdate.current = true;
    onChange(htmlToTemplate(el));
  }, [onChange]);

  // ─── Insert Variable ──────────────────────────────────────────
  const insertVariable = useCallback(
    (label: string) => {
      if (isBasicPlan) return;
      const el = editorRef.current;
      if (!el) return;

      el.focus();
      restoreSelection();

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        // If no selection, place cursor at the end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      const range = sel!.getRangeAt(0);
      range.deleteContents();

      // Create the chip span
      const chip = document.createElement("span");
      chip.contentEditable = "false";
      chip.setAttribute("data-variable", label);
      chip.className = CHIP_CLASSES;
      chip.textContent = `${CHIP_MARKER}${label}${CHIP_MARKER}`;

      // Insert chip at cursor position
      range.insertNode(chip);

      // Add a space after the chip and place cursor there
      const space = document.createTextNode("\u00A0");
      chip.after(space);

      // Move cursor after the space
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel!.removeAllRanges();
      sel!.addRange(newRange);

      // Sync back
      isInternalUpdate.current = true;
      onChange(htmlToTemplate(el));
      setVariablePanelOpen(false);
    },
    [isBasicPlan, onChange, restoreSelection],
  );

  // ─── Format selection (Bold, Italic, Underline) ───────────────
  const wrapSelectionWith = useCallback(
    (prefix: string, suffix: string) => {
      if (isBasicPlan) return;
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      restoreSelection();

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const selectedText = range.toString();
      if (!selectedText) return;

      range.deleteContents();
      const textNode = document.createTextNode(prefix + selectedText + suffix);
      range.insertNode(textNode);

      // Select the wrapped text
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      sel.removeAllRanges();
      sel.addRange(newRange);

      isInternalUpdate.current = true;
      onChange(htmlToTemplate(el));
    },
    [isBasicPlan, onChange, restoreSelection],
  );

  // ─── Handle reset ─────────────────────────────────────────────
  const handleReset = () => {
    if (isBasicPlan) return;
    isInternalUpdate.current = false;
    onChange(DEFAULT_CONTRACT_TEMPLATE);
    if (editorRef.current) {
      editorRef.current.innerHTML = templateToHTML(DEFAULT_CONTRACT_TEMPLATE);
    }
  };

  // ─── Handle key events to prevent chip editing ────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent Enter from creating nested divs — use <br> instead
    if (e.key === "Enter") {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement("br");
        range.insertNode(br);
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  }, []);

  // ─── Preview rendering ────────────────────────────────────────
  let previewText: string;
  try {
    previewText = renderContractTemplate({
      event: PREVIEW_EVENT as unknown as Event & { client?: Client | null },
      profile: PREVIEW_PROFILE as unknown as User,
      template,
      strict: false,
      products: PREVIEW_PRODUCTS as unknown as EventProduct[],
      payments: PREVIEW_PAYMENTS,
    });
  } catch {
    previewText = template;
  }

  const previewParagraphs = previewText.split(/\n\n+/).filter((p) => p.trim());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text mb-1">
          Plantilla del Contrato
        </h3>
        <p className="text-sm text-text-secondary">
          Personaliza el texto de tus contratos. Haz clic en una variable para
          insertarla donde está tu cursor.
        </p>
      </div>

      {isBasicPlan && (
        <div className="relative">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-3">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-text text-sm">
                Función exclusiva del plan Pro
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Personaliza tus contratos con tu propio texto y variables
                dinámicas.
              </p>
            </div>
            <Link
              to="/pricing"
              className="bg-primary text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-dark transition-colors whitespace-nowrap"
            >
              Subir a Pro
            </Link>
          </div>
        </div>
      )}

      {/* Mode Toggle + Format Buttons + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-surface-alt rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                !isPreview
                  ? "bg-card text-primary shadow-sm"
                  : "text-text-secondary hover:text-text",
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                isPreview
                  ? "bg-card text-primary shadow-sm"
                  : "text-text-secondary hover:text-text",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Vista Previa
            </button>
          </div>

          {!isPreview && (
            <div
              className={clsx(
                "flex gap-1 bg-surface-alt rounded-xl p-1",
                isBasicPlan && "opacity-50 pointer-events-none",
              )}
            >
              <button
                type="button"
                onClick={() => wrapSelectionWith("**", "**")}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-card transition-all"
                title="Negrita (**texto**)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelectionWith("*", "*")}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-card transition-all"
                title="Cursiva (*texto*)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelectionWith("__", "__")}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-card transition-all"
                title="Subrayado (__texto__)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div
          className={clsx(
            "flex gap-2",
            isBasicPlan && "opacity-50 pointer-events-none",
          )}
        >
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text border border-border rounded-lg hover:bg-surface-alt transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar
          </button>
        </div>
      </div>

      {/* Insert Variable Button + Dropdown */}
      {!isPreview && (
        <div
          className={clsx(
            "relative",
            isBasicPlan && "opacity-50 pointer-events-none",
          )}
        >
          <button
            type="button"
            onClick={() => {
              saveSelection();
              setVariablePanelOpen(!variablePanelOpen);
            }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
              variablePanelOpen
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface-alt hover:bg-surface border-border text-text-secondary hover:text-text",
            )}
          >
            <Plus className="h-4 w-4" />
            Insertar Variable
          </button>

          {variablePanelOpen && (
            <div className="absolute z-20 top-full mt-2 left-0 w-full sm:w-[480px] bg-card border border-border rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-medium text-text-secondary mb-3">
                Haz clic en una variable para insertarla en tu contrato
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTRACT_TEMPLATE_PLACEHOLDERS.map(({ token, label }) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertVariable(label)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-3 italic">
                Las variables se reemplazan automáticamente con los datos del
                evento al generar el contrato.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Editor / Preview */}
      {!isPreview ? (
        <div
          key="template-editor"
          ref={editorRef}
          contentEditable={!isBasicPlan}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={saveSelection}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onKeyDown={handleKeyDown}
          className={clsx(
            "w-full min-h-[400px] bg-surface-alt border border-border rounded-2xl px-5 py-4 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none overflow-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-text-tertiary empty:before:pointer-events-none",
            isBasicPlan && "opacity-60 cursor-not-allowed",
          )}
          data-placeholder="Escribe la plantilla de tu contrato aquí..."
        />
      ) : (
        <div
          key="template-preview"
          className="bg-card border border-border rounded-2xl p-8 min-h-[400px] font-serif text-text leading-relaxed"
        >
          <div className="text-center mb-8">
            <h2 className="text-base font-bold text-text">
              Contrato de Servicios
            </h2>
            <div className="w-16 h-0.5 bg-brand-orange mx-auto mt-3"></div>
            <p className="text-xs text-text-secondary mt-2 italic">
              Vista previa con datos de ejemplo
            </p>
          </div>
          <div className="space-y-3 text-justify text-sm whitespace-pre-line">
            {previewParagraphs.map((paragraph, i) => (
              <p key={`${i}-${paragraph.length}`}>{renderFormattedReact(paragraph)}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
