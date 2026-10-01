import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  text: string
  error?: boolean
}

const Ctx = createContext<(text: string, error?: boolean) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((text: string, error = false) => {
    const id = ++seq.current
    setItems((t) => [...t.slice(-2), { id, text, error }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="toast glass rim"
              initial={{ opacity: 0, y: 24, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
              exit={{ opacity: 0, y: 12, scale: 0.94, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {t.error ? <AlertCircle size={16} color="var(--red)" /> : <CheckCircle2 size={16} color="var(--accent)" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
