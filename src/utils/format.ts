import { format, parseISO } from 'date-fns';

export function weekdayAndDate(d: Date = new Date()): {
  weekday: string;
  date: string;
} {
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

export function formatTime12h(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy');
}

/** Title-cased initials from a name. "Maya" → "MA", "Alex Kim" → "AK". */
export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'YOU';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
