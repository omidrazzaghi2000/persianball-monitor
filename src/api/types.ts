export type Role = 'coach' | 'student' | 'parent'

export type ReportReason =
  | 'COACH_ABSENT'
  | 'STUDENT_ABSENT'
  | 'LATE'
  | 'TECHNICAL_ISSUE'
  | 'QUALITY'
  | 'OTHER'

export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'

export interface Person {
  id: number
  name: string
  email?: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** A row from /panel/scores/ (and /panel/comments/). */
export interface ScoreRow {
  id: number
  occurrence: number
  score: number
  comment: string
  author: Person
  author_role: Role
  event_id: number
  event_title: string
  coach: Person | null
  student: Person | null
  occurrence_start: string
  occurrence_end: string
  created_date: string
}

/** A row from /panel/reports/. */
export interface ReportRow {
  id: number
  occurrence: number
  reason: ReportReason
  description: string
  status: ReportStatus
  resolution_note: string
  reporter: Person
  reporter_role: Role
  event_id: number
  event_title: string
  coach: Person | null
  student: Person | null
  occurrence_start: string
  occurrence_end: string
  created_date: string
  handled_by?: Person | null
  handled_at?: string | null
}

export interface SessionsMetric {
  count: number
  cancelled_count: number
  total_count: number
  date_from: string | null
  date_to: string | null
}

export interface ChatMetric {
  count: number
  date_from: string | null
  date_to: string | null
}

export interface CoachScore {
  id: number
  name: string
  email: string
  average_score: number | null
  score_count: number
}

export interface CoachStudents {
  id: number
  name: string
  email: string
  student_count: number
  students: Person[]
}

export interface Me {
  name: string
  email: string
  is_support: boolean
  is_staff?: boolean
  is_superuser?: boolean
}

export interface Filters {
  date_from: string | null
  date_to: string | null
  coach: number | null
}

export interface Snapshot {
  sessions: SessionsMetric
  chat: ChatMetric
  coaches: CoachScore[]
  coachStudents: CoachStudents[]
  scores: ScoreRow[]
  scoresTotal: number
  reports: ReportRow[]
  reportsTotal: number
  fetchedAt: number
  filters: Filters
}
