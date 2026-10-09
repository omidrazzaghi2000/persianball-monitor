import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { hueFor, initials } from '../lib/format'

export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 } as const
export const softSpring = { type: 'spring', stiffness: 170, damping: 24 } as const

// ── Ambient backdrop: slow liquid glows ─────────────────────────────────────

export function Backdrop() {
  return (
    <div className="ambient" aria-hidden>
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />
    </div>
  )
}

// ── Glass card with a lens highlight that follows the pointer ───────────────

type CardProps = Omit<HTMLMotionProps<'section'>, 'children'> & {
  children: ReactNode
  index?: number
  className?: string
}

export function GlassCard({ children, index = 0, className = '', style, ...rest }: CardProps) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const onLeave = () => {
    ref.current?.style.removeProperty('--mx')
    ref.current?.style.removeProperty('--my')
  }
  return (
    <motion.section
      ref={ref}
      className={`card rim ${className}`}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ ...softSpring, delay: 0.04 + (index % 4) * 0.07 }}
      {...rest}
    >
      {children}
    </motion.section>
  )
}

export function CardHeader({ title, caption, right }: { title: string; caption?: ReactNode; right?: ReactNode }) {
  return (
    <header className="card-head">
      <div>
        <h3>{title}</h3>
        {caption && <p>{caption}</p>}
      </div>
      {right}
    </header>
  )
}

// ── Numbers that roll to their value ────────────────────────────────────────

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  value: number | null
  decimals?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const fmt = useMemo(
    () => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [decimals],
  )
  const text = useTransform(mv, (v) => `${fmt.format(v)}${suffix}`)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (value === null || !inView) return
    if (reduce) {
      mv.set(value)
      return
    }
    const c = animate(mv, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [value, inView, reduce, mv])

  return (
    <motion.span ref={ref} className={`num ${className}`}>
      {value === null ? '—' : text}
    </motion.span>
  )
}

// ── Liquid segmented control ────────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  id: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`segmented ${size}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            className={active ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="seg-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
              />
            )}
            <span className="seg-label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Close a sheet, dialog or menu with the Escape key. */
export function useEscape(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onEscape, active])
}

// ── Small pieces ────────────────────────────────────────────────────────────

export function Avatar({ name, seed, size = 34 }: { name: string; seed?: string | number; size?: number }) {
  const color = hueFor(seed ?? name)
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.38,
    color,
    background: `radial-gradient(circle at 30% 25%, ${color}40, ${color}14 70%)`,
    boxShadow: `inset 0 0 0 1px ${color}40`,
  }
  return (
    <span className="avatar" style={style} aria-hidden>
      {initials(name) || '?'}
    </span>
  )
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="dot" style={{ width: size, height: size, background: color, boxShadow: `0 0 10px ${color}80` }} />
}

export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="chip" style={{ color, background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
      {children}
    </span>
  )
}

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
            fill={i <= value ? 'var(--amber)' : 'rgba(255,255,255,.12)'}
          />
        </svg>
      ))}
    </span>
  )
}

export function Empty({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={softSpring}>
      <div className="empty-orb">{icon}</div>
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </motion.div>
  )
}
