import { useId } from 'react'

/** Minimal sparrow silhouette — warm beak accent */
export function SparrowMark({ className = '' }: { className?: string }) {
  const raw = useId()
  const gid = `sparrow-beak-${raw.replace(/:/g, '')}`

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="34" y1="8" x2="44" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path
        d="M10 28c3-9 11-15 21-14 3 0 5 2 3 5-2 3-6 4-10 4-3 0-6-2-8-4l-2 9h-6v-1l2-3z"
        className="fill-sparrow-800"
      />
      <circle cx="32" cy="16" r="2" className="fill-sparrow-50" />
      <path d="M35 12l8-4-2 6-6-2z" fill={`url(#${gid})`} />
      <circle cx="28" cy="20" r="1.25" className="fill-flame-300/90" />
    </svg>
  )
}
