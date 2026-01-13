'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        if (resetError.message.includes('rate limit')) {
          setError('Cok fazla deneme yaptiniz. Lutfen bir sure bekleyin.')
        } else {
          setError(resetError.message)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card shadow="lg">
        <CardHeader
          title="E-posta Gonderildi"
          subtitle="Sifre sifirlama baglantisi e-posta adresinize gonderildi"
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
                    <strong>{email}</strong> adresine sifre sifirlama baglantisi gonderdik.
                    Lutfen gelen kutunuzu kontrol edin.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-secondary-600 dark:text-secondary-400 space-y-2">
              <p>E-posta birka&ccedil; dakika i&ccedil;inde ulasmazsa:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Spam/istenmeyen posta klasorunuzu kontrol edin</li>
                <li>E-posta adresini dogru girdiginizden emin olun</li>
                <li>Birkac dakika bekleyip tekrar deneyin</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter align="center">
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

  return (
    <Card shadow="lg">
      <CardHeader
        title="Sifremi Unuttum"
        subtitle="E-posta adresinizi girin, size sifre sifirlama baglantisi gonderelim"
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
              label="E-posta"
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
            Sifirlama Baglantisi Gonder
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
