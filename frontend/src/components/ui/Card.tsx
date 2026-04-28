import type { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('bg-white rounded border border-tfa-gray-200 shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('px-5 py-4 border-b border-tfa-gray-200', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}
