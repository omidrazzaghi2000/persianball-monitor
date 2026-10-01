import type { ReportReason, ReportRow, ReportStatus, Role, ScoreRow, Snapshot } from '../api/types'
import { dateLabel, isoDay } from './format'

export interface TrendPoint {
  key: string
  label: string
  feedback: number
  avg: number | null
  reports: number
}

export interface Derived {
  avgScore: number | null
  distribution: { score: number; count: number }[]
  sentiment: { positive: number; neutral: number; negative: number }
  trend: TrendPoint[]
  reasons: { reason: ReportReason; count: number }[]
  statuses: { status: ReportStatus; count: number }[]
  roles: { role: Role; count: number; avg: number | null }[]
  comments: ScoreRow[]
  openReports: number
  resolutionRate: number | null
  cancelRate: number | null
  messagesPerSession: number | null
}

function startOfWeek(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7))
  return c
}

type Grain = 'day' | 'week' | 'month'

function floorTo(d: Date, grain: Grain) {
  if (grain === 'week') return startOfWeek(d)
  if (grain === 'month') return new Date(d.getFullYear(), d.getMonth(), 1)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function step(d: Date, grain: Grain) {
  if (grain === 'month') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + (grain === 'week' ? 7 : 1))
}

const MAX_POINTS = 120
const DAY = 86_400_000

/**
 * Buckets feedback and reports by session date: daily for short windows,
 * weekly up to about a year, monthly beyond. The window never reaches further
 * back than the data itself, so an open-ended or far-off range can't produce
 * thousands of empty points.
 */
function buildTrend(scores: ScoreRow[], reports: ReportRow[], from: string | null, to: string | null): TrendPoint[] {
  const times = [...scores, ...reports]
    .map((r) => new Date(r.occurrence_start).getTime())
    .filter((t) => !Number.isNaN(t))
  if (!times.length) return []

  const first = Math.min(...times)
  const last = Math.max(...times)
  const fromT = from ? new Date(`${from}T00:00:00`).getTime() : NaN
  const toT = to ? new Date(`${to}T00:00:00`).getTime() : NaN
  // Start at the requested date when it is close to the data, otherwise at the data.
  const startT = Number.isNaN(fromT) || first - fromT > 31 * DAY ? first : fromT
  const endT = Math.max(Number.isNaN(toT) ? Date.now() : toT, last)
  const days = Math.max(1, Math.round((endT - startT) / DAY) + 1)
  const grain: Grain = days <= 45 ? 'day' : days <= 400 ? 'week' : 'month'

  const buckets = new Map<string, TrendPoint & { sum: number }>()
  const cursor = floorTo(new Date(startT), grain)
  const end = new Date(endT)
  while (cursor <= end && buckets.size < MAX_POINTS * 4) {
    const key = isoDay(cursor)
    const label =
      grain === 'month'
        ? cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : dateLabel(cursor.toISOString())
    buckets.set(key, { key, label, feedback: 0, avg: null, reports: 0, sum: 0 })
    step(cursor, grain)
  }
  const keyOf = (iso: string) => isoDay(floorTo(new Date(iso), grain))
  for (const s of scores) {
    const b = buckets.get(keyOf(s.occurrence_start))
    if (b) {
      b.feedback++
      b.sum += s.score
    }
  }
  for (const r of reports) {
    const b = buckets.get(keyOf(r.occurrence_start))
    if (b) b.reports++
  }
  const points = [...buckets.values()].map(({ sum, ...p }) => ({
    ...p,
    avg: p.feedback ? Math.round((sum / p.feedback) * 100) / 100 : null,
  }))
  return points.length > MAX_POINTS ? points.slice(-MAX_POINTS) : points
}

export function derive(s: Snapshot): Derived {
  const { scores, reports } = s
  const total = scores.reduce((a, r) => a + r.score, 0)

  const distribution = [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: scores.filter((r) => r.score === score).length,
  }))

  const reasonOrder: ReportReason[] = ['TECHNICAL_ISSUE', 'LATE', 'COACH_ABSENT', 'STUDENT_ABSENT', 'QUALITY', 'OTHER']
  const reasons = reasonOrder
    .map((reason) => ({ reason, count: reports.filter((r) => r.reason === reason).length }))
    .sort((a, b) => b.count - a.count)

  const statusOrder: ReportStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']
  const statuses = statusOrder.map((status) => ({ status, count: reports.filter((r) => r.status === status).length }))

  const roles = (['student', 'parent', 'coach'] as Role[]).map((role) => {
    const mine = scores.filter((r) => r.author_role === role)
    return { role, count: mine.length, avg: mine.length ? mine.reduce((a, r) => a + r.score, 0) / mine.length : null }
  })

  const closed = statuses.filter((x) => x.status === 'RESOLVED' || x.status === 'DISMISSED').reduce((a, x) => a + x.count, 0)

  return {
    avgScore: scores.length ? total / scores.length : null,
    distribution,
    sentiment: {
      positive: scores.filter((r) => r.score >= 4).length,
      neutral: scores.filter((r) => r.score === 3).length,
      negative: scores.filter((r) => r.score <= 2).length,
    },
    trend: buildTrend(scores, reports, s.filters.date_from, s.filters.date_to),
    reasons,
    statuses,
    roles,
    comments: scores.filter((r) => r.comment.trim()).sort((a, b) => b.created_date.localeCompare(a.created_date)),
    openReports: statuses.find((x) => x.status === 'OPEN')!.count + statuses.find((x) => x.status === 'IN_REVIEW')!.count,
    resolutionRate: reports.length ? closed / reports.length : null,
    cancelRate: s.sessions.total_count ? s.sessions.cancelled_count / s.sessions.total_count : null,
    messagesPerSession: s.sessions.count ? s.chat.count / s.sessions.count : null,
  }
}
