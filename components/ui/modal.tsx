'use client'

import {
  forwardRef,
  useEffect,
  useCallback,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal title */
  title?: ReactNode
  /** Modal description */
  description?: ReactNode
  /** Modal content */
  children: ReactNode
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether clicking outside closes the modal */
  closeOnOverlayClick?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Footer content (typically buttons) */
  footer?: ReactNode
}

export interface ModalHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Modal title */
  title?: ReactNode
  /** Modal description */
  description?: ReactNode
  /** Show close button */
  showCloseButton?: boolean
  /** Close handler for the close button */
  onClose?: () => void
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
}

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/**
 * Modal component for dialogs, confirmations, and forms.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Urunu Sil"
 *   description="Bu islemi geri alamazsiniz."
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setIsOpen(false)}>Iptal</Button>
 *       <Button variant="danger" onClick={handleDelete}>Sil</Button>
 *     </>
 *   }
 * >
 *   <p>Bu urunu silmek istediginizden emin misiniz?</p>
 * </Modal>
 * ```
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = 'md',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      footer,
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<Element | null>(null)

    // Handle escape key
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (closeOnEscape && event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      },
      [closeOnEscape, onClose]
    )

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose()
        }
      },
      [closeOnOverlayClick, onClose]
    )

    // Focus trap and body scroll lock
    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement
        document.body.style.overflow = 'hidden'

        // Focus the modal container
        setTimeout(() => {
          modalRef.current?.focus()
        }, 0)

        return () => {
          document.body.style.overflow = ''
          // Restore focus to previously focused element
          if (previousActiveElement.current instanceof HTMLElement) {
            previousActiveElement.current.focus()
          }
        }
      }
    }, [isOpen])

    if (!isOpen) return null

    // Use portal to render at document body level
    const modalContent = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="presentation"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={handleOverlayClick}
        />

        {/* Modal */}
        <div
          ref={(node) => {
            modalRef.current = node
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`
            relative z-10 w-full
            bg-white dark:bg-secondary-800
            rounded-xl shadow-xl
            overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-200
            ${sizeStyles[size]}
          `.trim().replace(/\s+/g, ' ')}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-4 py-4 sm:px-6 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-secondary-900 dark:text-secondary-100"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 text-sm text-secondary-500 dark:text-secondary-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    shrink-0 p-1.5 -m-1.5
                    text-secondary-400 hover:text-secondary-600
                    dark:text-secondary-500 dark:hover:text-secondary-300
                    rounded-lg transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                  "
                  aria-label="Kapat"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-4 sm:px-6 max-h-[60vh] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    )

    // Render to document.body using portal
    if (typeof window !== 'undefined') {
      return createPortal(modalContent, document.body)
    }

    return null
  }
)

Modal.displayName = 'Modal'

/**
 * Confirmation modal for destructive actions.
 */
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'Iptal',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500',
    info: 'bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="
              px-4 py-2 text-sm font-medium
              text-secondary-700 dark:text-secondary-300
              bg-transparent hover:bg-secondary-100 dark:hover:bg-secondary-700
              rounded-lg transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium
              text-white rounded-lg transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${variantStyles[variant]}
            `.trim().replace(/\s+/g, ' ')}
          >
            {isLoading ? 'Yukleniyor...' : confirmText}
          </button>
        </>
      }
    >
      <div className="text-secondary-600 dark:text-secondary-400">
        Bu islemi geri alamazsiniz.
      </div>
    </Modal>
  )
}

export default Modal
