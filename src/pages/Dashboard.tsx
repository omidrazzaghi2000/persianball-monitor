import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { CalendarRange, ChevronDown, LogOut, RefreshCw, TriangleAlert, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Me } from '../api/types'
import { Logo } from '../components/Icons'
import { useToast } from '../components/Toast'
import { Avatar, Segmented, useEscape } from '../components/ui'
import { derive } from '../lib/derive'
import { ago } from '../lib/format'
import { presetRange, useSnapshot, type Preset } from '../lib/useSnapshot'
import Coaches from '../sections/Coaches'
import Feedback from '../sections/Feedback'
import Overview from '../sections/Overview'
import Reports from '../sections/Reports'
import { DashboardSkeleton } from '../sections/Skeleton'

export type Tab = 'overview' | 'feedback' | 'reports' | 'coaches'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'reports', label: 'Reports' },
  { value: 'coaches', label: 'Coaches' },
]

const PRESETS: { value: Preset; label: ReactNode }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: <CalendarRange size={15} aria-label="Custom range" /> },
]

export default function Dashboard({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  const toast = useToast()
  const { data, loading, error, preset, filters, apply, refresh, patchReport } = useSnapshot()
  const derived = useMemo(() => (data ? derive(data) : null), [data])
  const [tab, setTab] = useState<Tab>('overview')
  const [confirmOut, setConfirmOut] = useState(false)
  const [menu, setMenu] = useState(false)
  const [anchor, setAnchor] = useState({ top: 72, right: 24 })
  const [customOpen, setCustomOpen] = useState(preset === 'custom')
  const [range, setRange] = useState({ from: filters.date_from ?? '', to: filters.date_to ?? '' })
  const [, tick] = useState(0)
  const closeOverlays = useCallback(() => {
    setMenu(false)
    setConfirmOut(false)
  }, [])
  useEscape(closeOverlays, menu || confirmOut)

  // Re-render the "updated" label once a minute. Purely local; no network.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (error) toast(error, true)
  }, [error, toast])

  const { scrollY } = useScroll()
  const barShadow = useTransform(scrollY, [0, 60], ['0 0 0 rgba(0,0,0,0)', '0 18px 40px -18px rgba(0,0,0,.7)'])

  const coachName = data?.coaches.find((c) => c.id === filters.coach)?.name

  function pickPreset(p: Preset) {
    if (p === 'custom') {
      setCustomOpen((o) => !o)
      return
    }
    setCustomOpen(false)
    apply(p, { ...filters, ...presetRange(p) })
  }

  function applyCustom() {
    const valid = (v: string) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2020-01-01' && v <= '2100-12-31')
    if (!valid(range.from) || !valid(range.to)) {
      toast('Enter dates between 2020 and 2100', true)
      return
    }
    if (!range.from && !range.to) {
      toast('Pick a start or end date', true)
      return
    }
    if (range.from && range.to && range.from > range.to) {
      toast('The start date must be before the end date', true)
      return
    }
    setCustomOpen(false)
    apply('custom', { ...filters, date_from: range.from || null, date_to: range.to || null })
  }

  function focusCoach(id: number | null) {
    apply(preset, { ...filters, coach: id })
    setTab('overview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.div
      className="shell"
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.header className="topbar glass rim" style={{ boxShadow: barShadow }}>
        <div className="brand">
          <Logo size={38} />
          <div className="brand-text">
            <span className="wordmark">PersianBall</span>
            <small>Monitor</small>
          </div>
        </div>

        <nav className="tabs-desktop">
          <Segmented id="tabs" value={tab} options={TABS} onChange={setTab} />
        </nav>

        <div className="top-actions">
          <span className="updated" title={data ? new Date(data.fetchedAt).toLocaleString() : ''}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={loading ? 'l' : data?.fetchedAt ?? 'n'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {loading ? 'Updating…' : data ? `Updated ${ago(data.fetchedAt)}` : ''}
              </motion.span>
            </AnimatePresence>
          </span>
          <motion.button
            className="btn ghost icon refresh"
            onClick={refresh}
            disabled={loading}
            whileTap={{ scale: 0.9 }}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <motion.span
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0.3 }}
              style={{ display: 'flex' }}
            >
              <RefreshCw size={18} />
            </motion.span>
          </motion.button>

          <div className="me">
            <button
              className="me-btn"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setAnchor({ top: r.bottom + 10, right: window.innerWidth - r.right })
                setMenu((m) => !m)
              }}
              aria-expanded={menu}
              aria-haspopup="menu"
            >
              <Avatar name={me.name} seed={me.email} size={34} />
              <span className="me-name">{me.name.split(' ')[0]}</span>
              <ChevronDown size={14} />
            </button>
            {/* Portalled out of the bar: glass nested in glass can't refract the page. */}
            {createPortal(
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="click-away" onClick={() => setMenu(false)} />
                    <motion.div
                      className="menu glass rim"
                      role="menu"
                      style={{ top: anchor.top, right: anchor.right }}
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                    >
                      <div className="menu-head">
                        <Avatar name={me.name} seed={me.email} size={42} />
                        <div className="menu-who">
                          <strong>{me.name}</strong>
                          <span>{me.email}</span>
                        </div>
                      </div>
                      <button
                        className="menu-item danger"
                        role="menuitem"
                        onClick={() => {
                          setMenu(false)
                          setConfirmOut(true)
                        }}
                      >
                        <LogOut size={16} /> Log out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>,
              document.body,
            )}
          </div>
        </div>
      </motion.header>

      <nav className="tabs-mobile">
        <Segmented id="tabs-m" value={tab} options={TABS} onChange={setTab} size="sm" />
      </nav>

      <div className="filters">
        <div className="page-title">
          <motion.h1 key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
            {TABS.find((t) => t.value === tab)!.label}
          </motion.h1>
          <p>
            {rangeText(filters.date_from, filters.date_to)}
            {coachName && <> · {coachName}</>}
          </p>
        </div>
        <div className="filter-controls">
          <AnimatePresence>
            {filters.coach && (
              <motion.button
                className="coach-pill"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => focusCoach(null)}
                layout
              >
                <UserRound size={14} /> {coachName ?? 'Coach'} <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
          <CoachSelect
            coaches={data?.coaches ?? []}
            value={filters.coach}
            onChange={(id) => apply(preset, { ...filters, coach: id })}
          />
          <Segmented id="range" value={customOpen ? 'custom' : preset} options={PRESETS} onChange={pickPreset} size="sm" />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {customOpen && (
          <motion.div
            className="custom-range glass rim"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="custom-inner">
              <label>
                From
                <input type="date" value={range.from} min="2020-01-01" max={range.to || '2100-12-31'} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </label>
              <label>
                To
                <input type="date" value={range.to} min={range.from || '2020-01-01'} max="2100-12-31" onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </label>
              <button className="btn primary" onClick={applyCustom}>
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="content">
        {!data || !derived ? (
          error && !loading ? (
            <div className="load-error card rim">
              <TriangleAlert size={28} color="var(--amber)" />
              <strong>We couldn't load the dashboard</strong>
              <span>{error}</span>
              <button className="btn primary" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : (
            <DashboardSkeleton />
          )
        ) : (
          <motion.div className={loading ? 'is-refreshing' : ''} animate={{ opacity: loading ? 0.6 : 1 }} transition={{ duration: 0.3 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${data.fetchedAt}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === 'overview' && <Overview data={data} d={derived} onTab={setTab} onCoach={focusCoach} />}
                {tab === 'feedback' && <Feedback data={data} d={derived} />}
                {tab === 'reports' && <Reports data={data} d={derived} onPatch={patchReport} />}
                {tab === 'coaches' && <Coaches data={data} onCoach={focusCoach} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {confirmOut && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmOut(false)}>
            <motion.div
              className="dialog glass rim center"
              role="alertdialog"
              aria-labelledby="out-title"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div className="dialog-orb">
                <LogOut size={22} />
              </div>
              <h2 id="out-title">Log out?</h2>
              <p>You'll need to sign in again to view the monitoring panel.</p>
              <div className="dialog-actions">
                <button className="btn ghost" onClick={() => setConfirmOut(false)}>
                  Cancel
                </button>
                <button className="btn danger" onClick={onSignOut} autoFocus>
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function rangeText(from: string | null, to: string | null) {
  const f = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!from && !to) return 'All time'
  if (from && !to) return `${f(from)} – Today`
  if (!from && to) return `Until ${f(to)}`
  return `${f(from!)} – ${f(to!)}`
}

function CoachSelect({
  coaches,
  value,
  onChange,
}: {
  coaches: { id: number; name: string }[]
  value: number | null
  onChange: (id: number | null) => void
}) {
  return (
    <label className="select">
      <UserRound size={15} />
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} aria-label="Filter by coach">
        <option value="">All coaches</option>
        {[...coaches]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <ChevronDown size={14} />
    </label>
  )
}
