import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Eye, Pencil, RotateCcw, Save, Lock, Bold, Italic, Underline } from "lucide-react";
import {
  CONTRACT_TEMPLATE_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE,
  getMaskedPlaceholder,
  renderContractTemplate,
} from "../lib/contractTemplate";
import { renderFormattedReact } from "../lib/inlineFormatting";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);

  const insertVariable = (placeholder: string) => {
    if (isBasicPlan) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText =
      template.slice(0, start) + placeholder + template.slice(end);
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + placeholder.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleReset = () => {
    if (isBasicPlan) return;
    onChange(DEFAULT_CONTRACT_TEMPLATE);
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    if (isBasicPlan) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = template.slice(start, end);
    const wrapped = prefix + selected + suffix;
    const newText = template.slice(0, start) + wrapped + template.slice(end);
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      if (selected) {
        ta.setSelectionRange(start, start + wrapped.length);
      } else {
        const cursorPos = start + prefix.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  // Preview rendering — use a dummy event/profile for preview
  let previewText: string;
  try {
    previewText = renderContractTemplate({
      event: {
        event_date: "2026-06-15",
        start_time: "14:00",
        end_time: "22:00",
        service_type: "Banquete",
        num_people: 150,
        total_amount: 45000,
        location: "Salón Los Arcos",
        city: "Ciudad de México",
        deposit_percent: 50,
        cancellation_days: 15,
        refund_percent: 80,
        client: {
          name: "María García López",
          phone: "555-123-4567",
          email: "maria@ejemplo.com",
          address: "Av. Reforma 123",
          city: "Ciudad de México",
        },
      } as any,
      profile: {
        name: "Juan Eventos",
        business_name: "Catering Elegante",
        email: "info@catering.com",
      } as any,
      template,
      strict: false,
    });
  } catch {
    previewText = template;
  }

  const previewParagraphs = previewText.split(/\n\n+/).filter((p) => p.trim());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Plantilla del Contrato
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Personaliza el texto de tus contratos. Usa las variables para insertar
          datos dinámicos del evento.
        </p>
      </div>

      {isBasicPlan && (
        <div className="relative">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-800/40 rounded-xl p-3">
              <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                Función exclusiva del plan Pro
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Personaliza tus contratos con tu propio texto y variables
                dinámicas.
              </p>
            </div>
            <Link
              to="/pricing"
              className="bg-primary text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors whitespace-nowrap"
            >
              Subir a Pro
            </Link>
          </div>
        </div>
      )}

      {/* Variable Chips */}
      <div className={clsx("space-y-3", isBasicPlan && "opacity-50 pointer-events-none")}>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_TEMPLATE_PLACEHOLDERS.map(({ token, label }) => (
            <button
              key={token}
              type="button"
              onClick={() => insertVariable(getMaskedPlaceholder(token))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              title={`Inserta [${label}]`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Toggle + Format Buttons + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-surface-alt dark:bg-gray-800/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                !isPreview
                  ? "bg-white dark:bg-gray-700 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text"
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
                  ? "bg-white dark:bg-gray-700 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Vista Previa
            </button>
          </div>

          {!isPreview && (
            <div className={clsx("flex gap-1 bg-surface-alt dark:bg-gray-800/50 rounded-xl p-1", isBasicPlan && "opacity-50 pointer-events-none")}>
              <button
                type="button"
                onClick={() => wrapSelection('**', '**')}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-white dark:hover:bg-gray-700 transition-all"
                title="Negrita (**texto**)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('*', '*')}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-white dark:hover:bg-gray-700 transition-all"
                title="Cursiva (*texto*)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('__', '__')}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-white dark:hover:bg-gray-700 transition-all"
                title="Subrayado (__texto__)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className={clsx("flex gap-2", isBasicPlan && "opacity-50 pointer-events-none")}>
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
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {!isPreview ? (
        <textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => !isBasicPlan && onChange(e.target.value)}
          readOnly={isBasicPlan}
          className={clsx(
            "w-full min-h-[400px] bg-surface-alt border border-border rounded-2xl px-5 py-4 font-mono text-sm leading-relaxed resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none",
            isBasicPlan && "opacity-60 cursor-not-allowed"
          )}
          placeholder="Escribe la plantilla de tu contrato aquí..."
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl p-8 min-h-[400px] font-serif text-text leading-relaxed">
          <div className="text-center mb-8">
            <h2 className="text-xl font-black uppercase tracking-[0.15em] text-text">
              Contrato de Servicios
            </h2>
            <div className="w-16 h-0.5 bg-brand-orange mx-auto mt-3"></div>
            <p className="text-xs text-text-secondary mt-2 italic">
              Vista previa con datos de ejemplo
            </p>
          </div>
          <div className="space-y-3 text-justify text-sm whitespace-pre-line">
            {previewParagraphs.map((paragraph, i) => (
              <p key={i}>{renderFormattedReact(paragraph)}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
