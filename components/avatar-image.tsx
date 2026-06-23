'use client'

import Image from 'next/image'
import { useState } from 'react'

interface AvatarImageProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
  initials: string
  className?: string
  priority?: boolean
}

export function AvatarImage({
  src,
  alt,
  size = 'md',
  initials,
  className = '',
  priority = false,
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const hasImage = src && !imageError

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative ${className}`}
    >
      {hasImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          priority={priority}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
          <span className="text-indigo-700 font-semibold text-sm line-clamp-1">
            {initials}
          </span>
        </div>
      )}

      {/* Online status indicator */}
      {size !== 'sm' && (
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
      )}
    </div>
  )
}
