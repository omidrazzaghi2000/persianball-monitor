import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { CheckCircle2, Clock3, Flag, Search, ShieldCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { storedMe, triageReport } from '../api/client'
import { DEMO, demoMe } from '../api/demo'
import type { ReportReason, ReportRow, ReportStatus, Snapshot } from '../api/types'
import { ReasonBubbles } from '../components/charts'
import { useToast } from '../components/Toast'
import { Avatar, CardHeader, Chip, Dot, Empty, GlassCard, Segmented, useEscape } from '../components/ui'
import type { Derived } from '../lib/derive'
import { REASON, ROLE, STATUS, ago, dateTime, num } from '../lib/format'

type StatusFilter = ReportStatus | 'ALL' | 'ACTIVE'

export default function Reports({
  data,
  d,
  onPatch,
}: {
  data: Snapshot
  d: Derived
  onPatch: (id: number, patch: Partial<ReportRow>) => void
}) {
  const [status, setStatus] = useState<StatusFilter>('ACTIVE')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return data.reports
      .filter((r) =>
        status === 'ALL' ? true : status === 'ACTIVE' ? r.status === 'OPEN' || r.status === 'IN_REVIEW' : r.status === status,
      )
      .filter((r) => !reason || r.reason === reason)
      .filter(
        (r) =>
          !term ||
          [r.description, r.reporter.name, r.event_title, r.coach?.name, r.student?.name].some((x) => x?.toLowerCase().includes(term)),
      )
  }, [data.reports, status, reason, q])

  const open = data.reports.find((r) => r.id === openId) ?? null
  const counts = (s: StatusFilter) =>
    s === 'ALL'
      ? data.reports.length
      : s === 'ACTIVE'
        ? data.reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_REVIEW').length
        : data.reports.filter((r) => r.status === s).length

  return (
    <div className="grid">
      <GlassCard index={0} className="span-4 reports-side">
        <CardHeader title="By reason" caption="Tap a bubble to filter" />
        <div className="bubble-box">
          {data.reports.length ? (
            <ReasonBubbles data={d.reasons} active={reason} onPick={(r) => setReason(reason === r ? null : r)} />
          ) : (
            <Empty title="No reports" />
          )}
        </div>
        <ul className="reason-list">
          {d.reasons.map((r) => (
            <li key={r.reason}>
              <button className={reason === r.reason ? 'on' : ''} onClick={() => setReason(reason === r.reason ? null : r.reason)}>
                <Dot color={REASON[r.reason].color} />
                <span>{REASON[r.reason].label}</span>
                <b className="num">{r.count}</b>
              </button>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard index={1} className="span-8">
        <CardHeader
          title="Reports"
          caption={
            <>
              {num(rows.length)} shown
              {data.reportsTotal > data.reports.length && <> · latest {num(data.reports.length)} of {num(data.reportsTotal)}</>}
            </>
          }
          right={
            <label className="search">
              <Search size={15} />
              <input placeholder="Search reports" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          }
        />
        <div className="status-tabs">
          <Segmented
            id="rep-status"
            size="sm"
            value={status}
            onChange={setStatus}
            options={(['ACTIVE', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ALL'] as StatusFilter[]).map((s) => ({
              value: s,
              label: (
                <>
                  {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Needs action' : STATUS[s].label}
                  <span className="count num">{counts(s)}</span>
                </>
              ),
            }))}
          />
        </div>
        {reason && (
          <div className="active-filters">
            <button onClick={() => setReason(null)}>
              <Chip color={REASON[reason].color}>{REASON[reason].label} ✕</Chip>
            </button>
          </div>
        )}

        {rows.length ? (
          <motion.ul className="report-list" layout>
            <AnimatePresence mode="popLayout" initial={false}>
              {rows.map((r, i) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28, delay: Math.min(i, 10) * 0.02 }}
                >
                  <button className="report-row" onClick={() => setOpenId(r.id)}>
                    <span className="report-reason" style={{ ['--c' as string]: REASON[r.reason].color }}>
                      <Flag size={16} />
                    </span>
                    <span className="report-main">
                      <span className="report-title">
                        <strong>{REASON[r.reason].label}</strong>
                        <span className="muted">· {r.event_title}</span>
                      </span>
                      <span className="report-desc">{r.description || 'No description'}</span>
                      <span className="report-meta">
                        {r.reporter.name} ({ROLE[r.reporter_role].one.toLowerCase()}) · coach {r.coach?.name ?? '—'} · {ago(r.created_date)}
                      </span>
                    </span>
                    <Chip color={STATUS[r.status].color}>{STATUS[r.status].label}</Chip>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <Empty
            title={status === 'ACTIVE' ? 'All caught up' : 'No reports here'}
            hint={status === 'ACTIVE' ? 'Every report has been handled.' : 'Try another status or reason.'}
            icon={<ShieldCheck size={20} />}
          />
        )}
      </GlassCard>

      <AnimatePresence>{open && <ReportSheet key={open.id} report={open} onClose={() => setOpenId(null)} onPatch={onPatch} />}</AnimatePresence>
    </div>
  )
}

function ReportSheet({
  report,
  onClose,
  onPatch,
}: {
  report: ReportRow
  onClose: () => void
  onPatch: (id: number, patch: Partial<ReportRow>) => void
}) {
  const toast = useToast()
  const [status, setStatus] = useState<ReportStatus>(report.status)
  const [note, setNote] = useState(report.resolution_note)
  const [busy, setBusy] = useState(false)
  const dirty = status !== report.status || note !== report.resolution_note
  const drag = useDragControls()
  useEscape(onClose)

  async function save() {
    setBusy(true)
    try {
      const res = DEMO ? null : await triageReport(report.id, status, note)
      // The server records the signed-in user as the handler.
      const actor = DEMO ? demoMe : storedMe()
      onPatch(report.id, {
        status,
        resolution_note: note,
        handled_at: res?.handled_at ?? new Date().toISOString(),
        handled_by: actor ? { id: 0, name: actor.name, email: actor.email } : report.handled_by,
      })
      toast(`Report marked ${STATUS[status].label.toLowerCase()}`)
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the report', true)
    } finally {
      setBusy(false)
    }
  }

  const meta = REASON[report.reason]
  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className="sheet glass rim"
        role="dialog"
        aria-label="Report details"
        initial={{ x: '105%', opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '105%', opacity: 0.6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        drag="x"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 120 || info.velocity.x > 600) onClose()
        }}
      >
        <div className="sheet-grip" onPointerDown={(e) => drag.start(e)} />
        <header className="sheet-head" onPointerDown={(e) => drag.start(e)}>
          <span className="report-reason lg" style={{ ['--c' as string]: meta.color }}>
            <Flag size={20} />
          </span>
          <div>
            <h2>{meta.label}</h2>
            <span>Report #{report.id} · {dateTime(report.created_date)}</span>
          </div>
          <button className="btn ghost icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="sheet-body scroll-y">
          <blockquote>{report.description || 'No description was given.'}</blockquote>

          <dl className="facts">
            <div>
              <dt>Reporter</dt>
              <dd>
                <Avatar name={report.reporter.name} seed={report.reporter.id} size={26} /> {report.reporter.name}
                <Chip color={ROLE[report.reporter_role].color}>{ROLE[report.reporter_role].one}</Chip>
              </dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>{report.event_title}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>
                <Clock3 size={14} /> {dateTime(report.occurrence_start)}
              </dd>
            </div>
            <div>
              <dt>Coach</dt>
              <dd>{report.coach?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Student</dt>
              <dd>{report.student?.name ?? '—'}</dd>
            </div>
            {report.handled_by && (
              <div>
                <dt>Handled by</dt>
                <dd>
                  <CheckCircle2 size={14} color="var(--accent)" /> {report.handled_by.name}
                  {report.handled_at && <span className="muted"> · {ago(report.handled_at)}</span>}
                </dd>
              </div>
            )}
          </dl>

          <h3 className="sheet-section">Triage</h3>
          <div className="status-picker">
            {(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as ReportStatus[]).map((s) => (
              <button key={s} className={status === s ? 'on' : ''} style={{ ['--c' as string]: STATUS[s].color }} onClick={() => setStatus(s)}>
                {status === s && <motion.span layoutId="status-pill" className="status-pill" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                <span className="status-label">
                  <Dot color={STATUS[s].color} size={7} /> {STATUS[s].label}
                </span>
              </button>
            ))}
          </div>
          <textarea
            className="note"
            placeholder="Resolution note (visible to the support team)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
        </div>

        <footer className="sheet-foot">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!dirty || busy}>
            {busy ? <span className="spinner" /> : 'Save changes'}
          </button>
        </footer>
      </motion.aside>
    </>
  )
}
