import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Suspense, lazy, useEffect, useState } from 'react'
import { clearSession, storedMe } from './api/client'
import { DEMO, demoSession } from './api/demo'
import type { Me } from './api/types'
import { ToastProvider } from './components/Toast'
import { Backdrop } from './components/ui'
import { clearSnapshotCache } from './lib/useSnapshot'
import Login from './pages/Login'

const loadDashboard = () => import('./pages/Dashboard')
const Dashboard = lazy(loadDashboard)

export default function App() {
  const [me, setMe] = useState<Me | null>(() => (DEMO ? demoSession.get() : storedMe()))

  // Warm the dashboard bundle while the sign-in form is on screen.
  useEffect(() => {
    const t = setTimeout(loadDashboard, 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const out = () => setMe(null)
    window.addEventListener('pbm:signed-out', out)
    return () => window.removeEventListener('pbm:signed-out', out)
  }, [])

  function signOut() {
    clearSession()
    clearSnapshotCache()
    demoSession.set(false)
    setMe(null)
  }

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <Backdrop />
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {me ? <Dashboard key="dash" me={me} onSignOut={signOut} /> : <Login key="login" onSignedIn={setMe} />}
          </AnimatePresence>
        </Suspense>
      </ToastProvider>
    </MotionConfig>
  )
}
