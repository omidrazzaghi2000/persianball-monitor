import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SECTIONS } from './Monitor'

/** The step whose top has passed the upper third of the viewport. */
export function useActiveStep(ids: readonly string[], ready: boolean) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!ready) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.33
        let current = ids[0]
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= line) current = id
        }
        // At the very bottom the last step wins even if it's short.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1]
        setActive(current)
      })
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
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
