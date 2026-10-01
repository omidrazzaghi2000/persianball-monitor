import { motion } from 'framer-motion'

export function DashboardSkeleton() {
  const block = (cls: string, i: number) => (
    <motion.div
      key={i}
      className={`card rim sk ${cls}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="skeleton" style={{ width: '40%', height: 14 }} />
      <div className="skeleton" style={{ width: '62%', height: 34, marginTop: 16 }} />
      <div className="skeleton" style={{ width: '100%', flex: 1, marginTop: 18, minHeight: 28 }} />
    </motion.div>
  )
  return (
    <div className="grid">
      {['span-3 kpi', 'span-3 kpi', 'span-3 kpi', 'span-3 kpi', 'span-8 tall', 'span-4 tall', 'span-4 mid', 'span-4 mid', 'span-4 mid'].map(block)}
    </div>
  )
}
