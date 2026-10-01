import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Search, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CoachScore, Snapshot } from '../api/types'
import { Ring } from '../components/charts'
import { AnimatedNumber, Avatar, CardHeader, Empty, GlassCard, Segmented, Stars } from '../components/ui'
import { C, num } from '../lib/format'

type Sort = 'score' | 'count' | 'name'

const tone = (v: number | null) => (v === null ? C.sub : v >= 4.3 ? C.accent : v >= 3.5 ? C.amber : C.red)

export default function Coaches({ data, onCoach }: { data: Snapshot; onCoach: (id: number) => void }) {
  const [sort, setSort] = useState<Sort>('score')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = data.coaches.filter((c) => !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term))
    const by: Record<Sort, (a: CoachScore, b: CoachScore) => number> = {
      score: (a, b) => (b.average_score ?? -1) - (a.average_score ?? -1) || b.score_count - a.score_count,
      count: (a, b) => b.score_count - a.score_count,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...list].sort(by[sort])
  }, [data.coaches, sort, q])

  const rated = data.coaches.filter((c) => c.average_score !== null)
  const totalRatings = data.coaches.reduce((a, c) => a + c.score_count, 0)
  const weighted = totalRatings ? data.coaches.reduce((a, c) => a + (c.average_score ?? 0) * c.score_count, 0) / totalRatings : null
  const chart = [...rated].sort((a, b) => b.average_score! - a.average_score!).slice(0, 10)

  return (
    <div className="grid">
      <GlassCard index={0} className="span-4 center-card">
        <CardHeader title="Coaching team" caption="Active coaches in range" />
        <div className="ring-wrap">
          <Ring value={rated.length} total={data.coaches.length || 1} size={170} stroke={14} color={C.sky}>
            <AnimatedNumber value={data.coaches.length} className="ring-value" />
            <span>coaches</span>
          </Ring>
        </div>
        <div className="split-stats">
          <div>
            <span>Rated</span>
            <b className="num">{num(rated.length)}</b>
          </div>
          <div>
            <span>Ratings</span>
            <b className="num">{num(totalRatings)}</b>
          </div>
          <div>
            <span>Team avg</span>
            <b className="num" style={{ color: tone(weighted) }}>{weighted === null ? '—' : weighted.toFixed(2)}</b>
          </div>
        </div>
      </GlassCard>

      <GlassCard index={1} className="span-8">
        <CardHeader title="Average rating by coach" caption="Top 10 in the selected range" />
        <div className="chart-box coach-chart">
          {chart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }} barCategoryGap={6}>
                <defs>
                  {chart.map((c) => (
                    <linearGradient key={c.id} id={`cb${c.id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={tone(c.average_score)} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={tone(c.average_score)} stopOpacity={0.95} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis type="number" domain={[0, 5]} hide />
                <YAxis type="category" dataKey="name" width={124} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,.75)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,.04)' }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="tip glass rim">
                        <div className="tip-label">{(payload[0].payload as CoachScore).name}</div>
                        <div className="tip-row">
                          <span>Average</span>
                          <b className="num">{(payload[0].payload as CoachScore).average_score!.toFixed(2)}</b>
                        </div>
                        <div className="tip-row">
                          <span>Ratings</span>
                          <b className="num">{(payload[0].payload as CoachScore).score_count}</b>
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Bar
                  dataKey="average_score"
                  radius={[8, 8, 8, 8]}
                  background={{ fill: 'rgba(255,255,255,.04)', radius: 8 }}
                  animationDuration={1300}
                  label={{ position: 'right', fill: 'rgba(255,255,255,.85)', fontSize: 12, formatter: (v: unknown) => Number(v).toFixed(2) }}
                >
                  {chart.map((c) => (
                    <Cell key={c.id} fill={`url(#cb${c.id})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty title="No ratings in this range" />
          )}
        </div>
      </GlassCard>

      <GlassCard index={2} className="span-12">
        <CardHeader
          title="All coaches"
          caption={`${num(rows.length)} coaches · tap one to focus the dashboard`}
          right={
            <div className="feed-tools">
              <label className="search">
                <Search size={15} />
                <input placeholder="Search coaches" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <Segmented
                id="coach-sort"
                size="sm"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'score', label: 'Rating' },
                  { value: 'count', label: 'Volume' },
                  { value: 'name', label: 'Name' },
                ]}
              />
            </div>
          }
        />
        {rows.length ? (
          <motion.div className="coach-grid" layout>
            <AnimatePresence mode="popLayout">
              {rows.map((c, i) => (
                <motion.button
                  key={c.id}
                  layout
                  className="coach-card bubble-card"
                  onClick={() => onCoach(c.id)}
                  initial={{ opacity: 0, scale: 0.92, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26, delay: Math.min(i, 12) * 0.03 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ ['--c' as string]: tone(c.average_score) }}
                >
                  <div className="coach-top">
                    <Avatar name={c.name} seed={c.id} size={44} />
                    <div className="coach-id">
                      <strong>{c.name}</strong>
                      <span>{c.email}</span>
                    </div>
                  </div>
                  <div className="coach-score">
                    <b className="num">{c.average_score === null ? '—' : c.average_score.toFixed(2)}</b>
                    <div>
                      <Stars value={Math.round(c.average_score ?? 0)} size={12} />
                      <span>{num(c.score_count)} ratings</span>
                    </div>
                  </div>
                  <div className="coach-bar">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${((c.average_score ?? 0) / 5) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 70, damping: 16, delay: 0.2 + Math.min(i, 12) * 0.03 }}
                    />
                  </div>
                  <span className="coach-go">
                    Focus <ArrowRight size={13} />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Empty title="No coaches found" icon={<UsersRound size={20} />} />
        )}
      </GlassCard>
    </div>
  )
}
