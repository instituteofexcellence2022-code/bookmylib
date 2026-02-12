import { useEffect, useRef, useState } from 'react'

export function useCooldown(defaultSeconds = 0) {
  const [seconds, setSeconds] = useState(defaultSeconds)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (seconds <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    if (!timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              window.clearInterval(timerRef.current)
              timerRef.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [seconds])

  const start = (value = 30) => {
    setSeconds(value)
  }

  const reset = () => {
    setSeconds(0)
  }

  const startIfRateLimited = (message?: string) => {
    if (message && message.includes('Too many attempts')) {
      start(30)
    }
  }

  const disabled = seconds > 0
  const tooltip = disabled ? `Please wait ${seconds}s` : undefined

  return { seconds, start, reset, startIfRateLimited, disabled, tooltip }
}
