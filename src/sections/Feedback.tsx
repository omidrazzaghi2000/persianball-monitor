import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquareQuote, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Role, Snapshot } from '../api/types'
import { LiquidOrb, MeterBars, StackBar } from '../components/charts'
import { AnimatedNumber, Avatar, CardHeader, Chip, Empty, GlassCard, Segmented, Stars } from '../components/ui'
import type { Derived } from '../lib/derive'
import { C, ROLE, dateTime, num } from '../lib/format'

const PAGE = 24

export default function Feedback({ data, d }: { data: Snapshot; d: Derived }) {
  const [role, setRole] = useState<Role | 'all'>('all')
  const [stars, setStars] = useState<number | null>(null)
  const [onlyComments, setOnlyComments] = useState(true)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return data.scores
      .filter((s) => (onlyComments ? s.comment.trim() : true))
      .filter((s) => role === 'all' || s.author_role === role)
      .filter((s) => stars === null || s.score === stars)
      .filter(
        (s) =>
          !term ||
          [s.comment, s.author.name, s.event_title, s.coach?.name, s.student?.name].some((x) => x?.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.created_date.localeCompare(a.created_date))
  }, [data.scores, role, stars, onlyComments, q])

  return (
    <div className="grid">
      <GlassCard index={0} className="span-4">
        <CardHeader title="Rating distribution" caption="Tap a row to filter the feed" />
        <div className="big-stat">
          <AnimatedNumber value={d.avgScore} decimals={2} className="big-number" />
          <div>
            <Stars value={Math.round(d.avgScore ?? 0)} size={16} />
            <span>{num(data.scores.length)} ratings</span>
          </div>
        </div>
        <div className="meter-click">
          <MeterBars
            rows={[...d.distribution].reverse().map((r) => ({
              key: String(r.score),
              label: (
                <button className={`star-btn ${stars === r.score ? 'on' : ''}`} onClick={() => setStars(stars === r.score ? null : r.score)}>
                  {r.score} <Star size={11} fill="currentColor" />
                </button>
              ),
              value: r.count,
              color: r.score >= 4 ? C.accent : r.score === 3 ? C.amber : C.red,
            }))}
          />
        </div>
      </GlassCard>

      <GlassCard index={1} className="span-4">
        <CardHeader title="Who is rating" caption="Volume and average by author" />
        <div className="roles">
          {d.roles.map((r, i) => (
            <motion.button
              key={r.role}
              className={`role-card ${role === r.role ? 'on' : ''}`}
              style={{ ['--c' as string]: ROLE[r.role].color }}
              onClick={() => setRole(role === r.role ? 'all' : r.role)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="role-name">{ROLE[r.role].label}</span>
              <AnimatedNumber value={r.count} className="role-count" />
              <span className="role-avg">
                <Star size={12} fill="currentColor" /> {r.avg === null ? '—' : r.avg.toFixed(2)}
              </span>
            </motion.button>
          ))}
        </div>
      </GlassCard>

      <GlassCard index={2} className="span-4">
        <CardHeader title="Sentiment" caption="4–5 positive · 3 neutral · 1–2 negative" />
        <div className="sentiment-hero">
          <LiquidOrb value={data.scores.length ? d.sentiment.positive / data.scores.length : 0}>
            <AnimatedNumber
              value={data.scores.length ? (d.sentiment.positive / data.scores.length) * 100 : null}
              decimals={0}
              suffix="%"
              className="orb-value"
            />
            <span>positive</span>
          </LiquidOrb>
        </div>
        <StackBar
          parts={[
            { key: 'p', value: d.sentiment.positive, color: C.accent, label: 'Positive' },
            { key: 'n', value: d.sentiment.neutral, color: C.amber, label: 'Neutral' },
            { key: 'x', value: d.sentiment.negative, color: C.red, label: 'Negative' },
          ]}
        />
      </GlassCard>

      <GlassCard index={3} className="span-12">
        <CardHeader
          title="Feedback feed"
          caption={
            <>
              {num(rows.length)} {onlyComments ? 'comments' : 'ratings'}
              {data.scoresTotal > data.scores.length && <> · latest {num(data.scores.length)} of {num(data.scoresTotal)}</>}
            </>
          }
          right={
            <div className="feed-tools">
              <label className="search">
                <Search size={15} />
                <input placeholder="Search comments, people, sessions" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <Segmented
                id="fb-kind"
                size="sm"
                value={onlyComments ? 'c' : 'a'}
                onChange={(v) => setOnlyComments(v === 'c')}
                options={[
                  { value: 'c', label: 'Comments' },
                  { value: 'a', label: 'All ratings' },
                ]}
              />
            </div>
          }
        />
        <AnimatePresence>
          {(role !== 'all' || stars !== null) && (
            <motion.div className="active-filters" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {role !== 'all' && (
                <button onClick={() => setRole('all')}>
                  <Chip color={ROLE[role].color}>{ROLE[role].label} ✕</Chip>
                </button>
              )}
              {stars !== null && (
                <button onClick={() => setStars(null)}>
                  <Chip color={C.amber}>{stars}★ ✕</Chip>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {rows.length ? (
          <motion.div className="feed" layout>
            <AnimatePresence mode="popLayout">
              {rows.slice(0, shown).map((s, i) => (
                <motion.article
                  key={s.id}
                  layout
                  className="feed-item bubble-card"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26, delay: Math.min(i, 12) * 0.025 }}
                >
                  <div className="comment-head">
                    <Avatar name={s.author.name} seed={s.author.id} size={34} />
                    <div>
                      <strong>{s.author.name}</strong>
                      <span>
                        <Chip color={ROLE[s.author_role].color}>{ROLE[s.author_role].one}</Chip>
                      </span>
                    </div>
                    <Stars value={s.score} />
                  </div>
                  {s.comment ? <p>“{s.comment}”</p> : <p className="muted">Rated without a comment</p>}
                  <footer>
                    <span>{s.event_title}</span>
                    <span>
                      {s.coach?.name ?? '—'} → {s.student?.name ?? '—'}
                    </span>
                    <span>{dateTime(s.occurrence_start)}</span>
                  </footer>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Empty title="Nothing matches" hint="Try another search or clear the filters." icon={<MessageSquareQuote size={20} />} />
        )}
        {rows.length > shown && (
          <div className="more">
            <button className="btn ghost" onClick={() => setShown((n) => n + PAGE)}>
              Show more
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
