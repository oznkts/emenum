import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Whether to show border */
  bordered?: boolean
  /** Whether to show shadow */
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  /** Whether card is clickable/interactive */
  interactive?: boolean
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Card title */
  title?: ReactNode
  /** Card subtitle or description */
  subtitle?: ReactNode
  /** Action element (button, menu, etc.) */
  action?: ReactNode
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Align footer content */
  align?: 'left' | 'center' | 'right' | 'between'
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

const alignStyles = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
}

/**
 * Card component for grouping related content.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader title="Urun Bilgileri" subtitle="Urun detaylarini duzenleyin" />
 *   <CardContent>
 *     <p>Icerik burada...</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Kaydet</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'none',
      bordered = true,
      shadow = 'sm',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          bg-white dark:bg-secondary-800
          rounded-xl overflow-hidden
          ${bordered ? 'border border-secondary-200 dark:border-secondary-700' : ''}
          ${shadowStyles[shadow]}
          ${paddingStyles[padding]}
          ${interactive ? 'transition-shadow duration-150 hover:shadow-md cursor-pointer' : ''}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

/**
 * Card header with title, subtitle, and optional action.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-start justify-between gap-4
          px-4 py-3 sm:px-6 sm:py-4
          border-b border-secondary-200 dark:border-secondary-700
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        <div className="min-w-0 flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm text-secondary-500 dark:text-secondary-400">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

/**
 * Card content area with standard padding.
 */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-4 sm:px-6 ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

/**
 * Card footer for actions.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, align = 'right', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-3
          px-4 py-3 sm:px-6 sm:py-4
          bg-secondary-50 dark:bg-secondary-900/50
          border-t border-secondary-200 dark:border-secondary-700
          ${alignStyles[align]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export default Card
