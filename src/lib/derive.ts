import type { ReportReason, ReportStatus, Role, Snapshot } from '../api/types'
import { REASON, dateLabel } from './format'

export interface Derived {
  reasons: { reason: ReportReason; count: number }[]
  statuses: { status: ReportStatus; count: number }[]
  reasonRoles: ({ reason: ReportReason; label: string } & Record<Role, number>)[]
  openReports: number
  resolutionRate: number | null
  cancelRate: number | null
  messagesPerSession: number | null
  /** Registrations per day with a readable label; null until the endpoint exists. */
  signups: { date: string; label: string; registered: number; buyers: number }[] | null
  conversion: number | null
  coachRoster: { id: number; name: string; email: string; students: number }[]
  studentsCovered: number
}

const REASON_ORDER: ReportReason[] = ['TECHNICAL_ISSUE', 'LATE', 'COACH_ABSENT', 'STUDENT_ABSENT', 'QUALITY', 'OTHER']
const STATUS_ORDER: ReportStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']

export function derive(s: Snapshot): Derived {
  const { reports } = s
  const statuses = STATUS_ORDER.map((status) => ({ status, count: reports.filter((r) => r.status === status).length }))
  const count = (st: ReportStatus) => statuses.find((x) => x.status === st)!.count
  const closed = count('RESOLVED') + count('DISMISSED')

  const signups = s.users ? s.users.daily.map((d) => ({ ...d, label: dateLabel(`${d.date}T12:00:00`) })) : null
  const totals = s.users?.totals

  return {
    reasons: REASON_ORDER.map((reason) => ({ reason, count: reports.filter((r) => r.reason === reason).length })).sort(
      (a, b) => b.count - a.count,
    ),
    statuses,
    reasonRoles: REASON_ORDER.map((reason) => ({
      reason,
      label: REASON[reason].label,
      student: reports.filter((r) => r.reason === reason && r.reporter_role === 'student').length,
      parent: reports.filter((r) => r.reason === reason && r.reporter_role === 'parent').length,
      coach: reports.filter((r) => r.reason === reason && r.reporter_role === 'coach').length,
    })),
    openReports: count('OPEN') + count('IN_REVIEW'),
    resolutionRate: reports.length ? closed / reports.length : null,
    cancelRate: s.sessions.total_count ? s.sessions.cancelled_count / s.sessions.total_count : null,
    messagesPerSession: s.sessions.count ? s.chat.count / s.sessions.count : null,
    signups,
    conversion: totals && totals.registered ? totals.buyers / totals.registered : null,
    coachRoster: s.coachStudents
      .map((c) => ({ id: c.id, name: c.name, email: c.email, students: c.student_count }))
      .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name)),
    studentsCovered:
      new Set(s.coachStudents.flatMap((c) => c.students.map((p) => p.id || p.name))).size ||
      s.coachStudents.reduce((a, c) => a + c.student_count, 0),
  }
}
