'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Gecersiz e-posta veya sifre')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('E-posta adresiniz dogrulanmamis. Lutfen gelen kutunuzu kontrol edin.')
        } else {
          setError(signInError.message)
        }
        return
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card shadow="lg">
      <CardHeader
        title="Giris Yap"
        subtitle="Hesabiniza giris yaparak devam edin"
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

            <Input
              label="Sifre"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
              disabled={isLoading}
            />

            <div className="flex items-center justify-end">
              <Link
                href="/password-recovery"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Sifremi unuttum
              </Link>
            </div>
          </div>
        </CardContent>
        <CardFooter align="between">
          <Link
            href="/register"
            className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
          >
            Hesabiniz yok mu? <span className="font-medium text-primary-600 dark:text-primary-400">Kayit Olun</span>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            Giris Yap
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
