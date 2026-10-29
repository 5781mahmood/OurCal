import type { CSSProperties } from 'react'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  stroke?: number
  label: string
  sublabel?: string
  color?: string
}

export function ProgressRing({
  value,
  max,
  size = 168,
  stroke = 12,
  label,
  sublabel,
  color = 'var(--accent)',
}: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? Math.min(value / max, 1.15) : 0
  const offset = circumference * (1 - Math.min(pct, 1))
  const over = value > max

  const style = {
    '--ring-size': `${size}px`,
    '--ring-color': over ? 'var(--warn)' : color,
  } as CSSProperties

  return (
    <div className="ring" style={style} aria-label={`${label}: ${value} of ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <strong>{Math.round(value)}</strong>
        <span>{label}</span>
        {sublabel ? <em>{sublabel}</em> : null}
      </div>
    </div>
  )
}