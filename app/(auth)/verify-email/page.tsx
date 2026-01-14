'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const email = searchParams?.get('email')
  const token = searchParams?.get('token')
  const type = searchParams?.get('type')

  const handleEmailConfirmation = useCallback(async () => {
    if (!token) return

    try {
      const supabase = createClient()

      // Exchange the token for a session
      const { error: confirmError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      })

      if (confirmError) {
        setStatus('error')
        if (confirmError.message.includes('expired')) {
          setError('Dogrulama baglantisinin suresi dolmus. Lutfen yeni bir baglanti isteyin.')
        } else if (confirmError.message.includes('already')) {
          setError('Bu e-posta adresi zaten dogrulanmis.')
          setStatus('success')
        } else {
          setError(confirmError.message)
        }
        return
      }

      setStatus('success')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch {
      setStatus('error')
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    }
  }, [token, router])

  useEffect(() => {
    // If there's a token and type in URL, this is a confirmation callback
    if (token && type === 'signup') {
      handleEmailConfirmation()
    }
  }, [token, type, handleEmailConfirmation])

  const handleResendVerification = async () => {
    if (!email) {
      setError('E-posta adresi bulunamadi. Lutfen tekrar kayit olun.')
      return
    }

    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (resendError) {
        if (resendError.message.includes('rate limit')) {
          setError('Cok fazla deneme yaptiniz. Lutfen bir sure bekleyin.')
        } else {
          setError(resendError.message)
        }
        return
      }

      setResendSuccess(true)
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsResending(false)
    }
  }

  // Success state - email verified
  if (status === 'success') {
    return (
      <Card shadow="lg">
        <CardHeader
          title="E-posta Dogrulandi"
          subtitle="Hesabiniz basariyla olusturuldu"
        />
        <CardContent>
          <div className="space-y-4">
            <div
              className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              role="status"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Basarili!</p>
                  <p className="mt-1">
                    E-posta adresiniz dogrulandi. Kontrol paneline yonlendiriliyorsunuz...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter align="center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Kontrol paneline git
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Error state
  if (status === 'error' && !email) {
    return (
      <Card shadow="lg">
        <CardHeader
          title="Dogrulama Hatasi"
          subtitle="E-posta dogrulamasinda bir sorun olustu"
        />
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter align="center">
          <Link
            href="/register"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Yeniden kayit olun
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Default state - waiting for verification
  return (
    <Card shadow="lg">
      <CardHeader
        title="E-posta Dogrulamasi"
        subtitle="E-posta adresinizi dogrulamaniz gerekiyor"
      />
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div
              className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          {resendSuccess && (
            <div
              className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              role="status"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium">E-posta gonderildi!</p>
                  <p className="mt-1">
                    Yeni dogrulama e-postasi gonderildi. Lutfen gelen kutunuzu kontrol edin.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
            role="status"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="font-medium">E-postanizi kontrol edin</p>
                <p className="mt-1">
                  {email ? (
                    <>
                      <strong>{email}</strong> adresine bir dogrulama e-postasi gonderdik.
                      Hesabinizi aktif etmek icin e-postadaki baglantiya tiklayin.
                    </>
                  ) : (
                    <>
                      Kayit oldugunuzda girdiginiz e-posta adresine bir dogrulama baglantisi gonderdik.
                      Hesabinizi aktif etmek icin e-postadaki baglantiya tiklayin.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-secondary-600 dark:text-secondary-400 space-y-2">
            <p>E-posta birka&ccedil; dakika i&ccedil;inde ulasmazsa:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Spam/istenmeyen posta klasorunuzu kontrol edin</li>
              <li>E-posta adresini dogru girdiginizden emin olun</li>
              <li>Asagidaki butona tiklayarak yeni bir e-posta isteyin</li>
            </ul>
          </div>

          {email && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendVerification}
              isLoading={isResending}
            >
              Dogrulama E-postasini Tekrar Gonder
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter align="between">
        <Link
          href="/register"
          className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
        >
          Farkli e-posta ile kayit ol
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
        >
          Giris sayfasina don
        </Link>
      </CardFooter>
    </Card>
  )
}
