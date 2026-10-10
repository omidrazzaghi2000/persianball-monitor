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
}

export interface Snapshot {
  sessions: SessionsMetric
  chat: ChatMetric
  coachStudents: CoachStudents[]
  reports: ReportRow[]
  reportsTotal: number
  /** null until the backend ships the endpoint. */
  users: UserMetrics | null
  chatStudents: ChatStudentsMetric | null
  comments: CommentMetrics | null
  fetchedAt: number
  filters: Filters
}

// ── Metrics that need the new endpoints (see MONITORING_REQUESTS.md) ─────────

export interface UserMetrics {
  /** One row per day for the last 30 days. */
  daily: { date: string; registered: number; buyers: number }[]
  /** Sign-ups per platform within the same 30 days. */
  platforms_period: { platform: string; count: number }[]
  /** All registered users per platform, all time. */
  platforms_total: { platform: string; count: number }[]
  totals: { registered: number; buyers: number }
}

export interface ChatStudentsMetric {
  count: number
}

export interface CommentMetrics {
  monthly: { month: string; total: number; answered: number; unanswered: number }[]
  totals: { total: number; answered: number; unanswered: number }
}

export interface CoachStudentChat {
  student: Person
  message_count: number
  last_message_at: string | null
}

export interface CoachStudentWorkouts {
  student: Person
  assigned_count: number
  last_assigned_at: string | null
}

/** Drill-down for one coach, loaded when a coach is picked. */
export interface CoachDetail {
  coachId: number
  monthly: { month: string; label: string; sessions: number; cancelled: number }[]
  perStudent: { student: Person; sessions: number; chats: number | null; lastChat: string | null; workouts: number | null; lastWorkout: string | null }[]
  chatsAvailable: boolean
  lastChatAvailable: boolean
  workoutsAvailable: boolean
  fetchedAt: number
}
