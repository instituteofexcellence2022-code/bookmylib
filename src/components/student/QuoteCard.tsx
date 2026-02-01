'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Quote } from '@/lib/quotes'
import { ChevronLeft, ChevronRight, Quote as QuoteIcon, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleQuoteLike } from '@/actions/quotes'
import { toast } from 'react-hot-toast'

interface QuoteCardProps {
  quotes: Quote[]
  className?: string
  initialLikedIds?: number[]
}

export function QuoteCard({ quotes, className, initialLikedIds = [] }: QuoteCardProps) {
  // Start with index 0 to show the "original" good quote first
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set(initialLikedIds))
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setLikedIds(new Set(initialLikedIds))
  }, [initialLikedIds])

  const currentQuote = quotes[currentIndex]

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent swipe/drag if any
    const id = currentQuote.id
    
    // Optimistic update
    setLikedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })

    try {
      // Server action
      const result = await toggleQuoteLike(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update like')
      }
    } catch (error) {
      toast.error('Failed to update favorite')
      // Revert if failed
      setLikedIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
    }
  }

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection)
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection
      if (nextIndex < 0) nextIndex = quotes.length - 1
      if (nextIndex >= quotes.length) nextIndex = 0
      return nextIndex
    })
  }, [quotes.length])

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const swipeConfidenceThreshold = 10000
    const swipePower = Math.abs(offset.x) * velocity.x

    // User asked: "swap right to show net quotes, and left swap to previous"
    // Drag offset.x > 0 is a Right Swipe.
    // Drag offset.x < 0 is a Left Swipe.
    
    // Check both power (flick) and distance (drag and drop)
    if (swipePower < -swipeConfidenceThreshold || offset.x < -100) {
      // Swiped Left -> Next (New)
      paginate(1)
    } else if (swipePower > swipeConfidenceThreshold || offset.x > 100) {
      // Swiped Right -> Previous
      paginate(-1)
    }
  }

  if (!quotes || quotes.length === 0) return null

  const variants = {
    enter: (direction: number) => ({
      // If direction > 0 (Next), enter from Right (1000)
      // If direction < 0 (Prev), enter from Left (-1000)
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      // If direction > 0 (Next), exit to Left (-1000)
      // If direction < 0 (Prev), exit to Right (1000)
      x: direction > 0 ? -1000 : 1000,
      opacity: 0,
      scale: 0.95
    })
  }

  return (
    <div className={cn("relative h-40 w-full perspective-1000", className)}>
      {!isMounted ? (
        // Static Render for SSR/Hydration
        <div className="absolute inset-0 w-full h-full">
          <CardContent 
            quote={currentQuote} 
            index={currentIndex} 
            total={quotes.length} 
            likedIds={likedIds} 
            onLike={handleLike} 
            onNext={() => paginate(1)}
            onPrev={() => paginate(-1)}
          />
        </div>
      ) : (
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full"
          >
            <CardContent 
              quote={currentQuote} 
              index={currentIndex} 
              total={quotes.length} 
              likedIds={likedIds} 
              onLike={handleLike} 
              onNext={() => paginate(1)}
              onPrev={() => paginate(-1)}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

// Card Content Component moved outside to avoid re-creation on render
const CardContent = ({ 
  quote, 
  index, 
  total, 
  likedIds, 
  onLike,
  onNext,
  onPrev
}: { 
  quote: Quote, 
  index: number, 
  total: number, 
  likedIds: Set<number>, 
  onLike: (e: React.MouseEvent) => void,
  onNext: () => void,
  onPrev: () => void
}) => (
  <div className="w-full h-full bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-center relative overflow-hidden group select-none">
    {/* Decorative Quote Icon */}
    <div className="absolute top-3 left-3 text-blue-100 dark:text-blue-900/30">
      <QuoteIcon size={32} fill="currentColor" />
    </div>

    {/* Like Button */}
    <button 
      onClick={onLike}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-30"
    >
      <Heart 
        size={20} 
        className={cn("transition-colors", likedIds.has(quote.id) ? "fill-red-500 text-red-500" : "text-gray-400 dark:text-gray-500")}
      />
    </button>

    {/* Content */}
    <div className="relative z-10 text-center space-y-2 px-4 pb-1">
      <p className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-100 leading-relaxed font-serif italic line-clamp-2">
        &quot;{quote.text}&quot;
      </p>
      
      <div className="flex items-center justify-center gap-2">
        <div className="h-px w-6 bg-blue-500/30"></div>
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {quote.author}
        </p>
        <div className="h-px w-6 bg-blue-500/30"></div>
      </div>
    </div>

    {/* Navigation Hints (Visible on Hover/Touch) */}
    <button 
      onClick={(e) => { e.stopPropagation(); onPrev(); }}
      className="absolute inset-y-0 left-0 w-12 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gradient-to-r hover:from-black/5 hover:to-transparent outline-none"
    >
      <ChevronLeft className="text-gray-400 dark:text-gray-500" />
    </button>
    <button 
      onClick={(e) => { e.stopPropagation(); onNext(); }}
      className="absolute inset-y-0 right-0 w-12 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gradient-to-l hover:from-black/5 hover:to-transparent outline-none"
    >
      <ChevronRight className="text-gray-400 dark:text-gray-500" />
    </button>

    {/* Category Badge */}
    <div className="absolute bottom-3 right-4">
      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
        {quote.category}
      </span>
    </div>
    
    {/* Counter */}
     <div className="absolute bottom-3 left-4">
      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
        {index + 1} / {total}
      </span>
    </div>
  </div>
)
