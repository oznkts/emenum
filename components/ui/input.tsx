'use client'

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Helper text displayed below the input */
  helperText?: string
  /** Error message - when present, input shows error state */
  error?: string
  /** Optional icon/element displayed at the start of the input */
  leftAddon?: ReactNode
  /** Optional icon/element displayed at the end of the input */
  rightAddon?: ReactNode
  /** Makes input full width */
  fullWidth?: boolean
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text displayed above the textarea */
  label?: string
  /** Helper text displayed below the textarea */
  helperText?: string
  /** Error message - when present, textarea shows error state */
  error?: string
  /** Makes textarea full width */
  fullWidth?: boolean
}

const baseInputStyles = `
  w-full rounded-lg border px-3 py-2
  text-secondary-900 placeholder:text-secondary-400
  transition-colors duration-150
  focus:outline-none focus:ring-2 focus:ring-offset-0
  disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary-50
  dark:text-secondary-100 dark:placeholder:text-secondary-500 dark:disabled:bg-secondary-900
`.trim().replace(/\s+/g, ' ')

const normalInputStyles = `
  border-secondary-300 bg-white
  hover:border-secondary-400
  focus:border-primary-500 focus:ring-primary-500/20
  dark:border-secondary-600 dark:bg-secondary-800 dark:hover:border-secondary-500
`.trim().replace(/\s+/g, ' ')

const errorInputStyles = `
  border-red-500 bg-red-50
  hover:border-red-600
  focus:border-red-500 focus:ring-red-500/20
  dark:border-red-500 dark:bg-red-900/20
`.trim().replace(/\s+/g, ' ')

/**
 * Input component with label, helper text, error state, and addons.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="ornek@email.com"
 *   helperText="Iletisim icin kullanilacaktir"
 * />
 *
 * <Input
 *   label="Sifre"
 *   type="password"
 *   error="Sifre en az 8 karakter olmalidir"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      fullWidth = true,
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = providedId || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const hasError = Boolean(error)
    const inputStyles = hasError ? errorInputStyles : normalInputStyles

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-secondary-500">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={
              [hasError && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
            }
            className={`
              ${baseInputStyles}
              ${inputStyles}
              ${leftAddon ? 'pl-10' : ''}
              ${rightAddon ? 'pr-10' : ''}
              ${className}
            `.trim().replace(/\s+/g, ' ')}
            {...props}
          />
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-500">
              {rightAddon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-secondary-500 dark:text-secondary-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

/**
 * Textarea component with label, helper text, and error state.
 *
 * @example
 * ```tsx
 * <Textarea
 *   label="Aciklama"
 *   placeholder="Urun aciklamasini girin..."
 *   rows={4}
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      className = '',
      id: providedId,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const textareaId = providedId || generatedId
    const errorId = `${textareaId}-error`
    const helperId = `${textareaId}-helper`

    const hasError = Boolean(error)
    const inputStyles = hasError ? errorInputStyles : normalInputStyles

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={
            [hasError && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined
          }
          className={`
            ${baseInputStyles}
            ${inputStyles}
            resize-y min-h-[80px]
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-secondary-500 dark:text-secondary-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Input
