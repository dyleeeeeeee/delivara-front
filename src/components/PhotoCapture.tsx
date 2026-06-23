import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useToast } from './Toast'

interface PhotoCaptureProps {
  jobId: string
  onUploaded: (url: string) => void
}

const MAX_ATTEMPTS = 3

export default function PhotoCapture({ jobId, onUploaded }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  // attempts used so far; once it hits MAX_ATTEMPTS the rider can no longer retake.
  const [attempts, setAttempts] = useState(0)
  const toast = useToast()
  const remaining = MAX_ATTEMPTS - attempts

  // Downscale + convert to JPEG so the upload is small (fast on slow networks)
  // and always a displayable format (phones often shoot HEIC). Falls back to the
  // original file if the browser can't decode it.
  const toJpeg = async (file: File): Promise<Blob> => {
    try {
      const bitmap = await createImageBitmap(file)
      const max = 1280
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(bitmap, 0, 0, w, h)
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.82))
      return blob || file
    } catch {
      return file
    }
  }

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const blob = await toJpeg(file)
      const form = new FormData()
      form.append('proof', blob, 'proof.jpg')

      const shortId = jobId.replace('jobs:', '')
      const res = await api<{ photo_url: string; attempts: number; attempts_remaining: number }>(
        `/api/jobs/${shortId}/proof`,
        { method: 'POST', body: form },
      )
      setAttempts(res.attempts ?? attempts + 1)
      onUploaded(res.photo_url)
      const left = res.attempts_remaining ?? 0
      toast.show(left > 0 ? `Proof uploaded · ${left} retake${left > 1 ? 's' : ''} left` : 'Proof uploaded', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('limit')) {
        setAttempts(MAX_ATTEMPTS)
        toast.show('Re-upload limit reached (max 3)', 'error')
      } else {
        toast.show('Upload failed', 'error')
        setPreview(null)  // let them try again — this attempt didn't count
      }
    } finally {
      setUploading(false)
    }
  }

  const pickPhoto = () => inputRef.current?.click()

  return (
    <div className="space-y-3">
      {preview ? (
        <>
          <div className="relative rounded-xl overflow-hidden">
            <img src={preview} alt="Delivery proof" className="w-full h-40 object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <motion.div
                  className="w-8 h-8 border-2 border-aqua border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              </div>
            )}
          </div>
          {/* Wrong photo? Retake — capped at 3 uploads total. */}
          {!uploading && (
            remaining > 0 ? (
              <button
                onClick={pickPhoto}
                className="w-full py-2.5 glass-light rounded-xl text-text-secondary hover:text-text-primary text-sm font-medium transition-all"
              >
                ↺ Retake photo · {remaining} left
              </button>
            ) : (
              <p className="text-[11px] text-text-secondary/60 text-center">Re-upload limit reached (max {MAX_ATTEMPTS}).</p>
            )
          )}
        </>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={pickPhoto}
          className="w-full py-8 glass rounded-xl border-dashed border-2 border-iris/40 text-text-secondary hover:text-text-primary transition-all"
        >
          <div className="text-2xl mb-1">📷</div>
          <div className="text-sm">Take delivery photo</div>
        </motion.button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />
    </div>
  )
}
