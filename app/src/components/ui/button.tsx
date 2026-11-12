import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13px] font-medium transition-[background-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-ink text-[#F4F3EF] border border-ink shadow-[var(--shadow-sm)] hover:bg-[#2C3035] hover:shadow-[var(--shadow-md)]',
        secondary:
          'bg-surface text-ink border border-border hover:bg-[#EFEDE6] hover:border-[#D7D4C9]',
        ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-sunken border-none',
      },
      size: {
        default: 'px-4 py-[9px]',
        sm: 'px-[9px] py-[4px] text-[11px] font-mono',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
