'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type RegistrationStep = 'account' | 'restaurant'

interface FormData {
  email: string
  password: string
  passwordConfirm: string
  restaurantName: string
  restaurantSlug: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<RegistrationStep>('account')
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    restaurantName: '',
    restaurantSlug: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-generate slug from restaurant name if not manually edited
      if (field === 'restaurantName' && !slugEdited) {
        updated.restaurantSlug = slugify(value)
      }

      return updated
    })
  }

  const handleSlugChange = (value: string) => {
    setSlugEdited(true)
    setFormData((prev) => ({ ...prev, restaurantSlug: slugify(value) }))
  }

  const validateAccountStep = (): boolean => {
    if (!formData.email || !formData.password || !formData.passwordConfirm) {
      setError('Lutfen tum alanlari doldurun')
      return false
    }

    if (formData.password.length < 6) {
      setError('Sifre en az 6 karakter olmalidir')
      return false
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Sifreler eslesmiyor')
      return false
    }

    return true
  }

  const validateRestaurantStep = (): boolean => {
    if (!formData.restaurantName || !formData.restaurantSlug) {
      setError('Lutfen tum alanlari doldurun')
      return false
    }

    if (formData.restaurantSlug.length < 3) {
      setError('Menu linki en az 3 karakter olmalidir')
      return false
    }

    if (!/^[a-z0-9-]+$/.test(formData.restaurantSlug)) {
      setError('Menu linki sadece kucuk harf, rakam ve tire icermeli')
      return false
    }

    return true
  }

  const handleNextStep = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (validateAccountStep()) {
      setStep('restaurant')
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!validateRestaurantStep()) {
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Check if slug is already taken
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', formData.restaurantSlug)
        .single()

      if (existingOrg) {
        setError('Bu menu linki zaten kullaniliyor. Lutfen farkli bir link secin.')
        setIsLoading(false)
        return
      }

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            restaurant_name: formData.restaurantName,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Bu e-posta adresi zaten kayitli')
        } else if (signUpError.message.includes('invalid')) {
          setError('Gecersiz e-posta adresi')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (!authData.user) {
        setError('Kayit sirasinda bir hata olustu')
        return
      }

      // Create the organization
      const { error: orgError } = await supabase.from('organizations').insert({
        name: formData.restaurantName,
        slug: formData.restaurantSlug,
        is_active: false, // Will be activated by admin or after payment
      })

      if (orgError) {
        setError('Restoran olusturulurken bir hata olustu. Lutfen tekrar deneyin.')
        return
      }

      // Add user as organization owner
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', formData.restaurantSlug)
        .single()

      if (org) {
        await supabase.from('organization_members').insert({
          organization_id: org.id,
          user_id: authData.user.id,
          role: 'owner',
        })
      }

      // Redirect to verification page or dashboard
      router.push('/verify-email?email=' + encodeURIComponent(formData.email))
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card shadow="lg">
      <CardHeader
        title={step === 'account' ? 'Hesap Olusturun' : 'Restoran Bilgileri'}
        subtitle={
          step === 'account'
            ? 'Ucretsiz hesabinizi olusturun ve dijital menu yolculugunuza baslayin'
            : 'Restoraninizin temel bilgilerini girin'
        }
      />

      {step === 'account' ? (
        <form onSubmit={handleNextStep}>
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
                placeholder="ornek@restoran.com"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Sifre"
                type="password"
                placeholder="En az 6 karakter"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                helperText="En az 6 karakter olmalidir"
              />

              <Input
                label="Sifre Tekrar"
                type="password"
                placeholder="Sifrenizi tekrar girin"
                value={formData.passwordConfirm}
                onChange={(e) => updateFormData('passwordConfirm', e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter align="between">
            <Link
              href="/login"
              className="text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
            >
              Zaten hesabiniz var mi?{' '}
              <span className="font-medium text-primary-600 dark:text-primary-400">
                Giris Yapin
              </span>
            </Link>
            <Button type="submit">Devam Et</Button>
          </CardFooter>
        </form>
      ) : (
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

              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-medium">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="h-0.5 w-8 bg-primary-600" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-medium">
                  2
                </div>
                <span className="text-sm text-secondary-600 dark:text-secondary-400 ml-2">
                  Adim 2/2
                </span>
              </div>

              <Input
                label="Restoran Adi"
                type="text"
                placeholder="Ornek: Lezzet Cafe"
                value={formData.restaurantName}
                onChange={(e) => updateFormData('restaurantName', e.target.value)}
                required
                disabled={isLoading}
              />

              <div>
                <Input
                  label="Menu Linki"
                  type="text"
                  placeholder="lezzet-cafe"
                  value={formData.restaurantSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  disabled={isLoading}
                  helperText={
                    formData.restaurantSlug
                      ? `Menunuz su adreste yayinlanacak: menu/${formData.restaurantSlug}`
                      : 'Musterilerinizin QR kod ile ulasacagi link'
                  }
                  leftAddon={
                    <span className="text-xs text-secondary-400">menu/</span>
                  }
                />
              </div>

              {/* Features preview */}
              <div className="mt-6 p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-3">
                  Hesabinizla birlikte sunlar dahil:
                </h4>
                <ul className="space-y-2">
                  {[
                    'Sinirsiz QR kod olusturma',
                    'Mobil uyumlu dijital menu',
                    'Kolay urun ve kategori yonetimi',
                    'Gercek zamanli fiyat guncelleme',
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter align="between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null)
                setStep('account')
              }}
              disabled={isLoading}
            >
              Geri
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Kayit Ol
            </Button>
          </CardFooter>
        </form>
      )}

      {/* Terms */}
      <div className="px-4 pb-4 sm:px-6">
        <p className="text-center text-xs text-secondary-500 dark:text-secondary-400">
          Kayit olarak{' '}
          <Link
            href="/terms"
            className="underline hover:text-primary-600 dark:hover:text-primary-400"
          >
            Kullanim Sartlari
          </Link>
          {' '}ve{' '}
          <Link
            href="/privacy"
            className="underline hover:text-primary-600 dark:hover:text-primary-400"
          >
            Gizlilik Politikasi
          </Link>
          {`'ni kabul etmis sayilirsiniz.`}
        </p>
      </div>
    </Card>
  )
}
