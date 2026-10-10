import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCoachDetail } from '../api/client'
import type { CoachDetail, Filters, Person } from '../api/types'

const PICK_KEY = 'pbm.coach.v1'

function readPick(): number | null {
  try {
    const v = localStorage.getItem(PICK_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

/**
 * The coach drill-down. Loads only when a coach is picked (or the period or
 * refresh changes), and keeps each result so switching back to a coach
 * doesn't ask the server again.
 */
export function useCoachDetail(roster: { id: number; students: Person[] }[], filters: Filters, refreshedAt: number | undefined) {
  const [coachId, setCoachId] = useState<number | null>(readPick)
  const [detail, setDetail] = useState<CoachDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, CoachDetail>())
  const ticket = useRef(0)

  // Default to the coach with the most students once the roster arrives.
  const effective = coachId !== null && roster.some((c) => c.id === coachId) ? coachId : roster[0]?.id ?? null

  const pick = useCallback((id: number) => {
    setCoachId(id)
    try {
      localStorage.setItem(PICK_KEY, String(id))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (effective === null || refreshedAt === undefined) return
    const key = `${effective}|${filters.date_from}|${filters.date_to}|${refreshedAt}`
    const hit = cache.current.get(key)
    if (hit) {
      setDetail(hit)
      return
    }
    const students = roster.find((c) => c.id === effective)?.students ?? []
    const t = ++ticket.current
    setLoading(true)
    setError(null)
    fetchCoachDetail(effective, students, filters)
      .then((d) => {
        cache.current.set(key, d)
        if (t === ticket.current) setDetail(d)
      })
      .catch((e) => t === ticket.current && setError(e instanceof Error ? e.message : 'Could not load this coach'))
      .finally(() => t === ticket.current && setLoading(false))
    // roster identity changes with every snapshot; refreshedAt already covers that
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective, filters.date_from, filters.date_to, refreshedAt])

  return { coachId: effective, pick, detail: detail?.coachId === effective ? detail : null, loading, error }
}
