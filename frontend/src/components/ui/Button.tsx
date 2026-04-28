import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClasses = {
  primary:
    'bg-tfa-navy text-white hover:bg-tfa-navy-dark focus:ring-tfa-navy disabled:bg-tfa-gray-400',
  secondary:
    'bg-white text-tfa-gray-700 border border-tfa-gray-300 hover:bg-tfa-gray-50 focus:ring-tfa-gray-400',
  ghost:
    'bg-transparent text-tfa-gray-600 hover:bg-tfa-gray-100 hover:text-tfa-gray-800 focus:ring-tfa-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
