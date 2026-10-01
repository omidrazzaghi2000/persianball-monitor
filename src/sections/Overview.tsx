import { motion } from 'framer-motion'
import { ArrowUpRight, CalendarCheck2, Flag, MessagesSquare, Sparkles, Star } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Snapshot } from '../api/types'
import { MeterBars, ReasonBubbles, Ring, Sparkline, StackBar, StatusDonut, TrendChart } from '../components/charts'
import { AnimatedNumber, Avatar, CardHeader, Chip, Dot, Empty, GlassCard, Segmented, Stars } from '../components/ui'
import type { Derived } from '../lib/derive'
import { C, REASON, ROLE, ago, num } from '../lib/format'
import type { Tab } from '../pages/Dashboard'

export default function Overview({
  data,
  d,
  onTab,
  onCoach,
}: {
  data: Snapshot
  d: Derived
  onTab: (t: Tab) => void
  onCoach: (id: number) => void
}) {
  const [mode, setMode] = useState<'volume' | 'quality'>('volume')
  const reportSeries = d.trend.map((p) => p.reports)
  const avgSeries = d.trend.filter((p) => p.avg !== null).map((p) => p.avg!)

  const top = [...data.coaches]
    .filter((c) => c.average_score !== null)
    .sort((a, b) => b.average_score! - a.average_score! || b.score_count - a.score_count)
    .slice(0, 5)

  return (
    <div className="grid">
      <Kpi
        index={0}
        icon={<CalendarCheck2 size={18} />}
        color={C.accent}
        label="Sessions"
        value={<AnimatedNumber value={data.sessions.count} />}
        foot={
          <>
            <Chip color={C.red}>{num(data.sessions.cancelled_count)} cancelled</Chip>
            <span>{num(data.sessions.total_count)} scheduled</span>
          </>
        }
      />
      <Kpi
        index={1}
        icon={<MessagesSquare size={18} />}
        color={C.sky}
        label="Chat messages"
        value={<AnimatedNumber value={data.chat.count} />}
        foot={
          <span>
            <b className="num">{d.messagesPerSession === null ? '—' : d.messagesPerSession.toFixed(1)}</b> per session
          </span>
        }
      />
      <Kpi
        index={2}
        icon={<Star size={18} />}
        color={C.amber}
        label="Average rating"
        value={
          <>
            <AnimatedNumber value={d.avgScore} decimals={2} />
            <small>/5</small>
          </>
        }
        foot={
          <>
            <Stars value={Math.round(d.avgScore ?? 0)} />
            <span>{num(data.scores.length)} ratings</span>
          </>
        }
        spark={avgSeries}
      />
      <Kpi
        index={3}
        icon={<Flag size={18} />}
        color={C.red}
        label="Open reports"
        value={<AnimatedNumber value={d.openReports} />}
        foot={
          <span>
            <b className="num">{d.resolutionRate === null ? '—' : `${Math.round(d.resolutionRate * 100)}%`}</b> closed
          </span>
        }
        spark={reportSeries}
        bars
        onClick={() => onTab('reports')}
      />

      <GlassCard index={4} className="span-8 tall">
        <CardHeader
          title="Activity"
          caption={mode === 'volume' ? 'Feedback and reports by session date' : 'Average session rating over time'}
          right={
            <Segmented
              id="trend"
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'volume', label: 'Volume' },
                { value: 'quality', label: 'Rating' },
              ]}
            />
          }
        />
        <div className="chart-box">
          {d.trend.length ? <TrendChart data={d.trend} mode={mode} /> : <Empty title="No activity in this range" />}
        </div>
        <div className="chart-legend">
          {mode === 'volume' ? (
            <>
              <span><i style={{ background: C.accent }} /> Feedback</span>
              <span><i style={{ background: C.red }} /> Reports</span>
            </>
          ) : (
            <span><i style={{ background: C.amber }} /> Average score (1–5)</span>
          )}
        </div>
      </GlassCard>

      <GlassCard index={5} className="span-4 tall center-card">
        <CardHeader title="Session health" caption="Held vs. scheduled" />
        <div className="ring-wrap">
          <Ring value={data.sessions.count} total={data.sessions.total_count} size={190} stroke={16}>
            <AnimatedNumber
              value={data.sessions.total_count ? (data.sessions.count / data.sessions.total_count) * 100 : null}
              decimals={1}
              suffix="%"
              className="ring-value"
            />
            <span>held</span>
          </Ring>
        </div>
        <div className="split-stats">
          <div>
            <span>Held</span>
            <b className="num" style={{ color: C.accent }}>{num(data.sessions.count)}</b>
          </div>
          <div>
            <span>Cancelled</span>
            <b className="num" style={{ color: C.red }}>{num(data.sessions.cancelled_count)}</b>
          </div>
          <div>
            <span>Cancel rate</span>
            <b className="num">{d.cancelRate === null ? '—' : `${(d.cancelRate * 100).toFixed(1)}%`}</b>
          </div>
        </div>
      </GlassCard>

      <GlassCard index={6} className="span-4 mid">
        <CardHeader title="Why sessions get reported" caption="Bubble size = number of reports" />
        <div className="bubble-box">
          {data.reports.length ? (
            <ReasonBubbles data={d.reasons} onPick={() => onTab('reports')} />
          ) : (
            <Empty title="No reports" hint="Nothing has been flagged in this range." icon={<Sparkles size={20} />} />
          )}
        </div>
        {data.reports.length > 0 && (
          <div className="reason-legend">
            {d.reasons
              .filter((r) => r.count > 0)
              .map((r) => (
                <span key={r.reason}>
                  <Dot color={REASON[r.reason].color} size={7} /> {REASON[r.reason].label}
                </span>
              ))}
          </div>
        )}
      </GlassCard>

      <GlassCard index={7} className="span-4 mid">
        <CardHeader title="Report status" caption="Where triage stands" />
        <StatusDonut data={d.statuses} />
      </GlassCard>

      <GlassCard index={8} className="span-4 mid">
        <CardHeader
          title="Top coaches"
          caption="By average rating"
          right={
            <button className="link-btn small" onClick={() => onTab('coaches')}>
              See all <ArrowUpRight size={14} />
            </button>
          }
        />
        {top.length ? (
          <ol className="leader">
            {top.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}
                onClick={() => onCoach(c.id)}
                whileHover={{ x: 3 }}
              >
                <span className={`rank r${i + 1}`}>{i + 1}</span>
                <Avatar name={c.name} seed={c.id} size={32} />
                <div className="leader-name">
                  <strong>{c.name}</strong>
                  <span>{num(c.score_count)} ratings</span>
                </div>
                <b className="num leader-score">{c.average_score!.toFixed(2)}</b>
              </motion.li>
            ))}
          </ol>
        ) : (
          <Empty title="No ratings yet" />
        )}
      </GlassCard>

      <GlassCard index={9} className="span-8">
        <CardHeader
          title="Latest comments"
          caption={`${num(d.comments.length)} written comments`}
          right={
            <button className="link-btn small" onClick={() => onTab('feedback')}>
              All feedback <ArrowUpRight size={14} />
            </button>
          }
        />
        {d.comments.length ? (
          <div className="comment-grid">
            {d.comments.slice(0, 4).map((c, i) => (
              <motion.article
                key={c.id}
                className="comment bubble-card"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 240, damping: 22 }}
              >
                <div className="comment-head">
                  <Avatar name={c.author.name} seed={c.author.id} size={30} />
                  <div>
                    <strong>{c.author.name}</strong>
                    <span>{ROLE[c.author_role].one} · {ago(c.created_date)}</span>
                  </div>
                  <Stars value={c.score} size={12} />
                </div>
                <p>“{c.comment}”</p>
                <footer>
                  {c.event_title}
                  {c.coach && <> · with {c.coach.name}</>}
                </footer>
              </motion.article>
            ))}
          </div>
        ) : (
          <Empty title="No comments in this range" />
        )}
      </GlassCard>

      <GlassCard index={10} className="span-4">
        <CardHeader title="Rating breakdown" caption="How sessions were scored" />
        <MeterBars
          rows={[...d.distribution].reverse().map((r) => ({
            key: String(r.score),
            label: (
              <>
                {r.score} <Star size={11} fill="currentColor" />
              </>
            ),
            value: r.count,
            color: r.score >= 4 ? C.accent : r.score === 3 ? C.amber : C.red,
          }))}
        />
        <div className="breakdown-foot">
          <span className="eyebrow">Sentiment</span>
          <StackBar
            parts={[
              { key: 'p', value: d.sentiment.positive, color: C.accent, label: 'Positive' },
              { key: 'n', value: d.sentiment.neutral, color: C.amber, label: 'Neutral' },
              { key: 'x', value: d.sentiment.negative, color: C.red, label: 'Negative' },
            ]}
          />
        </div>
      </GlassCard>
    </div>
  )
}

function Kpi({
  index,
  icon,
  color,
  label,
  value,
  foot,
  spark,
  bars,
  onClick,
}: {
  index: number
  icon: ReactNode
  color: string
  label: string
  value: ReactNode
  foot: ReactNode
  spark?: number[]
  bars?: boolean
  onClick?: () => void
}) {
  return (
    <GlassCard
      index={index}
      className={`span-3 kpi ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      style={{ ['--kpi' as string]: color }}
    >
      <div className="kpi-top">
        <span className="kpi-icon" style={{ color, background: `${color}1c`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
          {icon}
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">{foot}</div>
      {spark ? (
        <div className="kpi-spark">
          <Sparkline values={spark} color={color} bars={bars} />
        </div>
      ) : (
        <Wave color={color} />
      )}
    </GlassCard>
  )
}

/** Decorative liquid surface along the bottom of a card. */
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
