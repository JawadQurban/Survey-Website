import { forwardRef, type InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-tfa-gray-700">
            {label}
            {props.required && <span className="text-red-500 ms-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border px-3.5 py-2.5 text-sm text-tfa-gray-900',
            'placeholder:text-tfa-gray-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-tfa-navy focus:border-tfa-navy',
            error
              ? 'border-red-400 bg-red-50 focus:ring-red-400'
              : 'border-tfa-gray-300 bg-white hover:border-tfa-gray-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-tfa-gray-500">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
