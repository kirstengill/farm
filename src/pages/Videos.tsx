import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Clock,
  Search,
  Tag,
  Filter,
  ArrowRight,
  Plus,
  Compass,
  CheckCircle2,
  Video,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import VideoPlayerModal from '../components/VideoPlayerModal'
import { supabase } from '../lib/supabase'
import type { VideoItem } from '../lib/types'

const CATEGORIES = [
  'All',
  'Getting Started',
  'How Investing Works',
  'Investment Programs',
  'Deposits & Withdrawals',
  'Platform Guide',
]

export default function Videos() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)

  const loadVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching videos:', error)
      } else if (data) {
        setVideos(data as VideoItem[])
      }
    } catch (err) {
      console.error('Failed to load videos from Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const filteredVideos = useMemo(() => {
    return videos.filter((vid) => {
      const matchesCategory =
        selectedCategory === 'All' || vid.category.toLowerCase() === selectedCategory.toLowerCase()

      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        vid.title.toLowerCase().includes(q) ||
        vid.description.toLowerCase().includes(q) ||
        vid.category.toLowerCase().includes(q)

      return matchesCategory && matchesQuery
    })
  }, [videos, selectedCategory, searchQuery])

  return (
    <AppLayout activeTab="videos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-900 px-3 py-0.5 text-xs font-semibold text-forest-300">
                <Video className="h-3.5 w-3.5 text-forest-500" />
                Investor Media & Tutorials
              </span>
              <span className="text-xs text-stone-400">· {videos.length} Educational Guides</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Platform Videos & Guides
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5 max-w-2xl">
              Watch step-by-step walkthroughs on asset-backed cattle breeding, animal feed milling, and seamless MTN & Airtel Mobile Money funding.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard?tab=wallet"
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-forest-700 transition-colors"
            >
              <Plus className="h-4 w-4 text-gold-400" />
              <span>Deposit Funds</span>
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-forest-900 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <Compass className="h-4 w-4 text-forest-500" />
              <span>Browse Programs</span>
            </Link>
          </div>
        </div>

        {/* ================= SEARCH & CATEGORY FILTERS ================= */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-forest-800 text-white shadow-xs'
                      : 'bg-forest-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials & guides…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-700 bg-forest-900 text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-forest-700 focus:ring-2 focus:ring-forest-700/10 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* ================= VIDEO GRID ================= */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-stone-800 bg-forest-900 overflow-hidden p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-video bg-stone-800 rounded-2xl" />
                <div className="h-4 bg-stone-800 rounded-md w-3/4" />
                <div className="h-3 bg-stone-800/50 rounded-md w-full" />
                <div className="h-3 bg-stone-800/50 rounded-md w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-800 bg-forest-900 p-12 text-center max-w-lg mx-auto">
            <Video className="mx-auto h-12 w-12 text-stone-600 mb-3" />
            <h3 className="font-display text-lg font-bold text-white">No Videos Found</h3>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              No platform videos match your filter &ldquo;{searchQuery || selectedCategory}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All')
                setSearchQuery('')
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-forest-800 text-white px-4 py-2 text-xs font-semibold hover:bg-forest-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((vid) => (
              <div
                key={vid.id}
                id={`video-card-${vid.id}`}
                className="group rounded-3xl border border-stone-800 bg-forest-900 overflow-hidden shadow-xs hover:shadow-md hover:border-forest-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Container with Play Micro-Interaction */}
                  <div
                    onClick={() => setActiveVideo(vid)}
                    className="relative aspect-video overflow-hidden cursor-pointer bg-forest-950"
                  >
                    <img
                      src={vid.thumbnail_url}
                      alt={vid.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Category Tag Pill */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-forest-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-gold-300 border border-gold-400/20">
                        <Tag className="h-3 w-3" />
                        {vid.category}
                      </span>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[11px] font-mono font-semibold text-white">
                        <Clock className="h-3 w-3 text-stone-400" />
                        {vid.duration}
                      </span>
                    </div>

                    {/* Center Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-800/90 group-hover:bg-forest-700 text-white shadow-lg group-hover:scale-110 transition-all border border-gold-400/30">
                        <Play className="h-5 w-5 text-gold-400 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <h3
                      onClick={() => setActiveVideo(vid)}
                      className="font-display text-base font-bold text-white group-hover:text-gold-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {vid.title}
                    </h3>
                    <p className="mt-2 text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {vid.description}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-stone-800 mt-2">
                  <span className="text-[11px] text-stone-500 font-mono">
                    {vid.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Watch Video</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gold-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= CALL-TO-ACTION DEPOSIT BANNER ================= */}
        <div className="rounded-3xl border border-forest-800/20 bg-gradient-to-br from-forest-950 via-forest-900 to-forest-850 p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/20 px-3 py-0.5 text-xs font-semibold text-gold-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Ready to start earning yields?</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Deposit via MTN or Airtel Mobile Money
            </h2>
            <p className="text-xs sm:text-sm text-forest-200 max-w-xl">
              Instant crediting in Ugandan Shillings (UGX). No foreign currency exchange losses. Select an active livestock or feeds cycle immediately after funding.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/dashboard?tab=wallet"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-400 px-5 py-3 text-xs sm:text-sm font-bold text-forest-950 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Make a Deposit</span>
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition-all"
            >
              <span>View Programs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onSelectVideo={(v) => setActiveVideo(v)}
          relatedVideos={videos}
        />
      )}
    </AppLayout>
  )
}
