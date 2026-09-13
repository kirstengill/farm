import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  Tag,
  X,
  RefreshCw,
  Search,
  Film,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { VideoItem } from '../lib/types'
import VideoPlayerModal from './VideoPlayerModal'

const CATEGORY_OPTIONS = [
  'Getting Started',
  'How Investing Works',
  'Investment Programs',
  'Deposits & Withdrawals',
  'Platform Guide',
]

interface VideoFormState {
  id?: string
  title: string
  category: string
  description: string
  duration: string
  thumbnail_url: string
  video_url: string
  published: boolean
  sort_order: number
}

const emptyForm: VideoFormState = {
  title: '',
  category: 'Getting Started',
  description: '',
  duration: '3:00',
  thumbnail_url: '',
  video_url: '',
  published: true,
  sort_order: 1,
}

export default function AdminVideoManager() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<VideoFormState>(emptyForm)
  const [isEditing, setIsEditing] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setVideos((data as VideoItem[]) || [])
    } catch (err: any) {
      console.error('Error fetching admin videos:', err)
      setFeedback({ type: 'error', text: err?.message || 'Failed to load videos from Supabase.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handleOpenAdd = () => {
    setForm({
      ...emptyForm,
      sort_order: videos.length + 1,
    })
    setIsEditing(false)
    setModalOpen(true)
    setFeedback(null)
  }

  const handleOpenEdit = (v: VideoItem) => {
    setForm({
      id: v.id,
      title: v.title,
      category: v.category,
      description: v.description,
      duration: v.duration,
      thumbnail_url: v.thumbnail_url,
      video_url: v.video_url,
      published: v.published,
      sort_order: v.sort_order ?? 1,
    })
    setIsEditing(true)
    setModalOpen(true)
    setFeedback(null)
  }

  const handleTogglePublished = async (v: VideoItem) => {
    try {
      const nextStatus = !v.published
      const { error } = await supabase
        .from('videos')
        .update({ published: nextStatus })
        .eq('id', v.id)

      if (error) throw error

      setVideos((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, published: nextStatus } : item))
      )
      setFeedback({
        type: 'success',
        text: `Video "${v.title}" is now ${nextStatus ? 'Published' : 'Unpublished'}.`,
      })
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to update publication status.' })
    }
  }

  const handleDelete = async (v: VideoItem) => {
    if (!window.confirm(`Are you sure you want to delete video "${v.title}"?`)) return
    try {
      setActionBusy(true)
      const { error } = await supabase.from('videos').delete().eq('id', v.id)
      if (error) throw error

      setVideos((prev) => prev.filter((item) => item.id !== v.id))
      setFeedback({ type: 'success', text: `Video "${v.title}" successfully deleted.` })
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to delete video.' })
    } finally {
      setActionBusy(false)
    }
  }

  const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (target === 'thumbnail') setUploadingThumb(true)
      else setUploadingVideo(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `${target}s/${fileName}`

      const { data, error } = await supabase.storage.from('videos').upload(filePath, file)
      if (error) throw error

      const { data: publicData } = supabase.storage.from('videos').getPublicUrl(data?.path || filePath)

      if (target === 'thumbnail') {
        setForm((prev) => ({ ...prev, thumbnail_url: publicData.publicUrl }))
      } else {
        setForm((prev) => ({ ...prev, video_url: publicData.publicUrl }))
      }

      setFeedback({
        type: 'success',
        text: `${target === 'thumbnail' ? 'Thumbnail' : 'Video'} uploaded successfully to Supabase Storage!`,
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Upload failed: ${err?.message || 'Storage error'}. You may paste a direct URL instead.`,
      })
    } finally {
      if (target === 'thumbnail') setUploadingThumb(false)
      else setUploadingVideo(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setFeedback({ type: 'error', text: 'Video title is required.' })
      return
    }
    if (!form.video_url.trim()) {
      setFeedback({ type: 'error', text: 'Video URL or uploaded file is required.' })
      return
    }
    if (!form.thumbnail_url.trim()) {
      // Provide pleasant agricultural fallback if left empty
      form.thumbnail_url =
        'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80'
    }

    setActionBusy(true)
    try {
      if (isEditing && form.id) {
        const { error } = await supabase
          .from('videos')
          .update({
            title: form.title.trim(),
            category: form.category,
            description: form.description.trim(),
            duration: form.duration.trim() || '3:00',
            thumbnail_url: form.thumbnail_url.trim(),
            video_url: form.video_url.trim(),
            published: form.published,
            sort_order: Number(form.sort_order) || 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', form.id)

        if (error) throw error
        setFeedback({ type: 'success', text: `Video "${form.title}" updated successfully.` })
      } else {
        const { error } = await supabase.from('videos').insert({
          title: form.title.trim(),
          category: form.category,
          description: form.description.trim(),
          duration: form.duration.trim() || '3:00',
          thumbnail_url: form.thumbnail_url.trim(),
          video_url: form.video_url.trim(),
          published: form.published,
          sort_order: Number(form.sort_order) || 1,
        })

        if (error) throw error
        setFeedback({ type: 'success', text: `New video "${form.title}" published successfully.` })
      }

      setModalOpen(false)
      await loadVideos()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to save video.' })
    } finally {
      setActionBusy(false)
    }
  }

  const filtered = videos.filter((v) => {
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter
    const q = search.toLowerCase().trim()
    const matchesQuery =
      !q ||
      v.title.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/80 border border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action and Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-forest-950 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Video</span>
          </button>
          <button
            type="button"
            onClick={loadVideos}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
            title="Refresh videos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-stone-400">
            {videos.length} videos ({videos.filter((v) => v.published).length} published)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-stone-200 focus:outline-none focus:border-gold-400"
          >
            <option value="All" className="bg-[#111713]">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c} className="bg-[#111713]">
                {c}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-gold-400"
            />
          </div>
        </div>
      </div>

      {/* Videos List / Table Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-gold-400" />
            <span>Loading videos from Supabase…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <Film className="mx-auto h-8 w-8 text-stone-500 mb-2" />
            <p className="font-semibold text-stone-300">No videos found</p>
            <p className="text-stone-500 mt-1">Try adjusting search or category filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="border-b border-white/10 bg-white/[0.02] uppercase tracking-wider text-[10px] text-stone-400 font-bold">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Video</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-400">
                      #{v.sort_order}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setPreviewVideo(v)}
                          className="relative h-12 w-20 rounded-lg overflow-hidden bg-black cursor-pointer shrink-0 border border-white/10 group"
                        >
                          <img
                            src={v.thumbnail_url}
                            alt={v.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4 text-gold-400 fill-gold-400" />
                          </div>
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <p className="font-bold text-white truncate text-xs sm:text-sm">
                            {v.title}
                          </p>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            {v.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-forest-900/60 border border-forest-700/50 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                        <Tag className="h-2.5 w-2.5" />
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-stone-500" />
                        {v.duration}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(v)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                          v.published
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-stone-800 border border-stone-600/40 text-stone-400 hover:bg-stone-700'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {v.published ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewVideo(v)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
                          title="Preview video"
                        >
                          <Play className="h-3.5 w-3.5 text-gold-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(v)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
                          title="Edit video"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-stone-300" />
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleDelete(v)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition-colors"
                          title="Delete video"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= ADD / EDIT VIDEO MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#151c17] p-6 sm:p-8 text-stone-200 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {isEditing ? 'Edit Video Details' : 'Add Platform Video'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Saves directly into Supabase database & storage for all users.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-white text-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Video Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. How to Deposit with MTN Mobile Money"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-400 text-xs sm:text-sm"
                />
              </div>

              {/* Category & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#111713] text-white focus:outline-none focus:border-gold-400 text-xs sm:text-sm"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    Duration (e.g. 3:45)
                  </label>
                  <input
                    type="text"
                    required
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="3:45"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-400 font-mono text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Concise overview explaining what investors will learn in this video…"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-400 text-xs sm:text-sm leading-relaxed"
                />
              </div>

              {/* Video URL & File Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Video Source URL or File
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:text-gold-300">
                    <Upload className="h-3 w-3" />
                    <span>{uploadingVideo ? 'Uploading…' : 'Upload Video to Storage'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleUploadFile(e, 'video')}
                      disabled={uploadingVideo}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://... direct MP4 URL or YouTube / Vimeo link"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-400 font-mono text-xs"
                />
              </div>

              {/* Thumbnail URL & File Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Thumbnail Image URL or File
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:text-gold-300">
                    <Upload className="h-3 w-3" />
                    <span>{uploadingThumb ? 'Uploading…' : 'Upload Image to Storage'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, 'thumbnail')}
                      disabled={uploadingThumb}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  placeholder="https://... image poster URL"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:outline-none focus:border-gold-400 font-mono text-xs"
                />
              </div>

              {/* Sort Order & Published Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold-400 font-mono text-xs"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="h-4 w-4 rounded border-stone-600 bg-white/10 text-gold-500 focus:ring-gold-400 focus:ring-offset-0"
                    />
                    <span className="text-xs font-semibold text-stone-200">
                      Publish immediately to investor catalog
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || uploadingThumb || uploadingVideo}
                  className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-forest-950 font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {actionBusy
                    ? 'Saving Video…'
                    : isEditing
                    ? 'Save Video Changes'
                    : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Video Preview Modal */}
      {previewVideo && (
        <VideoPlayerModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onSelectVideo={(v) => setPreviewVideo(v)}
          relatedVideos={videos}
        />
      )}
    </div>
  )
}
