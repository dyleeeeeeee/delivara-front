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
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileTap={readonly ? {} : { scale: 0.85 }}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(star)}
          disabled={readonly}
          className="text-2xl transition-colors"
          style={{
            color: star <= (hover || value) ? '#F59E0B' : '#374151',
          }}
        >
          ★
        </motion.button>
      ))}
    </div>
  )
}
