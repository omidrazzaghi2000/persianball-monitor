import { motion } from 'framer-motion'
import {
  CalendarCheck2,
  Dumbbell,
  GraduationCap,
  MessagesSquare,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { DETAIL_MONTHS } from '../api/client'
import type { CoachDetail, Snapshot } from '../api/types'
import { Donut, RankBars, ReasonBubbles, ReasonRoleBars, Ring, SignupChart, StackColumns } from '../components/charts'
import { AnimatedNumber, Avatar, CardHeader, ComingSoon, Dot, Empty, GlassCard } from '../components/ui'
import type { Derived } from '../lib/derive'
import { C, REASON, STATUS, num } from '../lib/format'

export const SECTIONS = [
  { id: 'snapshot', title: 'Snapshot', caption: 'New users, buyers, platforms and activity at a glance.' },
  { id: 'sessions', title: 'Sessions', caption: 'Sessions for the selected coach, by month and by student.' },
  { id: 'coaches', title: 'Coaches', caption: 'The selected coach’s students, chats and workouts.' },
  { id: 'reports', title: 'Reports', caption: 'Issues raised after sessions, and where triage stands.' },
  { id: 'comments', title: 'Comments', caption: 'Comments across the app, and how many got an answer.' },
] as const

const PLATFORM: Record<string, { label: string; color: string }> = {
  android: { label: 'Android', color: C.accent },
  ios: { label: 'iOS', color: C.sky },
  web: { label: 'Web', color: C.indigo },
}
const platformMeta = (p: string) => PLATFORM[p.toLowerCase()] ?? { label: p, color: C.amber }

interface CoachProps {
  coach: { id: number; name: string; email: string; students: number } | null
  detail: CoachDetail | null
  detailLoading: boolean
  detailError: string | null
  onPick: (id: number) => void
}

export default function Monitor({ data, d, coach, detail, detailLoading, detailError, onPick }: { data: Snapshot; d: Derived } & CoachProps) {
  const users = data.users
  const coachName = coach?.name ?? 'this coach'

  // Coach drill-down figures
  const months = detail?.monthly ?? []
  const thisMonth = months.at(-1)?.sessions ?? 0
  const lastMonth = months.at(-2)?.sessions ?? 0
  const sixMonths = months.reduce((a, m) => a + m.sessions, 0)
  const sixCancelled = months.reduce((a, m) => a + m.cancelled, 0)
  const perStudent = detail?.perStudent ?? []
  const sessionsByStudent = [...perStudent].sort((a, b) => b.sessions - a.sessions).map((s) => ({ label: s.student.name, sessions: s.sessions }))
  const chatsByStudent = [...perStudent]
    .filter((s) => s.chats !== null)
    .sort((a, b) => (b.chats ?? 0) - (a.chats ?? 0))
    .map((s) => ({ label: s.student.name, chats: s.chats ?? 0 }))
  const workoutsByStudent = [...perStudent]
    .filter((s) => s.workouts !== null)
    .sort((a, b) => (b.workouts ?? 0) - (a.workouts ?? 0))
    .map((s) => ({ label: s.student.name, workouts: s.workouts ?? 0 }))
  const totalChats = perStudent.reduce((a, s) => a + (s.chats ?? 0), 0)
  const totalWorkouts = perStudent.reduce((a, s) => a + (s.workouts ?? 0), 0)
  const studentsChatting = perStudent.filter((s) => (s.chats ?? 0) > 0).length
  const pending = detailLoading && !detail
  const barsHeight = (n: number) => Math.max(200, n * 36)

  return (
    <>
      {/* ── 01 Snapshot ─────────────────────────────────────────── */}
      <Step n={1}>
        <div className="grid">
          <Kpi index={0} icon={<UserPlus size={18} />} color={C.sky} label="New users · 30 days"
            value={users ? <AnimatedNumber value={users.totals.registered} /> : null} foot={users ? <span>registered in the last month</span> : null} />
          <Kpi index={1} icon={<ShoppingBag size={18} />} color={C.accent} label="Buyers · 30 days"
            value={users ? <AnimatedNumber value={users.totals.buyers} /> : null}
            foot={users ? <span><b className="num">{d.conversion === null ? '—' : `${(d.conversion * 100).toFixed(1)}%`}</b> of new users</span> : null} />
          <Kpi index={2} icon={<CalendarCheck2 size={18} />} color={C.amber} label="Sessions held" value={<AnimatedNumber value={data.sessions.count} />}
            foot={<span><b className="num">{d.cancelRate === null ? '—' : `${(d.cancelRate * 100).toFixed(1)}%`}</b> cancelled</span>} />
          <Kpi index={3} icon={<MessagesSquare size={18} />} color={C.indigo} label="Chat messages" value={<AnimatedNumber value={data.chat.count} />}
            foot={<span><b className="num">{d.messagesPerSession === null ? '—' : d.messagesPerSession.toFixed(1)}</b> per session</span>} />
          <Kpi index={4} icon={<Users size={18} />} color={C.pink} label="Students in chat"
            value={data.chatStudents ? <AnimatedNumber value={data.chatStudents.count} /> : null}
            foot={data.chatStudents ? <span>chatted with a coach</span> : null} />
          <Kpi index={5} icon={<GraduationCap size={18} />} color="#34D3C5" label="Students coached" value={<AnimatedNumber value={d.studentsCovered} />}
            foot={<span>by {num(d.coachRoster.length)} coaches</span>} />
        </div>

        <div className="grid row-gap">
          <GlassCard index={0} className="span-8 tall">
            <CardHeader title="New users and buyers" caption="Every day for the last 30 days · buyers = users on a paid scope" />
            {d.signups ? (
              <>
                <div className="chart-box"><SignupChart data={d.signups} /></div>
                <Legendary items={[['New users', C.sky], ['Buyers', C.accent]]} />
              </>
            ) : <ComingSoon what="Daily sign-ups and buyers" />}
          </GlassCard>
          <GlassCard index={1} className="span-4 tall">
            <CardHeader title="Users by platform" caption="All time, and new users in the last 30 days" />
            {users ? (
              <>
                <div className="platform-totals">
                  {users.platforms_total.map((p, i) => {
                    const m = platformMeta(p.platform)
                    return (
                      <motion.div key={p.platform} className="platform-tile" style={{ ['--c' as string]: m.color }}
                        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }}>
                        <Smartphone size={15} />
                        <AnimatedNumber value={p.count} className="platform-num" />
                        <span>{m.label}</span>
                      </motion.div>
                    )
                  })}
                </div>
                <Donut unit="new · 30d" items={users.platforms_period.map((p) => ({ key: p.platform, label: platformMeta(p.platform).label, color: platformMeta(p.platform).color, count: p.count }))} />
              </>
            ) : <ComingSoon what="Users per platform" />}
          </GlassCard>
        </div>
      </Step>

      {/* ── 02 Sessions ─────────────────────────────────────────── */}
      <Step n={2} coach={coach}>
        <div className="grid">
          <GlassCard index={0} className="span-6 tall">
            <CardHeader title="Sessions per month" caption={`${coachName} · last ${DETAIL_MONTHS} months, all students`} />
            <div className="chart-box">
              {pending ? <Loading /> : detailError ? <Empty title="Couldn't load this coach" hint={detailError} /> : sixMonths + sixCancelled ? (
                <StackColumns data={months} x="label" series={[{ key: 'sessions', name: 'Held', color: C.accent }, { key: 'cancelled', name: 'Cancelled', color: C.red }]} />
              ) : <Empty title={`No sessions for ${coachName} in the last ${DETAIL_MONTHS} months`} />}
            </div>
            <Legendary items={[['Held', C.accent], ['Cancelled', C.red]]} />
          </GlassCard>
          <GlassCard index={1} className="span-6 tall">
            <CardHeader title="Sessions per student" caption={`${coachName} · selected period`} />
            <div className="chart-box scroll-y" style={{ maxHeight: 380 }}>
              <div style={{ height: barsHeight(sessionsByStudent.length) }}>
                {pending ? <Loading /> : sessionsByStudent.length ? (
                  <RankBars data={sessionsByStudent} value="sessions" name="Sessions" color={() => C.accent} />
                ) : <Empty title="No students in this period" />}
              </div>
            </div>
          </GlassCard>

          <GlassCard index={2} className="span-4 tall">
            <CardHeader title="Session health" caption="All coaches · held vs. scheduled" />
            <div className="ring-wrap">
              <Ring value={data.sessions.count} total={data.sessions.total_count} size={180} stroke={15}>
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
          <GlassCard index={3} className="span-8 tall">
            <CardHeader title={`${coachName} at a glance`} caption="Session workload for the selected coach" />
            <div className="tiles">
              <Tile label="This month" value={pending ? null : thisMonth} delta={pending ? null : thisMonth - lastMonth} hint="vs. last month" />
              <Tile label={`Last ${DETAIL_MONTHS} months`} value={pending ? null : sixMonths} hint={`${num(sixCancelled)} cancelled`} />
              <Tile label="Per student" value={pending || !perStudent.length ? null : sessionsByStudent.reduce((a, s) => a + s.sessions, 0) / perStudent.length} decimals={1} hint="sessions in period" />
              <Tile label="Students" value={coach?.students ?? null} hint="with sessions in period" />
            </div>
          </GlassCard>
        </div>
      </Step>

      {/* ── 03 Coaches ──────────────────────────────────────────── */}
      <Step n={3} coach={coach}>
        <div className="grid">
          {coach && (
            <GlassCard index={0} className="span-12 coach-hero">
              <Avatar name={coach.name} seed={coach.id} size={64} />
              <div className="coach-hero-id">
                <h3>{coach.name}</h3>
                <span>{coach.email}</span>
              </div>
              <div className="coach-hero-stats">
                <HeroStat icon={<GraduationCap size={16} />} label="Students" value={coach.students} />
                <HeroStat icon={<CalendarCheck2 size={16} />} label={`Sessions · ${DETAIL_MONTHS} mo`} value={pending ? null : sixMonths} />
                <HeroStat icon={<MessagesSquare size={16} />} label="Chat messages" value={pending ? null : totalChats} />
                <HeroStat icon={<Users size={16} />} label="Students chatting" value={pending ? null : studentsChatting} />
                <HeroStat icon={<Dumbbell size={16} />} label="Workouts sent" value={pending || !detail?.workoutsAvailable ? null : totalWorkouts} soon={!!detail && !detail.workoutsAvailable} />
              </div>
            </GlassCard>
          )}

          <GlassCard index={1} className="span-6 tall">
            <CardHeader title="Chats per student" caption={`Messages between ${coachName} and each student`} />
            <div className="chart-box scroll-y" style={{ maxHeight: 380 }}>
              <div style={{ height: barsHeight(chatsByStudent.length) }}>
                {pending ? <Loading /> : chatsByStudent.length ? (
                  <RankBars data={chatsByStudent} value="chats" name="Messages" color={() => C.indigo} />
                ) : <Empty title="No students in this period" />}
              </div>
            </div>
          </GlassCard>
          <GlassCard index={2} className="span-6 tall">
            <CardHeader title="Workouts per student" caption={`Workouts ${coachName} assigned to each student`} />
            {pending ? <Loading /> : detail && !detail.workoutsAvailable ? <ComingSoon what="Workouts sent per student" /> : (
              <div className="chart-box scroll-y" style={{ maxHeight: 380 }}>
                <div style={{ height: barsHeight(workoutsByStudent.length) }}>
                  {workoutsByStudent.length ? <RankBars data={workoutsByStudent} value="workouts" name="Workouts" color={() => C.amber} /> : <Empty title="No workouts in this period" />}
                </div>
              </div>
            )}
          </GlassCard>
          <GlassCard index={3} className="span-6 tall">
            <CardHeader title="Students per coach" caption="All coaches · tap a bar’s coach below to switch" />
            <div className="chart-box scroll-y" style={{ maxHeight: 380 }}>
              <div style={{ height: barsHeight(d.coachRoster.length) }}>
                {d.coachRoster.length ? (
                  <RankBars data={d.coachRoster.map((c) => ({ label: c.name, students: c.students }))} value="students" name="Students" color={(v) => (v ? C.sky : C.sub)} />
                ) : <Empty title="No coaches yet" />}
              </div>
            </div>
          </GlassCard>

          <GlassCard index={4} className="span-12">
            <CardHeader title="All coaches" caption="Pick a coach to update every coach chart on this page" />
            <div className="roster">
              {d.coachRoster.map((c, i) => (
                <motion.button key={c.id} className={`roster-card bubble-card ${coach?.id === c.id ? 'on' : ''}`} onClick={() => onPick(c.id)}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 10) * 0.04, type: 'spring', stiffness: 260, damping: 24 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Avatar name={c.name} seed={c.id} size={40} />
                  <span className="roster-id"><strong>{c.name}</strong><span>{num(c.students)} {c.students === 1 ? 'student' : 'students'}</span></span>
                  {coach?.id === c.id && <span className="roster-on">Selected</span>}
                </motion.button>
              ))}
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
              {data.reports.length ? <ReasonBubbles data={d.reasons} /> : <Empty title="No reports yet" hint="Nothing has been flagged in this period." icon={<Sparkles size={20} />} />}
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
            <CardHeader title="Triage status" caption={`${num(d.openReports)} open · ${d.resolutionRate === null ? '—' : `${Math.round(d.resolutionRate * 100)}%`} closed`} />
            <Donut unit="reports" items={d.statuses.map((s) => ({ key: s.status, label: STATUS[s.status].label, color: STATUS[s.status].color, count: s.count }))} />
          </GlassCard>
          <GlassCard index={2} className="span-4 mid">
            <CardHeader title="Who reports what" caption="Reasons split by the reporter’s role" />
            <div className="chart-box">{data.reports.length ? <ReasonRoleBars data={d.reasonRoles} /> : <Empty title="No reports yet" />}</div>
          </GlassCard>
        </div>
      </Step>

      {/* ── 05 Comments ─────────────────────────────────────────── */}
      <Step n={5}>
        <div className="grid">
          <GlassCard index={0} className="span-8 tall">
            <CardHeader title="Comments per month" caption="Course comments across the app · answered vs. waiting for a reply" />
            {data.comments ? (
              <>
                <div className="chart-box">
                  <StackColumns data={data.comments.monthly.map((m) => ({ ...m, label: new Date(`${m.month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }) }))} x="label"
                    series={[{ key: 'answered', name: 'Answered', color: C.accent }, { key: 'unanswered', name: 'Unanswered', color: C.amber }]} />
                </div>
                <Legendary items={[['Answered', C.accent], ['Unanswered', C.amber]]} />
              </>
            ) : <ComingSoon what="Monthly comments" />}
          </GlassCard>
          <GlassCard index={1} className="span-4 tall">
            <CardHeader title="Answered vs. unanswered" caption="All comments in the last 6 months" />
            {data.comments ? (
              <Donut unit="comments" items={[
                { key: 'a', label: 'Answered', color: C.accent, count: data.comments.totals.answered },
                { key: 'u', label: 'Unanswered', color: C.amber, count: data.comments.totals.unanswered },
              ]} />
            ) : <ComingSoon what="Answer rate" />}
          </GlassCard>
        </div>
      </Step>
    </>
  )
}

function Step({ n, children, coach }: { n: number; children: ReactNode; coach?: { name: string } | null }) {
  const s = SECTIONS[n - 1]
  return (
    <section id={s.id} className="step" data-step={n}>
      <motion.header className="step-head" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <span className="step-num num">{String(n).padStart(2, '0')}</span>
        <div>
          <h2>{s.title}{coach && <span className="step-coach"> · {coach.name}</span>}</h2>
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
      {items.map(([l, c]) => <span key={l}><i style={{ background: c }} /> {l}</span>)}
    </div>
  )
}

function Loading() {
  return (
    <div className="card-loading">
      <span className="mini-spin" /> Loading this coach…
    </div>
  )
}

function Kpi({ index, icon, color, label, value, foot }: { index: number; icon: ReactNode; color: string; label: string; value: ReactNode | null; foot: ReactNode | null }) {
  return (
    <GlassCard index={index} className="span-2 kpi" whileHover={{ y: -4 }} style={{ ['--kpi' as string]: color }}>
      <div className="kpi-top">
        <span className="kpi-icon" style={{ color, background: `${color}1c`, boxShadow: `inset 0 0 0 1px ${color}33` }}>{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value ?? <span className="kpi-dash">—</span>}</div>
      <div className="kpi-foot">{foot ?? <span className="soon-badge sm">Coming soon</span>}</div>
      <div className="kpi-wave" aria-hidden>
        <svg viewBox="0 0 240 40" preserveAspectRatio="none">
          <path className="w1" d="M0 22 Q30 10 60 22 T120 22 T180 22 T240 22 V40 H0Z" fill={color} opacity={0.14} />
          <path className="w2" d="M0 26 Q30 36 60 26 T120 26 T180 26 T240 26 V40 H0Z" fill={color} opacity={0.1} />
        </svg>
      </div>
    </GlassCard>
  )
}

function Tile({ label, value, delta, hint, decimals = 0 }: { label: string; value: number | null; delta?: number | null; hint: string; decimals?: number }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <AnimatedNumber value={value} decimals={decimals} className="tile-value" />
      <span className="tile-hint">
        {delta !== undefined && delta !== null && (
          <b className={delta >= 0 ? 'up' : 'down'}>
            {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {delta >= 0 ? '+' : ''}{delta}
          </b>
        )}{' '}
        {hint}
      </span>
    </div>
  )
}

function HeroStat({ icon, label, value, text, soon }: { icon: ReactNode; label: string; value?: number | null; text?: string; soon?: boolean }) {
  return (
    <div className="hero-stat">
      <span className="hero-label">{icon} {label}</span>
      {text !== undefined ? <b className="hero-value">{text}</b> : soon ? <b className="hero-value muted">Soon</b> : <AnimatedNumber value={value ?? null} className="hero-value" />}
    </div>
  )
}
