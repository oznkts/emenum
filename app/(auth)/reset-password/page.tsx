'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Check for error in URL params (from Supabase redirect)
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || 'Sifre sifirlama baglantisi gecersiz veya suresi dolmus.')
        setIsValidSession(false)
        return
      }

      // User should have a session from the recovery link
      setIsValidSession(!!session)

      if (!session) {
        setError('Sifre sifirlama baglantisi gecersiz veya suresi dolmus. Lutfen yeni bir baglanti isteyin.')
      }
    }

    checkSession()
  }, [searchParams])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validate passwords
    if (password.length < 6) {
      setError('Sifre en az 6 karakter olmalidir')
      return
    }

    if (password !== passwordConfirm) {
      setError('Sifreler eslesmiyor')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        if (updateError.message.includes('same as')) {
          setError('Yeni sifreniz eski sifrenizle ayni olamaz')
        } else if (updateError.message.includes('weak')) {
          setError('Sifreniz cok zayif. Lutfen daha guclu bir sifre secin.')
        } else {
          setError(updateError.message)
        }
        return
      }

      setSuccess(true)

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 3000)
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <Card shadow="lg">
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="ml-3 text-secondary-600 dark:text-secondary-400">
              Dogrulanıyor...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (success) {
    return (
      <Card shadow="lg">
        <CardHeader
          title="Sifre Degistirildi"
          subtitle="Yeni sifreniz basariyla kaydedildi"
        />
        <CardContent>
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
                  Sifreniz basariyla degistirildi. Birka&ccedil; saniye i&ccedil;inde dashboard sayfasina yonlendirileceksiniz.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter align="center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Dashboard&apos;a git
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <Card shadow="lg">
        <CardHeader
          title="Gecersiz Baglanti"
          subtitle="Sifre sifirlama baglantisi kullanilabilir degil"
        />
        <CardContent>
          <div className="space-y-4">
            <div
              className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              role="alert"
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Baglanti Gecersiz</p>
                  <p className="mt-1">
                    {error || 'Sifre sifirlama baglantisinin suresi dolmus veya baglanti gecersiz.'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Lutfen yeni bir sifre sifirlama baglantisi isteyin.
            </p>
          </div>
        </CardContent>
        <CardFooter align="between">
          <Link
            href="/login"
            className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
          >
            Giris sayfasina don
          </Link>
          <Link href="/password-recovery">
            <Button>Yeni Baglanti Iste</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Normal form state
  return (
    <Card shadow="lg">
      <CardHeader
        title="Yeni Sifre Belirleyin"
        subtitle="Hesabiniz icin yeni bir sifre olusturun"
      />
      <form onSubmit={handleSubmit}>
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

            <Input
              label="Yeni Sifre"
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              disabled={isLoading}
              helperText="En az 6 karakter olmalidir"
            />

            <Input
              label="Yeni Sifre Tekrar"
              type="password"
              placeholder="Sifrenizi tekrar girin"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter align="between">
          <Link
            href="/login"
            className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
          >
            Giris sayfasina don
          </Link>
          <Button type="submit" isLoading={isLoading}>
            Sifreyi Degistir
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
