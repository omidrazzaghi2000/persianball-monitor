import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { STEPS, type StepKey } from '../api/client'
import { Ring } from '../components/charts'

/** First load: each backend request ticks off as it lands. */
export function LoadProgress({ done }: { done: StepKey[] }) {
  const pct = Math.round((done.length / STEPS.length) * 100)
  return (
    <motion.div
      className="load-progress card rim"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      <Ring value={done.length} total={STEPS.length} size={132} stroke={11}>
        <span className="ring-value small num">{pct}%</span>
      </Ring>
      <div className="load-copy">
        <strong>Preparing your monitoring overview</strong>
        <span>Fetching live data from the PersianBall server</span>
        <ol className="load-steps">
          {STEPS.map((s, i) => {
            const ok = done.includes(s.key)
            return (
              <motion.li
                key={s.key}
                className={ok ? 'ok' : ''}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
              >
                <span className="load-mark">
                  <AnimatePresence mode="wait" initial={false}>
                    {ok ? (
                      <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                        <Check size={13} strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <motion.span key="wait" className="mini-spin" exit={{ scale: 0 }} />
                    )}
                  </AnimatePresence>
                </span>
                {s.label}
              </motion.li>
            )
          })}
        </ol>
      </div>
    </motion.div>
  )
}

/** Refresh: a floating pill that fills one segment per request. */
export function RefreshProgress({ done }: { done: StepKey[] }) {
  return (
    <motion.div
      className="refresh-pill glass rim"
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      role="status"
    >
      <span className="mini-spin" />
      <span>
        Updating <b className="num">{done.length}</b>/{STEPS.length}
      </span>
      <span className="refresh-segs">
        {STEPS.map((s) => (
          <motion.i key={s.key} animate={{ opacity: done.includes(s.key) ? 1 : 0.2, scaleY: done.includes(s.key) ? 1 : 0.6 }} />
        ))}
      </span>
    </motion.div>
  )
}
