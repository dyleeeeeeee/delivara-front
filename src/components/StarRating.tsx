import { useState } from 'react'
import { motion } from 'framer-motion'

interface StarRatingProps {
  value?: number
  onChange?: (value: number) => void
  readonly?: boolean
}

export default function StarRating({ value = 0, onChange, readonly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value)
        return (
          <motion.button
            key={star}
            whileTap={readonly ? {} : { scale: 0.85 }}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(star)}
            disabled={readonly}
            className="text-2xl transition-all"
            style={
              active
                ? {
                    backgroundImage: 'linear-gradient(135deg, #7C5CFF, #22E0F0)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0 0 6px rgba(124,92,255,0.55))',
                  }
                : { color: '#2A2E45' }
            }
          >
            ★
          </motion.button>
        )
      })}
    </div>
  )
}
