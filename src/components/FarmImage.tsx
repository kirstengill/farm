import { useState } from 'react'

const FALLBACK =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70'

/** Image that fades in when loaded and swaps to the fallback farm photo if the primary URL fails. */
export default function FarmImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const current = failed ? FALLBACK : src

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`${className} transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: '#e7e5df' }}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (!failed) setFailed(true)
        else setLoaded(true)
      }}
    />
  )
}
