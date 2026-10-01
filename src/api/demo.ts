import type { CoachScore, Filters, Me, ReportReason, ReportRow, ReportStatus, Role, ScoreRow, Snapshot } from './types'

/** Preview mode (`?demo`) — renders a realistic sample without a server. */
export const DEMO = new URLSearchParams(location.search).has('demo')

export const demoMe: Me = { name: 'Sara Ahmadi', email: 'support@persianball.com', is_support: true }

/** Keeps the preview signed in across reloads of the same tab. */
export const demoSession = {
  get: (): Me | null => {
    try {
      return sessionStorage.getItem('pbm.demo') ? demoMe : null
    } catch {
      return null
    }
  },
  set: (on: boolean) => {
    try {
      if (on) sessionStorage.setItem('pbm.demo', '1')
      else sessionStorage.removeItem('pbm.demo')
    } catch {
      /* ignore */
    }
  },
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COACHES = [
  'Ali Karimi', 'Reza Moradi', 'Mina Rahimi', 'Hossein Jafari', 'Neda Kazemi',
  'Omid Sadeghi', 'Leila Hosseini', 'Arash Nouri', 'Parisa Tehrani',
]
const STUDENTS = [
  'Kian Rostami', 'Aria Farahani', 'Daniel Shams', 'Nika Bahrami', 'Sam Ebrahimi',
  'Taha Ghasemi', 'Yasmin Zand', 'Ilia Mohammadi', 'Roya Soltani', 'Ben Hashemi',
  'Mahan Yazdani', 'Elena Abbasi', 'Hana Rezaei', 'Navid Amini',
]
const EVENTS = ['Dribbling Lab', 'Finishing Clinic', 'First Touch 1:1', 'Speed & Agility', 'Goalkeeper Basics', 'Match IQ Review']
const COMMENTS = [
  'Great energy, my son loved the drills.',
  'Very clear explanations, will book again.',
  'Coach adapted the plan to my level — perfect.',
  'Good session but started a few minutes late.',
  'Audio dropped a couple of times.',
  'Excellent feedback on my weak foot.',
  'Fun and challenging, exactly what we needed.',
  'Would like more game-like situations next time.',
  'Super motivating, thank you coach!',
  'The warm-up was too long for a 45 min slot.',
]
const COACH_COMMENTS = [
  'Big progress on first touch today.',
  'Focused and coachable — great session.',
  'We worked on the weak foot; homework assigned.',
  'Student was tired, we kept the intensity lower.',
  'Excellent finishing, ready for the next level.',
]
const REASON_TEXT: Record<ReportReason, string[]> = {
  COACH_ABSENT: ['Coach never joined the call.', 'Waited 20 minutes, no coach.'],
  STUDENT_ABSENT: ['Student did not show up.', 'No-show without notice.'],
  LATE: ['Session started 15 minutes late.', 'Coach joined late again.'],
  TECHNICAL_ISSUE: ['Video kept freezing.', 'Could not hear the coach.', 'App crashed mid-session.'],
  QUALITY: ['Drills felt repetitive.', 'Session felt rushed.'],
  OTHER: ['Wrong session time in the calendar.', 'Need to reschedule.'],
}
const REASONS: ReportReason[] = ['TECHNICAL_ISSUE', 'TECHNICAL_ISSUE', 'TECHNICAL_ISSUE', 'LATE', 'LATE', 'STUDENT_ABSENT', 'COACH_ABSENT', 'QUALITY', 'OTHER']
const STATUSES: ReportStatus[] = ['OPEN', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'RESOLVED', 'RESOLVED', 'DISMISSED']
const ROLES: Role[] = ['student', 'student', 'parent', 'parent', 'coach']

const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]
const mail = (n: string) => `${n.toLowerCase().replace(/\s+/g, '.')}@mail.com`

function within(iso: string, f: Filters) {
  const d = iso.slice(0, 10)
  return (!f.date_from || d >= f.date_from) && (!f.date_to || d <= f.date_to)
}

export async function demoSnapshot(filters: Filters, salt = 0): Promise<Snapshot> {
  await new Promise((r) => setTimeout(r, 650))
  const r = rng(20260929 + salt)
  const now = Date.now()
  const day = 86_400_000

  const coaches = COACHES.map((name, i) => ({ id: 100 + i, name, email: mail(name) }))
  const scores: ScoreRow[] = []
  const reports: ReportRow[] = []

  for (let i = 0; i < 260; i++) {
    const ago = Math.floor(Math.pow(r(), 1.25) * 90)
    const start = new Date(now - ago * day - Math.floor(r() * 10) * 3_600_000)
    start.setMinutes(0, 0, 0)
    const coachIdx = Math.floor(Math.pow(r(), 1.4) * coaches.length)
    const coach = coaches[coachIdx]
    const studentName = pick(r, STUDENTS)
    const student = { id: 500 + STUDENTS.indexOf(studentName), name: studentName, email: mail(studentName) }
    const roleOf = pick(r, ROLES)
    const author = roleOf === 'coach' ? coach : roleOf === 'parent'
      ? { id: 900 + student.id, name: `${studentName.split(' ')[1]} family`, email: mail(`parent ${studentName}`) }
      : student
    const base = 4.55 - coachIdx * 0.14 + (r() - 0.5) * 2.3
    const score = r() < 0.03 ? 1 : Math.max(1, Math.min(5, Math.round(base)))
    const startIso = start.toISOString()
    const endIso = new Date(start.getTime() + 3_600_000).toISOString()
    const event_title = pick(r, EVENTS)

    scores.push({
      id: 1000 + i,
      occurrence: 4000 + i,
      score,
      comment: r() < 0.55 ? pick(r, roleOf === 'coach' ? COACH_COMMENTS : COMMENTS) : '',
      author,
      author_role: roleOf,
      event_id: 300 + EVENTS.indexOf(event_title),
      event_title,
      coach,
      student,
      occurrence_start: startIso,
      occurrence_end: endIso,
      created_date: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
    })

    if (r() < (score <= 2 ? 0.7 : 0.12)) {
      const reason = pick(r, REASONS)
      // Coaches flag no-shows and tech trouble; families flag the rest.
      const reporterRole: Role = reason === 'STUDENT_ABSENT' ? 'coach' : reason === 'TECHNICAL_ISSUE' || reason === 'OTHER' ? roleOf : roleOf === 'coach' ? 'parent' : roleOf
      const reporter = reporterRole === 'coach' ? coach : reporterRole === 'parent'
        ? { id: 900 + student.id, name: `${studentName.split(' ')[1]} family`, email: mail(`parent ${studentName}`) }
        : student
      const status = ago < 4 ? 'OPEN' : pick(r, STATUSES)
      reports.push({
        id: 7000 + i,
        occurrence: 4000 + i,
        reason,
        description: pick(r, REASON_TEXT[reason]),
        status,
        resolution_note: status === 'RESOLVED' ? 'Spoke with both sides; session credited.' : '',
        reporter,
        reporter_role: reporterRole,
        event_id: 300 + EVENTS.indexOf(event_title),
        event_title,
        coach,
        student,
        occurrence_start: startIso,
        occurrence_end: endIso,
        created_date: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
        handled_by: status === 'OPEN' ? null : { id: 1, name: demoMe.name },
        handled_at: status === 'OPEN' ? null : new Date(start.getTime() + day).toISOString(),
      })
    }
  }

  const byCoach = <T extends { coach: { id: number } | null }>(rows: T[]): T[] =>
    filters.coach ? rows.filter((x) => x.coach?.id === filters.coach) : rows
  const fs = byCoach(scores.filter((s) => within(s.occurrence_start, filters)))
    .sort((a, b) => b.occurrence_start.localeCompare(a.occurrence_start))
  const fr = byCoach(reports.filter((s) => within(s.occurrence_start, filters)))
    .sort((a, b) => b.created_date.localeCompare(a.created_date))

  const coachScores: CoachScore[] = coaches.map((c) => {
    const mine = scores.filter((s) => s.coach?.id === c.id && within(s.occurrence_start, filters))
    return {
      ...c,
      score_count: mine.length,
      average_score: mine.length ? mine.reduce((a, s) => a + s.score, 0) / mine.length : null,
    }
  })

  const sessionsCount = Math.round(fs.length * 1.65)
  const cancelled = Math.round(sessionsCount * 0.07)
  return {
    sessions: { count: sessionsCount, cancelled_count: cancelled, total_count: sessionsCount + cancelled, date_from: filters.date_from, date_to: filters.date_to },
    chat: { count: Math.round(fs.length * 13.4), date_from: filters.date_from, date_to: filters.date_to },
    coaches: coachScores,
    scores: fs,
    scoresTotal: fs.length,
    reports: fr,
    reportsTotal: fr.length,
    fetchedAt: Date.now(),
    filters,
  }
}
