const TINTS = [
  'var(--color-tint-0)',
  'var(--color-tint-1)',
  'var(--color-tint-2)',
  'var(--color-tint-3)',
  'var(--color-tint-4)',
  'var(--color-tint-5)',
  'var(--color-tint-6)',
  'var(--color-tint-7)',
  'var(--color-tint-8)',
  'var(--color-tint-9)',
]

export function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function tintFor(index: number) {
  return TINTS[index % TINTS.length]
}
