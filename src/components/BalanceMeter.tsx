import { useEffect, useState } from 'react'

interface BalanceMeterProps {
  value: number
}

/** Counts up once when the score changes so the number feels alive. */
export function BalanceMeter({ value }: BalanceMeterProps) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const target = Math.max(0, Math.min(100, value))
    const start = shown
    const delta = target - start
    if (delta === 0) return
    const duration = 420
    const t0 = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - (1 - t) * (1 - t)
      setShown(Math.round(start + delta * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Only re-run when the target score changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <p className="balance-value">{shown}</p>
}
