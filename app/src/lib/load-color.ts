// Shared "how loaded is this" color rule: >1 over capacity, >0.88
// approaching it, else comfortable. Used for hours-against-budget and
// booked-vs-capacity bars alike.
export function loadColorFor(ratio: number) {
  if (ratio > 1) return 'var(--color-signal-red)'
  if (ratio > 0.88) return 'var(--color-signal-amber)'
  return 'var(--color-signal-green)'
}
