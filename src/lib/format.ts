const withWeekday = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'long' })
const withWeekdayAndYear = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const dayAndMonth = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long' })
const weekdayShort = new Intl.DateTimeFormat('de-CH', { weekday: 'short' })
const monthOnly = new Intl.DateTimeFormat('de-CH', { month: 'long' })
const monthAndYear = new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' })

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

/** "Mo, 21. Juni" - das Jahr nur, wenn es nicht das laufende ist. */
export function formatLongDate(iso: string): string {
  const date = toDate(iso)
  const formatter = date.getFullYear() === new Date().getFullYear() ? withWeekday : withWeekdayAndYear
  return formatter.format(date)
}

export function formatDate(iso: string): string {
  return dayAndMonth.format(toDate(iso))
}

/** "Mo" - bei einer woechentlichen Runde sagt der Wochentag etwas aus. */
export function formatWeekday(iso: string): string {
  return weekdayShort.format(toDate(iso)).replace('.', '')
}

export function formatDayNumber(iso: string): string {
  return `${toDate(iso).getDate()}.`
}

export function formatMonth(iso: string): string {
  const date = toDate(iso)
  return (date.getFullYear() === new Date().getFullYear() ? monthOnly : monthAndYear).format(date)
}

/** Gruppierungsschluessel, damit Januar 2026 und Januar 2027 nicht zusammenfallen. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const dateAndTime = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Der Verlauf speichert UTC; angezeigt wird lokale Zeit. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateAndTime.format(date)
}

export function formatPct(value: number): string {
  return `${Math.round(value)}%`
}

export function formatRating(value: number): string {
  return String(Math.round(value))
}

export function formatDiff(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
