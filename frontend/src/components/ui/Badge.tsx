import type { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-tfa-gray-100 text-tfa-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error:   'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'submitted': return 'success'
    case 'draft':     return 'warning'
    case 'reopened':  return 'info'
    default:          return 'default'
  }
}
