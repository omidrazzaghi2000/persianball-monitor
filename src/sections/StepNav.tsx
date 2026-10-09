import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SECTIONS } from './Monitor'

/** Tracks which numbered step is in the middle of the viewport. */
export function useActiveStep(ids: readonly string[], ready: boolean) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!ready) return
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ids, ready])
  return active
}

export function StepNav({ id, active, disabled, compact }: { id: string; active: string; disabled?: boolean; compact?: boolean }) {
  const index = SECTIONS.findIndex((s) => s.id === active)
  return (
    <div className={`segmented stepnav ${compact ? 'sm' : ''}`} role="navigation" aria-label="Dashboard steps">
      {SECTIONS.map((s, i) => {
        const on = s.id === active
        return (
          <button
            key={s.id}
            className={`${on ? 'active' : ''} ${i < index ? 'passed' : ''}`}
            disabled={disabled}
            aria-current={on ? 'step' : undefined}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {on && (
              <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }} />
            )}
            <span className="seg-label">
              <span className="step-dot num">{i + 1}</span>
              {(!compact || on) && s.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}
