import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { num } from '../lib/format'
import { Avatar } from './ui'

export interface PickerCoach {
  id: number
  name: string
  email: string
  students: number
}

/** A searchable glass popover for choosing a coach. */
export function CoachPicker({
  coaches,
  value,
  onChange,
  disabled,
}: {
  coaches: PickerCoach[]
  value: number | null
  onChange: (id: number) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 300 })
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = coaches.find((c) => c.id === value)

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? coaches.filter((c) => c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t)) : coaches
  }, [coaches, q])

  function toggle() {
    if (!btn.current) return
    const r = btn.current.getBoundingClientRect()
    const width = Math.max(300, r.width)
    const left = Math.min(Math.max(12, r.left), window.innerWidth - width - 12)
    setAnchor({ top: r.bottom + 10, left, width })
    setQ('')
    setCursor(Math.max(0, coaches.findIndex((c) => c.id === value)))
    setOpen((o) => !o)
  }

  function choose(id: number) {
    onChange(id)
    setOpen(false)
    btn.current?.focus()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      btn.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(shown.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter' && shown[cursor]) {
      e.preventDefault()
      choose(shown[cursor].id)
    }
  }

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, { passive: true })
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        className={`picker-btn ${open ? 'open' : ''}`}
        onClick={toggle}
        disabled={disabled || !coaches.length}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current ? <Avatar name={current.name} seed={current.id} size={28} /> : <span className="picker-empty-av" />}
        <span className="picker-text">
          <small>Coach</small>
          <strong>{current?.name ?? 'Choose a coach'}</strong>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }} style={{ display: 'flex' }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <div className="click-away" onClick={() => setOpen(false)} />
              <motion.div
                className="picker-pop glass rim"
                style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                onKeyDown={onKey}
              >
                <label className="picker-search">
                  <Search size={15} />
                  <input
                    autoFocus
                    placeholder="Search coaches"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value)
                      setCursor(0)
                    }}
                    aria-label="Search coaches"
                  />
                </label>
                <ul className="picker-list scroll-y" role="listbox" ref={list}>
                  {shown.map((c, i) => {
                    const on = c.id === value
                    return (
                      <li
                        key={c.id}
                        data-i={i}
                        role="option"
                        aria-selected={on}
                        className={`${on ? 'on' : ''} ${i === cursor ? 'cursor' : ''}`}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => choose(c.id)}
                      >
                        <Avatar name={c.name} seed={c.id} size={32} />
                        <span className="picker-name">
                          <strong>{c.name}</strong>
                          <span>{num(c.students)} {c.students === 1 ? 'student' : 'students'}</span>
                        </span>
                        {on && <Check size={16} className="picker-check" />}
                      </li>
                    )
                  })}
                  {!shown.length && <li className="picker-none">No coach matches “{q}”</li>}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
