import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useToast } from './Toast'

interface PhotoCaptureProps {
  jobId: string
  onUploaded: (url: string) => void
}

export default function PhotoCapture({ jobId, onUploaded }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const toast = useToast()

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const form = new FormData()
      form.append('proof', file)

      const shortId = jobId.replace('jobs:', '')
      const res = await api<{ photo_url: string }>(`/api/jobs/${shortId}/proof`, {
        method: 'POST',
        body: form,
      })
      onUploaded(res.photo_url)
      toast.show('Proof uploaded', 'success')
    } catch {
      toast.show('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Delivery proof" className="w-full h-40 object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <motion.div
                className="w-8 h-8 border-2 border-accent-secondary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            </div>
          )}
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => inputRef.current?.click()}
          className="w-full py-8 glass rounded-xl border-dashed border-2 border-accent-primary/30 text-text-secondary hover:text-text-primary transition-all"
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
