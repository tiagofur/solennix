import React, { useMemo, useState } from "react";
import { DayPicker } from "@daypicker/react";
import "@daypicker/react/style.css";
import { format, type Locale } from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { buildBlockedDateList, type UnavailableDateRange } from "../lib/blockedDates";
import { parseLocalDate } from "../lib/dateUtils";
import { dayPickerStyles } from "./dayPickerStyles";
import { Modal } from "./Modal";

export interface EventDatePickerProps {
  /** Currently selected date as a LOCAL `yyyy-MM-dd` string. */
  value: string;
  /** Emitted with a LOCAL `yyyy-MM-dd` string when a non-blocked day is picked. */
  onChange: (date: string) => void;
  /** Unavailable-date ranges used to disable + strike-through days. */
  unavailableDates?: UnavailableDateRange[];
  /** date-fns locale (defaults to the user language). */
  locale?: Locale;
  /** Accessible label for the field; rendered as a visually-hidden legend. */
  label?: string;
  id?: string;
}

/**
 * Event-form date picker built on react-day-picker v10 (same engine as
 * `/events?view=calendar`). Blocked days are both non-clickable (native
 * `disabled`, REQ-2) and visually struck-through (`.rdp-unavailable`,
 * REQ-1). It shows NO event dots (REQ-9) — no `DayButton` override — and
 * emits LOCAL `yyyy-MM-dd` so the form value stays TZ-safe (Web ADR-1).
 *
 * Presentation: a compact trigger button (sibling of the other form inputs)
 * opens an on-demand `Modal` hosting the calendar — the Web analogue of the
 * iOS `EventFormDatePickerSheet` (`.presentationDetents([.medium, .large])`).
 * Picking a day emits the value AND closes the modal; Esc / backdrop / the X
 * button close it without emitting. This restores the compact field affordance
 * that PR #701's always-open inline calendar removed (UX parity with iOS).
 */
export const EventDatePicker: React.FC<EventDatePickerProps> = ({
  value,
  onChange,
  unavailableDates,
  locale = esLocale,
  label,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const blockedDateList = useMemo(
    () => buildBlockedDateList(unavailableDates ?? []),
    [unavailableDates],
  );

  const selected = value ? parseLocalDate(value) : undefined;
  const isEnglish = locale.code?.startsWith("en") ?? false;
  const placeholder = isEnglish ? "MM/DD/YYYY" : "DD/MM/AAAA";

  return (
    <>
      {dayPickerStyles}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-xl p-2 border bg-card text-text border-border shadow-xs transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20 text-left"
      >
        <Calendar
          className="h-5 w-5 text-text-secondary flex-shrink-0"
          aria-hidden="true"
        />
        <span className={value ? "text-text" : "text-text-tertiary"}>
          {selected ? format(selected, "PPP", { locale }) : placeholder}
        </span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={label ?? ""}
        maxWidth="sm"
      >
        <DayPicker
          mode="single"
          defaultMonth={selected ?? new Date()}
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setIsOpen(false);
            }
          }}
          disabled={blockedDateList}
          modifiers={{ unavailable: blockedDateList }}
          modifiersClassNames={{ unavailable: "rdp-unavailable" }}
          locale={locale}
          aria-label={label}
          className="flex justify-center"
        />
      </Modal>
    </>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith("en") ? enUS : esLocale;
