import { motion } from 'framer-motion'
import { CalendarCheck2, CalendarX2, Flag, GraduationCap, MessagesSquare, ShieldCheck, Sparkles, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Role, Snapshot } from '../api/types'
import {
  CoachScatter,
  Columns,
  Donut,
  LiquidOrb,
  MeterBars,
  RankBars,
  ReasonBubbles,
  ReasonRoleBars,
  Ring,
  Sparkline,
  StackBar,
  TrendChart,
} from '../components/charts'
import { AnimatedNumber, Avatar, CardHeader, Chip, Dot, Empty, GlassCard, Stars } from '../components/ui'
import type { Derived } from '../lib/derive'
import { C, REASON, ROLE, STATUS, ago, dateTime, num } from '../lib/format'

export const SECTIONS = [
  { id: 'snapshot', title: 'Snapshot', caption: 'The headline numbers for the selected period.' },
  { id: 'sessions', title: 'Sessions', caption: 'How many sessions ran, and how busy each day was.' },
  { id: 'ratings', title: 'Ratings', caption: 'How participants scored their sessions.' },
  { id: 'reports', title: 'Reports', caption: 'Issues raised after sessions, and where triage stands.' },
  { id: 'coaches', title: 'Coaches', caption: 'Each coach’s rating, reach and workload.' },
  { id: 'voices', title: 'Voices', caption: 'The latest comments and the reports still open.' },
] as const

const scoreTone = (v: number) => (v >= 4.3 ? C.accent : v >= 3.5 ? C.amber : C.red)

export default function Monitor({ data, d, onCoach }: { data: Snapshot; d: Derived; onCoach: (id: number) => void }) {
  const ratingsCount = data.scores.length
  const avgSeries = d.trend.filter((p) => p.avg !== null).map((p) => p.avg!)
  const reportSeries = d.trend.map((p) => p.reports)
  const open = data.reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_REVIEW')

  const byRating = d.coachRows
    .filter((c) => c.avg !== null)
    .sort((a, b) => b.avg! - a.avg!)
    .slice(0, 10)
    .map((c) => ({ label: c.name, avg: Math.round(c.avg! * 100) / 100 }))
  const byStudents = [...d.coachRows]
    .filter((c) => c.students > 0)
    .sort((a, b) => b.students - a.students)
    .slice(0, 10)
    .map((c) => ({ label: c.name, students: c.students }))
  const scatter = d.coachRows
    .filter((c) => c.avg !== null)
    .map((c) => ({ name: c.name, students: c.students, avg: Math.round(c.avg! * 100) / 100, ratings: c.ratings }))
  const leaders = d.coachRows
    .filter((c) => c.avg !== null)
    .sort((a, b) => b.avg! - a.avg! || b.ratings - a.ratings)
    .slice(0, 6)
  const sampled = data.scoresTotal > data.scores.length || data.reportsTotal > data.reports.length

  return (
    <>
      {/* ── 01 Snapshot ─────────────────────────────────────────── */}
      <Step n={1}>
        <div className="grid">
          <Kpi index={0} icon={<CalendarCheck2 size={18} />} color={C.accent} label="Sessions held" value={<AnimatedNumber value={data.sessions.count} />}
            foot={<span>{num(data.sessions.total_count)} scheduled</span>} />
          <Kpi index={1} icon={<CalendarX2 size={18} />} color={C.red} label="Cancelled" value={<AnimatedNumber value={data.sessions.cancelled_count} />}
            foot={<span><b className="num">{d.cancelRate === null ? '—' : `${(d.cancelRate * 100).toFixed(1)}%`}</b> of scheduled</span>} />
          <Kpi index={2} icon={<MessagesSquare size={18} />} color={C.sky} label="Chat messages" value={<AnimatedNumber value={data.chat.count} />}
            foot={<span><b className="num">{d.messagesPerSession === null ? '—' : d.messagesPerSession.toFixed(1)}</b> per session</span>} />
          <Kpi index={3} icon={<Star size={18} />} color={C.amber} label="Average rating"
            value={<><AnimatedNumber value={d.avgScore} decimals={2} /><small>/5</small></>}
            foot={<span>{num(ratingsCount)} ratings</span>} spark={avgSeries} />
          <Kpi index={4} icon={<Flag size={18} />} color={C.pink} label="Open reports" value={<AnimatedNumber value={d.openReports} />}
            foot={<span><b className="num">{d.resolutionRate === null ? '—' : `${Math.round(d.resolutionRate * 100)}%`}</b> closed</span>} spark={reportSeries} bars />
          <Kpi index={5} icon={<GraduationCap size={18} />} color={C.indigo} label="Students coached" value={<AnimatedNumber value={d.studentsCovered} />}
            foot={<span>by {num(d.activeCoaches)} coaches</span>} />
        </div>
        {sampled && (
          <p className="sample-note">
            Charts use the latest {num(Math.max(data.scores.length, data.reports.length))} records of each list; totals above come straight from the server.
          </p>
        )}
      </Step>

      {/* ── 02 Sessions ─────────────────────────────────────────── */}
      <Step n={2}>
        <div className="grid">
          <GlassCard index={0} className="span-4 tall">
            <CardHeader title="Session health" caption="Held vs. scheduled" />
            <div className="ring-wrap">
              <Ring value={data.sessions.count} total={data.sessions.total_count} size={190} stroke={16}>
                <AnimatedNumber value={data.sessions.total_count ? (data.sessions.count / data.sessions.total_count) * 100 : null} decimals={1} suffix="%" className="ring-value" />
                <span>held</span>
              </Ring>
            </div>
            <div className="split-stats">
              <div><span>Held</span><b className="num" style={{ color: C.accent }}>{num(data.sessions.count)}</b></div>
              <div><span>Cancelled</span><b className="num" style={{ color: C.red }}>{num(data.sessions.cancelled_count)}</b></div>
              <div><span>Scheduled</span><b className="num">{num(data.sessions.total_count)}</b></div>
            </div>
          </GlassCard>
          <GlassCard index={1} className="span-8 tall">
            <CardHeader title="Daily activity" caption="Feedback and reports by session date" />
            <div className="chart-box">{d.trend.length ? <TrendChart data={d.trend} mode="volume" /> : <Empty title="No activity in this period" />}</div>
            <Legendary items={[['Feedback', C.accent], ['Reports', C.red]]} />
          </GlassCard>
        </div>
      </Step>

      {/* ── 03 Ratings ──────────────────────────────────────────── */}
      <Step n={3}>
        <div className="grid">
          <GlassCard index={0} className="span-8 tall">
            <CardHeader title="Rating over time" caption="Average session score, 1 to 5" />
            <div className="chart-box">{avgSeries.length ? <TrendChart data={d.trend} mode="quality" /> : <Empty title="No ratings in this period" />}</div>
          </GlassCard>
          <GlassCard index={1} className="span-4 tall">
            <CardHeader title="Sentiment" caption="4–5 positive · 3 neutral · 1–2 negative" />
            <div className="sentiment-hero">
              <LiquidOrb value={ratingsCount ? d.sentiment.positive / ratingsCount : 0}>
                <AnimatedNumber value={ratingsCount ? (d.sentiment.positive / ratingsCount) * 100 : null} suffix="%" className="orb-value" />
                <span>positive</span>
              </LiquidOrb>
            </div>
            <StackBar parts={[
              { key: 'p', value: d.sentiment.positive, color: C.accent, label: 'Positive' },
              { key: 'n', value: d.sentiment.neutral, color: C.amber, label: 'Neutral' },
              { key: 'x', value: d.sentiment.negative, color: C.red, label: 'Negative' },
            ]} />
          </GlassCard>

          <GlassCard index={2} className="span-4">
            <CardHeader title="Score distribution" caption="Number of ratings at each score" />
            <div className="big-stat">
              <AnimatedNumber value={d.avgScore} decimals={2} className="big-number" />
              <div><Stars value={Math.round(d.avgScore ?? 0)} size={15} /><span>{num(ratingsCount)} ratings</span></div>
            </div>
            <MeterBars rows={[...d.distribution].reverse().map((r) => ({
              key: String(r.score),
              label: <>{r.score} <Star size={11} fill="currentColor" /></>,
              value: r.count,
              color: r.score >= 4 ? C.accent : r.score === 3 ? C.amber : C.red,
            }))} />
          </GlassCard>
          <GlassCard index={3} className="span-4">
            <CardHeader title="Who is rating" caption="Ratings by author role" />
            <Donut unit="ratings" items={d.roles.map((r) => ({ key: r.role, label: `${ROLE[r.role].label}${r.avg !== null ? ` · ${r.avg.toFixed(1)}★` : ''}`, color: ROLE[r.role].color, count: r.count }))} />
          </GlassCard>
          <GlassCard index={4} className="span-4">
            <CardHeader title="Busiest days" caption="Ratings by weekday of the session" />
            <div className="chart-box short">
              {ratingsCount ? <Columns data={d.weekdays} x="day" y="count" name="Ratings" color={C.sky} /> : <Empty title="No ratings yet" />}
            </div>
          </GlassCard>

          <GlassCard index={5} className="span-12">
            <CardHeader title="Rating by session type" caption="Average score for the most-rated session types" />
            <div className="chart-box" style={{ height: Math.max(180, d.sessionTypes.length * 40) }}>
              {d.sessionTypes.length ? (
                <RankBars data={d.sessionTypes.map((t) => ({ label: t.title, avg: t.avg, count: t.count }))} value="avg" name="Avg rating" domain={[0, 5]} color={scoreTone} format={(v) => v.toFixed(2)} />
              ) : <Empty title="No ratings yet" />}
            </div>
          </GlassCard>
        </div>
      </Step>

      {/* ── 04 Reports ──────────────────────────────────────────── */}
      <Step n={4}>
        <div className="grid">
          <GlassCard index={0} className="span-4 mid">
            <CardHeader title="Why sessions get reported" caption="Bubble size = number of reports" />
            <div className="bubble-box">
              {data.reports.length ? <ReasonBubbles data={d.reasons} /> : <Empty title="No reports" hint="Nothing was flagged in this period." icon={<Sparkles size={20} />} />}
            </div>
            {data.reports.length > 0 && (
              <div className="reason-legend">
                {d.reasons.filter((r) => r.count > 0).map((r) => (
                  <span key={r.reason}><Dot color={REASON[r.reason].color} size={7} /> {REASON[r.reason].label}</span>
                ))}
              </div>
            )}
          </GlassCard>
          <GlassCard index={1} className="span-4 mid">
            <CardHeader title="Triage status" caption="Where every report stands" />
            <Donut unit="reports" items={d.statuses.map((s) => ({ key: s.status, label: STATUS[s.status].label, color: STATUS[s.status].color, count: s.count }))} />
          </GlassCard>
          <GlassCard index={2} className="span-4 mid">
            <CardHeader title="Who reports what" caption="Reasons split by the reporter’s role" />
            <div className="chart-box">
              {data.reports.length ? <ReasonRoleBars data={d.reasonRoles} /> : <Empty title="No reports" />}
            </div>
          </GlassCard>
        </div>
      </Step>

      {/* ── 05 Coaches ──────────────────────────────────────────── */}
      <Step n={5}>
        <div className="grid">
          <GlassCard index={0} className="span-6">
            <CardHeader title="Average rating per coach" caption="Top 10 in this period" />
            <div className="chart-box" style={{ height: Math.max(200, byRating.length * 38) }}>
              {byRating.length ? <RankBars data={byRating} value="avg" name="Avg rating" domain={[0, 5]} color={scoreTone} format={(v) => v.toFixed(2)} /> : <Empty title="No ratings yet" />}
            </div>
          </GlassCard>
          <GlassCard index={1} className="span-6">
            <CardHeader title="Students per coach" caption="Distinct students with sessions in this period" />
            <div className="chart-box" style={{ height: Math.max(200, byStudents.length * 38) }}>
              {byStudents.length ? <RankBars data={byStudents} value="students" name="Students" color={() => C.indigo} /> : <Empty title="No students in this period" />}
            </div>
          </GlassCard>
          <GlassCard index={2} className="span-8 tall">
            <CardHeader title="Coach landscape" caption="Students vs. average rating · bubble size = number of ratings" />
            <div className="chart-box">{scatter.length ? <CoachScatter data={scatter} /> : <Empty title="No rated coaches yet" />}</div>
          </GlassCard>
          <GlassCard index={3} className="span-4 tall">
            <CardHeader title="Top coaches" caption="Tap a coach to focus the whole page" />
            {leaders.length ? (
              <ol className="leader">
                {leaders.map((c, i) => (
                  <motion.li key={c.id} onClick={() => onCoach(c.id)} whileHover={{ x: 3 }}
                    initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 260, damping: 24 }}>
                    <span className={`rank r${i + 1}`}>{i + 1}</span>
                    <Avatar name={c.name} seed={c.id} size={32} />
                    <div className="leader-name">
                      <strong>{c.name}</strong>
                      <span>{num(c.students)} students · {num(c.ratings)} ratings</span>
                    </div>
                    <b className="num leader-score" style={{ color: scoreTone(c.avg!) }}>{c.avg!.toFixed(2)}</b>
                  </motion.li>
                ))}
              </ol>
            ) : <Empty title="No ratings yet" />}
          </GlassCard>
        </div>
      </Step>

      {/* ── 06 Voices ───────────────────────────────────────────── */}
      <Step n={6}>
        <div className="grid">
          <GlassCard index={0} className="span-7">
            <CardHeader title="Latest comments" caption={`${num(d.comments.length)} written comments`} />
            {d.comments.length ? (
              <div className="comment-grid">
                {d.comments.slice(0, 6).map((c) => (
                  <article key={c.id} className="comment bubble-card">
                    <div className="comment-head">
                      <Avatar name={c.author.name} seed={c.author.id} size={30} />
                      <div>
                        <strong>{c.author.name}</strong>
                        <span>{ROLE[c.author_role as Role].one} · {ago(c.created_date)}</span>
                      </div>
                      <Stars value={c.score} size={12} />
                    </div>
                    <p>“{c.comment}”</p>
                    <footer>{c.event_title}{c.coach && <> · with {c.coach.name}</>}</footer>
                  </article>
                ))}
              </div>
            ) : <Empty title="No comments in this period" />}
          </GlassCard>
          <GlassCard index={1} className="span-5">
            <CardHeader title="Still open" caption={`${num(open.length)} reports need attention`} />
            {open.length ? (
              <ul className="report-list">
                {open.slice(0, 7).map((r) => (
                  <li key={r.id} className="report-row static">
                    <span className="report-reason" style={{ ['--c' as string]: REASON[r.reason].color }}><Flag size={16} /></span>
                    <span className="report-main">
                      <span className="report-title"><strong>{REASON[r.reason].label}</strong><span className="muted">· {r.event_title}</span></span>
                      <span className="report-desc">{r.description || 'No description'}</span>
                      <span className="report-meta">{r.reporter.name} · coach {r.coach?.name ?? '—'} · {dateTime(r.occurrence_start)}</span>
                    </span>
                    <Chip color={STATUS[r.status].color}>{STATUS[r.status].label}</Chip>
                  </li>
                ))}
              </ul>
            ) : <Empty title="All caught up" hint="Every report has been handled." icon={<ShieldCheck size={20} />} />}
          </GlassCard>
        </div>
      </Step>
    </>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  const s = SECTIONS[n - 1]
  return (
    <section id={s.id} className="step" data-step={n}>
      <motion.header
        className="step-head"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        <span className="step-num num">{String(n).padStart(2, '0')}</span>
        <div>
          <h2>{s.title}</h2>
          <p>{s.caption}</p>
        </div>
      </motion.header>
      {children}
    </section>
  )
}

function Legendary({ items }: { items: [string, string][] }) {
  return (
    <div className="chart-legend">
      {items.map(([l, c]) => (
        <span key={l}><i style={{ background: c }} /> {l}</span>
      ))}
    </div>
  )
}

function Kpi({ index, icon, color, label, value, foot, spark, bars }: {
  index: number; icon: ReactNode; color: string; label: string; value: ReactNode; foot: ReactNode; spark?: number[]; bars?: boolean
}) {
  return (
    <GlassCard index={index} className="span-2 kpi" whileHover={{ y: -4 }} style={{ ['--kpi' as string]: color }}>
      <div className="kpi-top">
        <span className="kpi-icon" style={{ color, background: `${color}1c`, boxShadow: `inset 0 0 0 1px ${color}33` }}>{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">{foot}</div>
      {spark && spark.length > 1 ? (
        <div className="kpi-spark-bottom"><Sparkline values={spark} color={color} bars={bars} /></div>
      ) : (
        <Wave color={color} />
      )}
    </GlassCard>
  )
}

function Wave({ color }: { color: string }) {
  return (
    <div className="kpi-wave" aria-hidden>
      <svg viewBox="0 0 240 40" preserveAspectRatio="none">
        <path className="w1" d="M0 22 Q30 10 60 22 T120 22 T180 22 T240 22 V40 H0Z" fill={color} opacity={0.14} />
        <path className="w2" d="M0 26 Q30 36 60 26 T120 26 T180 26 T240 26 V40 H0Z" fill={color} opacity={0.1} />
      </svg>
    </div>
  )
}
