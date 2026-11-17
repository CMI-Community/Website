// Public display dates use Chiang Mai time. Never infer dates from titles.
function calendarTime(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const utc = Date.UTC(year, month - 1, day, hour, minute, second)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null
  return utc - 7 * 60 * 60 * 1000
}

function publicationTime(value?: string) {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/)
  if (!match) return null
  const [, year, month, day, hour = '0', minute = '0', second = '0', zone] = match
  const local = calendarTime(+year, +month, +day, +hour, +minute, +second)
  if (local === null) return null
  if (!zone) return local
  const parsed = Date.parse(value.replace(' ', 'T'))
  return Number.isFinite(parsed) ? parsed : null
}

interface PosterTimeFields {
  id?: string;
  eventTime?: string;
  publishedAt?: string;
  publishedDate?: string;
}

export function posterSortTime(poster: PosterTimeFields) {
  const label = typeof poster.eventTime === 'string' ? poster.eventTime : ''
  // Backfill placeholders and partial dates are not verified event dates.
  if (!/补录|待补|未确认|不详|未知/.test(label)) {
    const date = label.match(/^\s*(\d{4})[./年-]\s*(\d{1,2})[./月-]\s*(\d{1,2})(?:日)?(?=\s|[·（(]|$)/)
    if (date) {
      const time = label.slice(date[0].length).match(/(?:^|\s|·)(\d{1,2}):(\d{2})/)
      const value = calendarTime(+date[1], +date[2], +date[3], time ? +time[1] : 0, time ? +time[2] : 0)
      if (value !== null) return value
    }
  }
  return publicationTime(poster.publishedAt) ?? publicationTime(poster.publishedDate)
}

export function orderPosters<T extends PosterTimeFields>(posters: readonly T[], order: 'date-desc' | 'date-asc' = 'date-desc'): T[] {
  const sign = order === 'date-asc' ? 1 : -1
  return posters.map(poster => ({ poster, time: posterSortTime(poster) }))
    .sort((a, b) => {
      if (a.time === null && b.time !== null) return 1
      if (b.time === null && a.time !== null) return -1
      const delta = a.time === null || b.time === null ? 0 : (a.time - b.time) * sign
      return delta || String(a.poster.id).localeCompare(String(b.poster.id), 'en')
    })
    .map(entry => entry.poster)
}
