import React, { useMemo } from "react";
import { DayPicker } from "@daypicker/react";
import "@daypicker/react/style.css";
import { format, type Locale } from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";
import { buildBlockedDateList, type UnavailableDateRange } from "../lib/blockedDates";
import { parseLocalDate } from "../lib/dateUtils";
import { dayPickerStyles } from "./dayPickerStyles";

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
 */
export const EventDatePicker: React.FC<EventDatePickerProps> = ({
  value,
  onChange,
  unavailableDates,
  locale = esLocale,
  label,
  id,
}) => {
  const blockedDateList = useMemo(
    () => buildBlockedDateList(unavailableDates ?? []),
    [unavailableDates],
  );

  const selected = value ? parseLocalDate(value) : undefined;

  return (
    <>
      {dayPickerStyles}
      <DayPicker
        id={id}
        mode="single"
        defaultMonth={selected ?? new Date()}
        selected={selected}
        onSelect={(date) => {
          if (date) onChange(format(date, "yyyy-MM-dd"));
        }}
        disabled={blockedDateList}
        modifiers={{ unavailable: blockedDateList }}
        modifiersClassNames={{ unavailable: "rdp-unavailable" }}
        locale={locale}
        aria-label={label}
        className="flex justify-center"
      />
    </>
  );
};

export const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith("en") ? enUS : esLocale;
