import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Eye, EyeOff, Lock, LogIn, Mail, Phone, User, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { requestPasswordReset, signIn } from '../api/client'
import type { Me } from '../api/types'
import { Logo } from '../components/Icons'
import { useToast } from '../components/Toast'
import { softSpring, useEscape } from '../components/ui'

const isEmail = (v: string) => /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/.test(v)
const isPhone = (v: string) => /^(\+98|0)?9\d{9}$/.test(v)

function IdentifierIcon({ value }: { value: string }) {
  const props = { className: 'input-icon', size: 20 }
  if (isEmail(value)) return <Mail {...props} />
  if (isPhone(value)) return <Phone {...props} />
  return <User {...props} />
}

const item = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: softSpring },
}

export default function Login({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const toast = useToast()
  const shake = useAnimationControls()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [obscure, setObscure] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ id?: string; pw?: string }>({})
  const [resetOpen, setResetOpen] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const id = identifier.trim()
    const next: typeof errors = {}
    if (!id) next.id = 'Enter your email or phone number'
    else if (!isEmail(id) && !isPhone(id)) next.id = 'Enter a valid email or phone number'
    if (!password) next.pw = 'Enter your password'
    setErrors(next)
    if (next.id || next.pw) {
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } })
      return
    }
    setBusy(true)
    try {
      const me = await signIn(id, password)
      toast('Signed in')
      onSignedIn(me)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sign-in failed', true)
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.main
      className="login"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="login-media" aria-hidden>
        <video src={`${import.meta.env.BASE_URL}media/login.mp4`} autoPlay muted loop playsInline preload="auto" />
        <div className="login-scrim" />
      </div>

      <motion.div
        className="login-column"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
      >
        <motion.div variants={item} className="login-brand">
          <motion.div
            initial={{ scale: 0.6, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
          >
            <Logo size={64} />
          </motion.div>
          <h1 className="wordmark">Welcome To PersianBall</h1>
          <p>Log in to the monitoring panel</p>
        </motion.div>

        <motion.div variants={item}>
          <motion.form className="login-card glass clear rim" onSubmit={submit} animate={shake} noValidate>
            <label className="input-wrap">
              <IdentifierIcon value={identifier.trim()} />
              <input
                className={`field ${errors.id ? 'invalid' : ''}`}
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Email / Phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-invalid={!!errors.id}
              />
            </label>
            <FieldError text={errors.id} />

            <label className="input-wrap">
              <Lock className="input-icon" size={20} />
              <input
                className={`field has-suffix ${errors.pw ? 'invalid' : ''}`}
                type={obscure ? 'password' : 'text'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.pw}
              />
              <button
                type="button"
                className="input-suffix"
                onClick={() => setObscure((o) => !o)}
                aria-label={obscure ? 'Show password' : 'Hide password'}
              >
                {obscure ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </label>
            <FieldError text={errors.pw} />

            <motion.button
              type="submit"
              className="btn primary login-btn"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              layout
            >
              <AnimatePresence mode="wait" initial={false}>
                {busy ? (
                  <motion.span key="s" className="spinner" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} />
                ) : (
                  <motion.span key="l" className="btn-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <LogIn size={20} /> Login
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <button type="button" className="link-btn" onClick={() => setResetOpen(true)}>
              Reset Password
            </button>
          </motion.form>
        </motion.div>

        <motion.p variants={item} className="login-foot">
          Monitoring Panel · v1.2
        </motion.p>
      </motion.div>

      <AnimatePresence>{resetOpen && <ResetDialog initial={identifier} onClose={() => setResetOpen(false)} />}</AnimatePresence>
    </motion.main>
  )
}

function FieldError({ text }: { text?: string }) {
  return (
    <AnimatePresence initial={false}>
      {text && (
        <motion.span
          className="field-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function ResetDialog({ initial, onClose }: { initial: string; onClose: () => void }) {
  const toast = useToast()
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEscape(onClose)

  async function send(e: FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!isEmail(v) && !isPhone(v)) {
      toast('Enter a valid email or phone number', true)
      return
    }
    setBusy(true)
    try {
      await requestPasswordReset(v)
      toast('We sent a verification code. Use the app to finish resetting.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the code', true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="dialog glass rim"
        onSubmit={send}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        <button type="button" className="btn ghost icon dialog-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h2>Reset Password</h2>
        <p>Enter the email or phone number on your account and we'll send you a code.</p>
        <label className="input-wrap">
          <Mail className="input-icon" size={20} />
          <input className="field" autoFocus placeholder="Email / Phone" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn primary wide" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Send code'}
        </button>
      </motion.form>
    </motion.div>
  )
}
