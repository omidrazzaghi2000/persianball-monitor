import type {
  ChatMetric,
  CoachScore,
  CoachStudents,
  Filters,
  Me,
  Paginated,
  Person,
  ReportReason,
  ReportRow,
  ReportStatus,
  Role,
  ScoreRow,
  SessionsMetric,
  Snapshot,
} from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

const ACCESS_KEY = 'pbm.access'
const REFRESH_KEY = 'pbm.refresh'
const ME_KEY = 'pbm.me'

/** Largest page the panel endpoints allow. One page per list keeps a refresh to five calls. */
const PAGE = 200

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ── storage ─────────────────────────────────────────────────────────────────

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the session just won't persist */
  }
}

export function storedMe(): Me | null {
  const raw = read(ME_KEY)
  if (!raw || !read(ACCESS_KEY)) return null
  try {
    return JSON.parse(raw) as Me
  } catch {
    return null
  }
}

export function clearSession() {
  write(ACCESS_KEY, null)
  write(REFRESH_KEY, null)
  write(ME_KEY, null)
}

// ── transport ───────────────────────────────────────────────────────────────

function decodeClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(payload))))
  } catch {
    return {}
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (typeof b.detail === 'string') return b.detail
    const first = Object.values(b)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
}

let refreshing: Promise<boolean> | null = null

async function refreshAccess(): Promise<boolean> {
  const refresh = read(REFRESH_KEY)
  if (!refresh) return false
  refreshing ??= (async () => {
    const res = await raw('/api/authentication/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    write(ACCESS_KEY, data.access)
    if (data.refresh) write(REFRESH_KEY, data.refresh)
    return true
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  const token = read(ACCESS_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await raw(path, { ...init, headers })
  if (res.status === 401 && retry && (await refreshAccess())) {
    return request<T>(path, init, false)
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('pbm:signed-out'))
  }
  if (!res.ok) throw new ApiError(res.status, messageFrom(body, `Request failed (${res.status})`))
  return body as T
}

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ── normalising ─────────────────────────────────────────────────────────────
// Rows are read defensively: a person may arrive as an object or a bare name,
// and role fields may be named generically.

function person(v: unknown, fallbackId?: unknown): Person | null {
  if (!v) return null
  if (typeof v === 'object') {
    const p = v as Record<string, unknown>
    return {
      id: Number(p.id ?? fallbackId ?? 0),
      name: String(p.name || p.full_name || p.email || 'Unknown'),
      email: p.email ? String(p.email) : undefined,
    }
  }
  return { id: Number(fallbackId ?? 0), name: String(v) }
}

function role(v: unknown): Role {
  const r = String(v ?? '').toLowerCase()
  return r === 'coach' || r === 'parent' ? r : 'student'
}

const REASONS: ReportReason[] = ['COACH_ABSENT', 'STUDENT_ABSENT', 'LATE', 'TECHNICAL_ISSUE', 'QUALITY', 'OTHER']
const STATUSES: ReportStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = String(v ?? '').toUpperCase() as T
  return allowed.includes(s) ? s : fallback
}

function normScore(r: Record<string, unknown>): ScoreRow {
  return {
    id: Number(r.id),
    occurrence: Number(r.occurrence ?? r.occurrence_id ?? 0),
    score: Number(r.score ?? 0),
    comment: String(r.comment ?? ''),
    author: person(r.author) ?? { id: 0, name: 'Unknown' },
    author_role: role(r.author_role ?? r.role),
    event_id: Number(r.event_id ?? 0),
    event_title: String(r.event_title ?? 'Session'),
    coach: person(r.coach, r.coach_id),
    student: person(r.student, r.student_id),
    occurrence_start: String(r.occurrence_start ?? r.created_date ?? ''),
    occurrence_end: String(r.occurrence_end ?? ''),
    created_date: String(r.created_date ?? r.occurrence_start ?? ''),
  }
}

function normReport(r: Record<string, unknown>): ReportRow {
  return {
    id: Number(r.id),
    occurrence: Number(r.occurrence ?? r.occurrence_id ?? 0),
    reason: oneOf(r.reason, REASONS, 'OTHER'),
    description: String(r.description ?? ''),
    status: oneOf(r.status, STATUSES, 'OPEN'),
    resolution_note: String(r.resolution_note ?? ''),
    reporter: person(r.reporter) ?? { id: 0, name: 'Unknown' },
    reporter_role: role(r.reporter_role ?? r.role),
    event_id: Number(r.event_id ?? 0),
    event_title: String(r.event_title ?? 'Session'),
    coach: person(r.coach, r.coach_id),
    student: person(r.student, r.student_id),
    occurrence_start: String(r.occurrence_start ?? r.created_date ?? ''),
    occurrence_end: String(r.occurrence_end ?? ''),
    created_date: String(r.created_date ?? r.occurrence_start ?? ''),
    handled_by: person(r.handled_by),
    handled_at: (r.handled_at as string | null) ?? null,
  }
}

// ── public API ──────────────────────────────────────────────────────────────

export async function signIn(username: string, password: string): Promise<Me> {
  const res = await raw('/api/authentication/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status,
      res.status === 401 || res.status === 400
        ? 'Email, phone or password is incorrect.'
        : messageFrom(body, 'Sign-in failed. Please try again.'),
    )
  }
  write(ACCESS_KEY, body.access)
  write(REFRESH_KEY, body.refresh)

  const claims = decodeClaims(body.access)
  let info: Record<string, unknown> = {}
  try {
    info = await request<Record<string, unknown>>('/api/authentication/user-info/')
  } catch {
    /* fall back to the token claims */
  }
  const me: Me = {
    name: String(info.name || [info.first_name, info.last_name].filter(Boolean).join(' ') || info.email || username),
    email: String(info.email ?? username),
    is_support: Boolean(info.is_support ?? claims.is_support),
    is_staff: Boolean(info.is_staff ?? claims.is_staff),
    is_superuser: Boolean(info.is_superuser ?? claims.is_superuser),
  }
  if (!me.is_support && !me.is_staff && !me.is_superuser) {
    clearSession()
    throw new ApiError(403, 'This account does not have access to the monitoring panel.')
  }
  write(ME_KEY, JSON.stringify(me))
  return me
}

export async function requestPasswordReset(username: string): Promise<void> {
  await request('/api/authentication/request-reset-password/', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export const STEPS = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'chat', label: 'Chat activity' },
  { key: 'coaches', label: 'Coach ratings' },
  { key: 'students', label: 'Coach students' },
  { key: 'scores', label: 'Session feedback' },
  { key: 'reports', label: 'Issue reports' },
] as const
export type StepKey = (typeof STEPS)[number]['key']

function rows<T>(page: Paginated<T> | T[]): T[] {
  return Array.isArray(page) ? page : page.results
}

/**
 * Everything the page shows, in six parallel calls. Every chart is derived from
 * these on the client, so nothing else is fetched until the person refreshes or
 * changes the filters. `onStep` fires as each call lands, to drive the progress UI.
 */
export async function fetchSnapshot(filters: Filters, onStep?: (key: StepKey) => void): Promise<Snapshot> {
  const range = { date_from: filters.date_from, date_to: filters.date_to }
  const scoped = { ...range, coach: filters.coach }
  const track = <T,>(key: StepKey, p: Promise<T>) =>
    p.then((v) => {
      onStep?.(key)
      return v
    })

  const [sessions, chat, coaches, coachStudents, scores, reports] = await Promise.all([
    track('sessions', request<SessionsMetric>(`/api/monitoring/panel/metrics/sessions/${query(scoped)}`)),
    track('chat', request<ChatMetric>(`/api/monitoring/panel/metrics/chat-messages/${query(scoped)}`)),
    track(
      'coaches',
      request<Paginated<CoachScore> | CoachScore[]>(
        `/api/monitoring/panel/metrics/coach-scores/${query({ ...range, page_size: PAGE })}`,
      ),
    ),
    track(
      'students',
      request<Paginated<CoachStudents> | CoachStudents[]>(
        `/api/monitoring/panel/metrics/coach-students/${query({ ...scoped, page_size: PAGE })}`,
      ),
    ),
    // Newest first when the server supports ordering; ignored otherwise.
    track(
      'scores',
      request<Paginated<Record<string, unknown>>>(
        `/api/monitoring/panel/scores/${query({ ...scoped, page_size: PAGE, ordering: '-created_date' })}`,
      ),
    ),
    track(
      'reports',
      request<Paginated<Record<string, unknown>>>(
        `/api/monitoring/panel/reports/${query({ ...scoped, page_size: PAGE, ordering: '-created_date' })}`,
      ),
    ),
  ])

  return {
    sessions,
    chat,
    coaches: rows(coaches).map((c) => ({
      ...c,
      average_score: c.average_score === null || c.average_score === undefined ? null : Number(c.average_score),
      score_count: Number(c.score_count ?? 0),
    })),
    coachStudents: rows(coachStudents).map((c) => ({
      id: Number(c.id),
      name: String(c.name ?? ''),
      email: String(c.email ?? ''),
      student_count: Number(c.student_count ?? c.students?.length ?? 0),
      students: (c.students ?? []).map((p) => person(p) ?? { id: 0, name: 'Unknown' }),
    })),
    scores: scores.results.map(normScore).sort((a, b) => b.occurrence_start.localeCompare(a.occurrence_start)),
    scoresTotal: scores.count,
    reports: reports.results.map(normReport).sort((a, b) => b.created_date.localeCompare(a.created_date)),
    reportsTotal: reports.count,
    fetchedAt: Date.now(),
    filters,
  }
}
