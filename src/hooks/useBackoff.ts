import { useRef, useState } from 'react'

export function useBackoff(baseMs = 1000, maxMs = 15000) {
  const attemptRef = useRef(0)
  const [attempt, setAttempt] = useState(0)

  const computeDelay = () => {
    const cap = Math.min(maxMs, baseMs * Math.pow(2, attemptRef.current))
    const jitter = Math.floor(Math.random() * cap)
    return jitter
  }

  const nextDelay = () => {
    const d = computeDelay()
    attemptRef.current += 1
    setAttempt(attemptRef.current)
    return d
  }

  const schedule = (fn: () => void) => {
    const d = nextDelay()
    window.setTimeout(fn, d)
    return d
  }

  const reset = () => {
    attemptRef.current = 0
    setAttempt(0)
  }

  return { attempt, nextDelay, schedule, reset }
}
