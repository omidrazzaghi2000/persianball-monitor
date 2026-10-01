import type { ReportReason, ReportStatus, Role } from '../api/types'

export const C = {
  bg: '#08080F',
  accent: '#00D87C',
  sky: '#38BDF8',
  indigo: '#7C74FF',
  amber: '#FDCA73',
  pink: '#F472B6',
  red: '#FF6B6B',
  mint: '#DAEFE8',
  sub: '#8A8BA8',
  grid: 'rgba(255,255,255,0.06)',
}

export const REASON: Record<ReportReason, { label: string; color: string }> = {
  TECHNICAL_ISSUE: { label: 'Technical issue', color: C.sky },
  LATE: { label: 'Late start', color: C.amber },
  COACH_ABSENT: { label: 'Coach absent', color: C.red },
  STUDENT_ABSENT: { label: 'Student absent', color: C.indigo },
  QUALITY: { label: 'Quality', color: C.pink },
  OTHER: { label: 'Other', color: C.sub },
}

export const STATUS: Record<ReportStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: C.amber },
  IN_REVIEW: { label: 'In review', color: C.sky },
  RESOLVED: { label: 'Resolved', color: C.accent },
  DISMISSED: { label: 'Dismissed', color: C.sub },
}

export const ROLE: Record<Role, { label: string; one: string; color: string }> = {
  student: { label: 'Students', one: 'Student', color: C.accent },
  parent: { label: 'Parents', one: 'Parent', color: C.sky },
  coach: { label: 'Coaches', one: 'Coach', color: C.amber },
}

const nf = new Intl.NumberFormat('en-US')
export const num = (n: number) => nf.format(Math.round(n))

export function compact(n: number) {
  return n >= 10_000 ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : num(n)
}

export function dateLabel(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function dateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function ago(ts: number | string) {
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime()
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} d ago` : dateLabel(new Date(t).toISOString())
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** A stable hue per person, kept inside the app's cool range. */
export function hueFor(seed: string | number) {
  const s = String(seed)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const palette = [C.accent, C.sky, C.indigo, C.amber, C.pink, '#34D3C5']
  return palette[h % palette.length]
}

export const isoDay = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
