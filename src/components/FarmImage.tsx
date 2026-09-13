import { useState } from 'react'
import { farmArtFor } from '../lib/farmArt'

/** Image that fades in when loaded and swaps to category farm photo if missing or failed. */
export default function FarmImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src?: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const resolvedSrc = (!src || src.trim() === '') ? farmArtFor(alt) : src
  const current = failed ? farmArtFor(alt) : resolvedSrc

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-forest-900/10 dark:bg-forest-900/20" />
      )}
      <img
        key={current}
        src={current}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        className={`h-full w-full object-cover transition-all duration-500 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed) setFailed(true)
          else setLoaded(true)
        }}
      />
    </div>
  )
}

