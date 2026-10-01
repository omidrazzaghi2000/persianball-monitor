import { hierarchy, pack } from 'd3-hierarchy'
import { motion, useReducedMotion } from 'framer-motion'
import { useId, useMemo, useState } from 'react'
import {
  Area,
  Bar,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { ReportReason, ReportStatus } from '../api/types'
import type { TrendPoint } from '../lib/derive'
import { C, REASON, STATUS, num } from '../lib/format'
import { AnimatedNumber, Dot } from './ui'

// ── Tooltip ─────────────────────────────────────────────────────────────────

interface TipEntry {
  name?: string | number
  value?: number | string | null
  color?: string
  dataKey?: string | number
}

function GlassTip({ active, payload, label }: { active?: boolean; payload?: TipEntry[]; label?: string | number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip glass rim">
      {label !== undefined && <div className="tip-label">{label}</div>}
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <div key={String(p.dataKey ?? p.name)} className="tip-row">
            <Dot color={p.color ?? C.accent} size={7} />
            <span>{p.name}</span>
            <b className="num">{typeof p.value === 'number' && !Number.isInteger(p.value) ? p.value.toFixed(2) : p.value}</b>
          </div>
        ))}
    </div>
  )
}

// ── Activity trend ──────────────────────────────────────────────────────────

export function TrendChart({ data, mode }: { data: TrendPoint[]; mode: 'volume' | 'quality' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gFeedback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gAvg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.amber} />
            <stop offset="100%" stopColor="#FF9F6B" />
          </linearGradient>
          <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.red} stopOpacity={0.95} />
            <stop offset="100%" stopColor={C.red} stopOpacity={0.35} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: C.sub, fontSize: 11 }} minTickGap={24} dy={6} />
        <YAxis
          yAxisId="l"
          tickLine={false}
          axisLine={false}
          tick={{ fill: C.sub, fontSize: 11 }}
          allowDecimals={false}
          width={44}
          domain={mode === 'quality' ? [1, 5] : [0, 'auto']}
          ticks={mode === 'quality' ? [1, 2, 3, 4, 5] : undefined}
        />
        <Tooltip content={<GlassTip />} cursor={{ stroke: 'rgba(255,255,255,.14)', strokeWidth: 1 }} />
        {mode === 'volume' ? (
          <>
            <Area
              yAxisId="l"
              type="monotone"
              dataKey="feedback"
              name="Feedback"
              stroke={C.accent}
              strokeWidth={2.5}
              fill="url(#gFeedback)"
              filter="url(#glow)"
              animationDuration={1400}
              animationEasing="ease-out"
              activeDot={{ r: 5, fill: C.accent, stroke: '#08080F', strokeWidth: 2 }}
            />
            <Bar yAxisId="l" dataKey="reports" name="Reports" fill="url(#gReports)" radius={[6, 6, 2, 2]} maxBarSize={10} animationDuration={1200} />
          </>
        ) : (
          <>
            <Line
              yAxisId="l"
              type="monotone"
              dataKey="avg"
              name="Avg score"
              stroke="url(#gAvg)"
              strokeWidth={3}
              dot={false}
              connectNulls
              filter="url(#glow)"
              animationDuration={1400}
              activeDot={{ r: 5, fill: C.amber, stroke: '#08080F', strokeWidth: 2 }}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Sparkline ───────────────────────────────────────────────────────────────

export function Sparkline({ values, color, bars = false }: { values: number[]; color: string; bars?: boolean }) {
  const reduce = useReducedMotion()
  const w = 120
  const h = 36
  if (values.length < 2) return <svg width={w} height={h} />
  const max = Math.max(...values, 1)
  if (bars) {
    // Discrete daily counts read better as bars than as a smoothed line.
    const slot = w / values.length
    const bw = Math.max(1.5, Math.min(6, slot * 0.6))
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden>
        {values.map((v, i) => {
          const bh = v ? Math.max(3, (v / max) * (h - 4)) : 2
          return (
            <motion.rect
              key={i}
              x={i * slot + (slot - bw) / 2}
              width={bw}
              rx={bw / 2}
              fill={color}
              opacity={v ? 0.9 : 0.18}
              initial={reduce ? false : { height: 0, y: h }}
              animate={{ height: bh, y: h - bh }}
              transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.25 + i * 0.012 }}
            />
          )
        })}
      </svg>
    )
  }
  const step = w / (values.length - 1)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)] as const)
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`
  }, '')
  const id = `sp${color.replace('#', '')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={`${d} L${w},${h} L0,${h} Z`}
        fill={`url(#${id})`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
    </svg>
  )
}

// ── Ring gauge ──────────────────────────────────────────────────────────────

export function Ring({
  value,
  total,
  size = 168,
  stroke = 14,
  color = C.accent,
  track = 'rgba(255,255,255,.07)',
  children,
}: {
  value: number
  total: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const frac = total > 0 ? Math.min(1, value / total) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={C.sky} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - frac) }}
          transition={{ type: 'spring', stiffness: 40, damping: 14, delay: 0.3 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

// ── Reason bubbles: a packed cluster of liquid spheres ──────────────────────

export function ReasonBubbles({
  data,
  active,
  onPick,
}: {
  data: { reason: ReportReason; count: number }[]
  active?: ReportReason | null
  onPick?: (r: ReportReason) => void
}) {
  const reduce = useReducedMotion()
  const [hover, setHover] = useState<ReportReason | null>(null)
  const W = 340
  const H = 260
  const nodes = useMemo(() => {
    const items = data.filter((d) => d.count > 0)
    if (!items.length) return []
    const root = hierarchy<{ children?: typeof items; reason?: ReportReason; count?: number }>({ children: items })
      .sum((d) => d.count ?? 0)
    return pack<typeof root.data>().size([W, H]).padding(8)(root).leaves()
  }, [data])

  if (!nodes.length) return null
  return (
    <div className="bubbles">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          {nodes.map((n) => {
            const c = REASON[n.data.reason!].color
            return (
              <radialGradient key={n.data.reason} id={`bub-${n.data.reason}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
                <stop offset="18%" stopColor={c} stopOpacity={0.55} />
                <stop offset="70%" stopColor={c} stopOpacity={0.18} />
                <stop offset="100%" stopColor={c} stopOpacity={0.4} />
              </radialGradient>
            )
          })}
        </defs>
        {nodes.map((n, i) => {
          const reason = n.data.reason!
          const meta = REASON[reason]
          const dim = (active && active !== reason) || (hover && hover !== reason)
          return (
            <motion.g
              key={reason}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: dim ? 0.35 : 1, x: n.x, y: n.y }}
              transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.15 + i * 0.08 }}
              style={{ cursor: onPick ? 'pointer' : 'default' }}
              onHoverStart={() => setHover(reason)}
              onHoverEnd={() => setHover(null)}
              onTap={() => onPick?.(reason)}
            >
              <motion.g
                animate={reduce ? undefined : { y: [0, -4 - (i % 3), 0], scale: [1, 1.025, 1] }}
                transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.08 }}
              >
                <circle r={n.r} fill={`url(#bub-${reason})`} stroke={meta.color} strokeOpacity={0.55} strokeWidth={1.2} />
                <ellipse cx={-n.r * 0.32} cy={-n.r * 0.42} rx={n.r * 0.32} ry={n.r * 0.16} fill="#fff" opacity={0.22} transform={`rotate(-28 ${-n.r * 0.32} ${-n.r * 0.42})`} />
                <text textAnchor="middle" dy={n.r > 40 ? -2 : 4} fill="#fff" fontWeight={700} fontSize={Math.max(12, n.r * 0.42)} className="num">
                  {n.data.count}
                </text>
                {n.r > 40 && (
                  <text textAnchor="middle" dy={n.r * 0.32 + 6} fill="rgba(255,255,255,.75)" fontSize={11}>
                    {meta.label}
                  </text>
                )}
              </motion.g>
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Status donut ────────────────────────────────────────────────────────────

export function StatusDonut({ data }: { data: { status: ReportStatus; count: number }[] }) {
  const total = data.reduce((a, d) => a + d.count, 0)
  const rows = data.filter((d) => d.count > 0)
  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows.length ? rows : [{ status: 'DISMISSED', count: 1 }]}
              dataKey="count"
              nameKey="status"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={rows.length > 1 ? 4 : 0}
              cornerRadius={8}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={1300}
              animationEasing="ease-out"
            >
              {(rows.length ? rows : [{ status: 'DISMISSED' as ReportStatus, count: 1 }]).map((d) => (
                <Cell key={d.status} fill={rows.length ? STATUS[d.status].color : 'rgba(255,255,255,.08)'} />
              ))}
            </Pie>
            {rows.length > 0 && (
              <Tooltip
                content={({ active, payload }) => (
                  <GlassTip
                    active={active}
                    payload={payload?.map((p) => ({
                      name: STATUS[(p.payload as { status: ReportStatus }).status].label,
                      value: p.value as number,
                      color: STATUS[(p.payload as { status: ReportStatus }).status].color,
                      dataKey: (p.payload as { status: ReportStatus }).status,
                    }))}
                  />
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <AnimatedNumber value={total} className="donut-total" />
          <span>reports</span>
        </div>
      </div>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.status}>
            <Dot color={STATUS[d.status].color} />
            <span>{STATUS[d.status].label}</span>
            <b className="num">{num(d.count)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Horizontal meter bars ───────────────────────────────────────────────────

export function MeterBars({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; value: number; color: string; display?: React.ReactNode }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="meters">
      {rows.map((r, i) => (
        <li key={r.key}>
          <span className="meter-label">{r.label}</span>
          <span className="meter-track">
            <motion.span
              className="meter-fill"
              style={{ background: `linear-gradient(90deg, ${r.color}88, ${r.color})`, boxShadow: `0 0 14px ${r.color}55` }}
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 16, delay: 0.2 + i * 0.07 }}
            />
          </span>
          <b className="num meter-value">{r.display ?? num(r.value)}</b>
        </li>
      ))}
    </ul>
  )
}

// ── Liquid stacked bar (sentiment) ──────────────────────────────────────────

export function StackBar({ parts }: { parts: { key: string; value: number; color: string; label: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div className="stackbar-wrap">
      <div className="stackbar">
        {parts.map((p, i) => (
          <motion.span
            key={p.key}
            style={{ background: `linear-gradient(180deg, ${p.color}, ${p.color}bb)` }}
            initial={{ flexGrow: 0.0001 }}
            animate={{ flexGrow: Math.max(0.0001, p.value / total) }}
            transition={{ type: 'spring', stiffness: 60, damping: 15, delay: 0.25 + i * 0.1 }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <div className="stack-legend">
        {parts.map((p) => (
          <span key={p.key}>
            <Dot color={p.color} size={7} /> {p.label} <b className="num">{Math.round((p.value / total) * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Liquid orb: a glass sphere filled to a level, with a moving surface ─────

function wavePath(width: number, amp: number, len: number, depth: number) {
  let d = 'M0 0'
  for (let x = 0; x < width; x += len) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`
  return `${d} V ${depth} H 0 Z`
}

export function LiquidOrb({
  value,
  size = 172,
  color = C.accent,
  children,
}: {
  /** Fill level, 0–1. */
  value: number
  size?: number
  color?: string
  children?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const r = size / 2
  const len = size * 0.9
  const level = size * (1 - Math.max(0.04, Math.min(0.97, value)))
  const id = `orb${useId().replace(/:/g, '')}`
  const bubbles = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ x: size * (0.22 + ((i * 37) % 56) / 100), r: 2 + (i % 3) * 1.6, d: 2.6 + (i % 4) * 0.9, delay: i * 0.55 })),
    [size],
  )
  return (
    <div className="orb" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <clipPath id={`${id}c`}>
            <circle cx={r} cy={r} r={r - 3} />
          </clipPath>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={C.sky} stopOpacity={0.75} />
          </linearGradient>
          <radialGradient id={`${id}g`} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.14} />
            <stop offset="60%" stopColor="#fff" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.08} />
          </radialGradient>
        </defs>
        <circle cx={r} cy={r} r={r - 3} fill="rgba(255,255,255,.035)" />
        <g clipPath={`url(#${id}c)`}>
          <motion.g initial={{ y: size }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 34, damping: 11, delay: 0.3 }}>
            <motion.path
              d={wavePath(size + len * 2, 7, len, size + 20)}
              fill={C.sky}
              opacity={0.35}
              animate={reduce ? undefined : { x: [-len, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.path
              d={wavePath(size + len * 2, 6, len, size + 20)}
              fill={`url(#${id}f)`}
              opacity={0.85}
              animate={reduce ? undefined : { x: [0, -len] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </motion.g>
          {!reduce &&
            bubbles.map((b, i) => (
              <motion.circle
                key={i}
                cx={b.x}
                r={b.r}
                fill="rgba(255,255,255,.55)"
                initial={{ cy: size + 10, opacity: 0 }}
                animate={{ cy: [size + 10, level + 8], opacity: [0, 0.8, 0] }}
                transition={{ duration: b.d, repeat: Infinity, delay: 1 + b.delay, ease: 'easeIn' }}
              />
            ))}
        </g>
        <circle cx={r} cy={r} r={r - 3} fill={`url(#${id}g)`} />
        <circle cx={r} cy={r} r={r - 2} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={1.2} />
        <ellipse cx={r * 0.62} cy={r * 0.42} rx={r * 0.3} ry={r * 0.13} fill="#fff" opacity={0.18} transform={`rotate(-32 ${r * 0.62} ${r * 0.42})`} />
      </svg>
      <div className="orb-center">{children}</div>
    </div>
  )
}
