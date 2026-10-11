import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSnapshot, type StepKey } from '../api/client'
import type { Filters, Snapshot } from '../api/types'
import { isoDay } from './format'

export type Preset = '7d' | '30d' | '90d' | 'all' | 'custom'

const CACHE_KEY = 'pbm.snapshot.v3'
const PREFS_KEY = 'pbm.prefs.v2'

export function presetRange(p: Preset): Pick<Filters, 'date_from' | 'date_to'> {
  if (p === 'all' || p === 'custom') return { date_from: null, date_to: null }
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return { date_from: isoDay(d), date_to: null }
}

interface Prefs {
  preset: Preset
  filters: Filters
}

function load<T>(key: string, store: Storage | null): T | null {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function save(key: string, value: unknown, store: Storage | null) {
  try {
    store?.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
const session = (() => {
  try {
    return sessionStorage
  } catch {
    return null
  }
})()
const local = (() => {
  try {
    return localStorage
  } catch {
    return null
  }
})()

/**
 * Holds the dashboard data. It fetches once when there is nothing cached, and
 * after that only when the person presses refresh or applies new filters —
 * there is no polling. The last result survives a page reload for the tab.
 */
export function useSnapshot() {
  const prefs = load<Prefs>(PREFS_KEY, local)
  const [preset, setPreset] = useState<Preset>(prefs?.preset ?? '30d')
  const [filters, setFilters] = useState<Filters>(
    prefs?.filters ?? { ...presetRange('30d') },
  )
  const [data, setData] = useState<Snapshot | null>(() => {
    const cached = load<Snapshot>(CACHE_KEY, session)
    return cached && JSON.stringify(cached.filters) === JSON.stringify(prefs?.filters ?? cached.filters) ? cached : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<StepKey[]>([])
  const inflight = useRef(0)

  const run = useCallback(async (f: Filters) => {
    const ticket = ++inflight.current
    setLoading(true)
    setError(null)
    setDone([])
    try {
      const snap = await fetchSnapshot(f, (key) => {
        if (ticket === inflight.current) setDone((d) => [...d, key])
      })
      if (ticket !== inflight.current) return
      setData(snap)
      save(CACHE_KEY, snap, session)
    } catch (e) {
      if (ticket !== inflight.current) return
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      if (ticket === inflight.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!data) run(filters)
    // first mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = useCallback(
    (nextPreset: Preset, next: Filters) => {
      setPreset(nextPreset)
      setFilters(next)
      save(PREFS_KEY, { preset: nextPreset, filters: next }, local)
      run(next)
    },
    [run],
  )

  // Relative presets ("last 30 days") are re-anchored to today on every refresh.
  const refresh = useCallback(() => {
    if (preset === 'custom') run(filters)
    else apply(preset, { ...filters, ...presetRange(preset) })
  }, [run, apply, preset, filters])

  return { data, loading, error, done, preset, filters, apply, refresh }
}

export function clearSnapshotCache() {
  try {
    session?.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}
