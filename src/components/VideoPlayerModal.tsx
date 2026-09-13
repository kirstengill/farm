import { useState, useRef, useEffect } from 'react'
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Clock,
  Tag,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import type { VideoItem } from '../lib/types'

interface VideoPlayerModalProps {
  video: VideoItem | null
  onClose: () => void
  onSelectVideo?: (video: VideoItem) => void
  relatedVideos?: VideoItem[]
}

export default function VideoPlayerModal({
  video,
  onClose,
  onSelectVideo,
  relatedVideos = [],
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerContainerRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setIsLoading(true)
    setHasError(false)
  }, [video?.id])

  // Key handlers (Escape to close, Space to play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          onClose()
        }
      } else if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, onClose])

  if (!video) return null

  const isEmbed =
    video.video_url.includes('youtube.com') ||
    video.video_url.includes('youtu.be') ||
    video.video_url.includes('vimeo.com')

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${id}?autoplay=1`
    }
    if (url.includes('youtube.com/watch')) {
      const match = url.match(/[?&]v=([^&]+)/)
      const id = match ? match[1] : ''
      return `https://www.youtube.com/embed/${id}?autoplay=1`
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${id}?autoplay=1`
    }
    return url
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        setHasError(true)
      })
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
    setIsLoading(false)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value)
    if (!videoRef.current) return
    videoRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value)
    setVolume(newVol)
    if (videoRef.current) {
      videoRef.current.volume = newVol
      videoRef.current.muted = newVol === 0
      setIsMuted(newVol === 0)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    videoRef.current.muted = nextMuted
    if (!nextMuted && volume === 0) {
      setVolume(0.5)
      videoRef.current.volume = 0.5
    }
  }

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(() => {})
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(() => {})
    }
  }

  const cyclePlaybackRate = () => {
    if (!videoRef.current) return
    const rates = [1, 1.25, 1.5, 2]
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIdx]
    setPlaybackRate(nextRate)
    videoRef.current.playbackRate = nextRate
  }

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00'
    const mins = Math.floor(sec / 60)
    const rem = Math.floor(sec % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 2800)
  }

  return (
    <div
      id="video-player-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-5xl rounded-3xl bg-forest-950 border border-forest-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-forest-800/80 bg-forest-900/60 text-white">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="inline-flex items-center gap-1 rounded-md bg-forest-800 px-2 py-0.5 text-xs font-semibold text-gold-400">
              <Tag className="h-3 w-3" />
              {video.category}
            </span>
            <h3 className="truncate font-display text-sm sm:text-base font-bold text-white">
              {video.title}
            </h3>
          </div>

          <button
            id="btn-close-video-modal"
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors shrink-0"
            title="Close video (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ================= PLAYER CONTAINER ================= */}
        <div
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          className="relative w-full bg-black aspect-video overflow-hidden flex items-center justify-center group select-none"
        >
          {isEmbed ? (
            <iframe
              src={getEmbedUrl(video.video_url)}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={video.video_url}
                poster={video.thumbnail_url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                  setIsLoading(false)
                  setIsPlaying(true)
                }}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  setIsLoading(false)
                  setHasError(true)
                }}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
                playsInline
              />

              {/* Loading State Overlay */}
              {isLoading && !hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none">
                  <div className="h-12 w-12 rounded-full border-4 border-gold-400/30 border-t-gold-400 animate-spin" />
                  <span className="mt-3 text-xs font-medium text-stone-200">
                    Buffering video stream…
                  </span>
                </div>
              )}

              {/* Error State Overlay */}
              {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-forest-950/90 p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-rose-400 mb-2" />
                  <p className="text-sm font-semibold text-white">Playback Error</p>
                  <p className="text-xs text-stone-300 max-w-sm mt-1 mb-4">
                    The video source could not be loaded directly. You can inspect the source URL or retry.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHasError(false)
                        setIsLoading(true)
                        if (videoRef.current) {
                          videoRef.current.load()
                          videoRef.current.play().catch(() => setHasError(true))
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest-700 hover:bg-forest-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Retry Playback</span>
                    </button>
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white transition-colors"
                    >
                      <span>Open Source</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Center Play/Pause Micro-Action Pill (Visible on pause) */}
              {!isPlaying && !isLoading && !hasError && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-forest-800/90 text-white shadow-xl hover:scale-110 hover:bg-forest-700 transition-all border border-gold-400/30"
                  title="Play video"
                >
                  <Play className="h-7 w-7 text-gold-400 ml-1" />
                </button>
              )}

              {/* Bottom Custom Controls Bar */}
              <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
                  showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Scrubbing Progress Bar */}
                <div className="relative mb-3 flex items-center group/scrub">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-gold-400 hover:h-2 transition-all"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15 text-white transition-colors"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-gold-400" />
                      ) : (
                        <Play className="h-4 w-4 text-gold-400 ml-0.5" />
                      )}
                    </button>

                    {/* Volume & Mute */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15 text-stone-200 hover:text-white transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-4 w-4 text-stone-400" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-gold-400 hidden sm:block"
                      />
                    </div>

                    {/* Timestamp Indicator */}
                    <div className="text-[11px] font-mono text-stone-300">
                      <span>{formatSeconds(currentTime)}</span>
                      <span className="mx-1 text-stone-500">/</span>
                      <span>{formatSeconds(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Playback speed selector */}
                    <button
                      type="button"
                      onClick={cyclePlaybackRate}
                      className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-mono font-bold text-stone-200 transition-colors"
                      title="Playback Speed"
                    >
                      {playbackRate}x
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15 text-stone-200 hover:text-white transition-colors"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================= DETAILS & PLAYLIST OVERVIEW ================= */}
        <div className="p-5 sm:p-6 bg-forest-950 overflow-y-auto text-stone-200 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-forest-900">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gold-400" />
                  <span>Duration: {video.duration}</span>
                </span>
                <span>·</span>
                <span>Category: {video.category}</span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                {video.title}
              </h2>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-3xl">
            {video.description}
          </div>

          {/* Related / Next Videos Quick Carousel */}
          {relatedVideos.length > 0 && onSelectVideo && (
            <div className="pt-3 border-t border-forest-900">
              <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
                <span>More Platform Videos</span>
                <span className="text-[11px] text-gold-400 font-normal">Click to switch</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {relatedVideos
                  .filter((v) => v.id !== video.id)
                  .slice(0, 3)
                  .map((other) => (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => onSelectVideo(other)}
                      className="group text-left rounded-xl bg-forest-900/60 hover:bg-forest-900 border border-forest-800/80 p-2.5 flex items-center gap-3 transition-colors"
                    >
                      <img
                        src={other.thumbnail_url}
                        alt={other.title}
                        className="h-12 w-16 object-cover rounded-lg shrink-0 group-hover:opacity-90"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white group-hover:text-gold-300 transition-colors">
                          {other.title}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">{other.duration}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone-500 group-hover:text-gold-400 shrink-0" />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
