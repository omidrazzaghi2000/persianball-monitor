import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, Inbox, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, triageReport } from '../api/client'
import type { ReportRow, ReportStatus } from '../api/types'
import { Avatar, Chip, Dot, Empty, Segmented, useEscape } from '../components/ui'
import { C, REASON, ROLE, STATUS, dateLabel, num } from '../lib/format'

/**
 * The triage queue: the one place in the panel where support writes back.
 *
 * Everything else here is read-only dashboards. A report is only useful if
 * someone can act on it, so this pairs the list with an editor that PATCHes
 * `status` and `resolution_note`.
 *
 * Ordering is deliberate: open reports first, then in-review, then anything
 * already closed — so the queue always opens on the work that is waiting.
 */

const ORDER: Record<ReportStatus, number> = { OPEN: 0, IN_REVIEW: 1, RESOLVED: 2, DISMISSED: 3 }

const FILTERS = [
  { value: 'TODO' as const, label: 'Needs action' },
  { value: 'ALL' as const, label: 'All' },
  { value: 'RESOLVED' as const, label: 'Closed' },
]
type Filter = (typeof FILTERS)[number]['value']

const STATUS_OPTIONS = (Object.keys(STATUS) as ReportStatus[]).map((s) => ({
  value: s,
  label: STATUS[s].label,
}))

export default function ReportTriage({
  reports,
  onPatched,
}: {
  reports: ReportRow[]
  onPatched: (row: ReportRow) => void
}) {
  const [filter, setFilter] = useState<Filter>('TODO')
  const [openId, setOpenId] = useState<number | null>(null)

  const list = useMemo(() => {
    const keep = (r: ReportRow) =>
      filter === 'ALL' ||
      (filter === 'TODO' ? r.status === 'OPEN' || r.status === 'IN_REVIEW' : r.status === 'RESOLVED' || r.status === 'DISMISSED')
    return reports
      .filter(keep)
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.created_date.localeCompare(a.created_date))
  }, [reports, filter])

  const waiting = reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_REVIEW').length
  const selected = list.find((r) => r.id === openId) ?? null

  return (
    <div className="triage">
      <div className="triage-bar">
        <Segmented id="triage-filter" size="sm" value={filter} options={FILTERS} onChange={setFilter} />
        <span className="triage-count">
          {waiting > 0 ? (
            <>
              <Dot color={C.amber} size={7} /> {num(waiting)} waiting
            </>
          ) : (
            <>
              <Dot color={C.accent} size={7} /> all clear
            </>
          )}
        </span>
      </div>

      {list.length === 0 ? (
        <Empty
          title={filter === 'TODO' ? 'Nothing waiting' : 'No reports here'}
          hint={filter === 'TODO' ? 'Every report in this period has been handled.' : undefined}
          icon={<Inbox size={20} />}
        />
      ) : (
        <ul className="triage-list">
          {list.map((r) => (
            <li key={r.id}>
              <button className="triage-row" onClick={() => setOpenId(r.id)}>
                <Dot color={STATUS[r.status].color} size={8} />
                <Avatar name={r.reporter.name} seed={r.reporter.id} size={28} />
                <span className="triage-main">
                  <strong>{REASON[r.reason].label}</strong>
                  <small>
                    {r.event_title} · {r.reporter.name} ({ROLE[r.reporter_role].one})
                  </small>
                </span>
                <Chip color={STATUS[r.status].color}>{STATUS[r.status].label}</Chip>
                <time>{dateLabel(r.created_date)}</time>
                <ChevronLeft size={16} className="triage-chev" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Portalled to the page: inside the animated card, `position: fixed`
          would be fixed to the card (its transform makes it the containing
          block) and the sheet would be clipped to it. */}
      {createPortal(
        <AnimatePresence>
          {selected && <TriageSheet report={selected} onClose={() => setOpenId(null)} onPatched={onPatched} />}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

function TriageSheet({
  report,
  onClose,
  onPatched,
}: {
  report: ReportRow
  onClose: () => void
  onPatched: (row: ReportRow) => void
}) {
  const [status, setStatus] = useState<ReportStatus>(report.status)
  const [note, setNote] = useState(report.resolution_note)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEscape(onClose, !saving)

  const dirty = status !== report.status || note.trim() !== report.resolution_note.trim()

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = await triageReport(report, { status, resolution_note: note.trim() })
      onPatched(updated)
      setSaved(true)
      setTimeout(onClose, 650)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="tsheet-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={saving ? undefined : onClose}
    >
      <motion.aside
        className="tsheet"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Report triage"
      >
        <header className="tsheet-head">
          <Chip color={REASON[report.reason].color}>{REASON[report.reason].label}</Chip>
          <h3>{report.event_title}</h3>
          <small>
            {dateLabel(report.occurrence_start || report.created_date)} · reported by {report.reporter.name} (
            {ROLE[report.reporter_role].one})
          </small>
        </header>

        <dl className="tsheet-facts">
          {report.coach && (
            <>
              <dt>Coach</dt>
              <dd>{report.coach.name}</dd>
            </>
          )}
          {report.student && (
            <>
              <dt>Student</dt>
              <dd>{report.student.name}</dd>
            </>
          )}
          {report.handled_by && (
            <>
              <dt>Last handled by</dt>
              <dd>
                {report.handled_by.name}
                {report.handled_at ? ` · ${dateLabel(report.handled_at)}` : ''}
              </dd>
            </>
          )}
        </dl>

        {report.description && (
          <blockquote className="tsheet-quote">{report.description}</blockquote>
        )}

        <label className="tsheet-label" htmlFor="triage-status">
          Status
        </label>
        <Segmented id="triage-status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />

        <label className="tsheet-label" htmlFor="triage-note">
          Resolution note
        </label>
        <textarea
          id="triage-note"
          className="tsheet-note"
          rows={4}
          value={note}
          placeholder="What was done about this? The reporter sees this note in the app, on that session."
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="tsheet-error">{error}</p>}

        <div className="tsheet-actions">
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!dirty || saving || saved}>
            {saving ? (
              <>
                <Loader2 size={15} className="spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={15} /> Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </motion.aside>
    </motion.div>
  )
}
