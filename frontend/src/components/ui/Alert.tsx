import type { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
}

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-lg border px-4 py-3 text-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {title && <p className="font-semibold mb-1">{title}</p>}
      <div>{children}</div>
    </div>
  )
}
