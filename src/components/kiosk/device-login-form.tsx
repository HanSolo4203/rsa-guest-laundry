'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { KioskWordmark } from '@/components/kiosk/kiosk-ui'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'

const deviceLoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type DeviceLoginValues = z.infer<typeof deviceLoginSchema>

const fieldClass =
  'h-12 min-h-12 rounded-lg border-neutral-200 bg-white px-3 text-base text-neutral-950 shadow-none placeholder:text-neutral-400 md:h-14 md:text-lg'

export function DeviceLoginForm() {
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DeviceLoginValues>({
    resolver: zodResolver(deviceLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: DeviceLoginValues) => {
    setFormError(null)
    setIsSubmitting(true)
    try {
      const { error } = await signIn(values.email, values.password)
      if (error) {
        setFormError(error.message || 'Could not sign in')
      }
    } catch {
      setFormError('Could not sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm gap-4 border-neutral-200 bg-white py-6 text-neutral-950 shadow-sm">
      <CardHeader className="gap-2 px-5">
        <KioskWordmark />
        <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
          Set up this tablet
        </CardTitle>
        <CardDescription className="text-base leading-snug text-neutral-500 md:text-lg">
          Sign in once with the kiosk device account. Staff will use a PIN after that.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base text-neutral-800 md:text-lg">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="kiosk@example.com"
                      className={fieldClass}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-700" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base text-neutral-800 md:text-lg">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Device password"
                      className={fieldClass}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-700" />
                </FormItem>
              )}
            />
            {formError ? (
              <p role="alert" className="text-base font-medium text-red-700 md:text-lg">
                {formError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 min-h-12 w-full rounded-xl bg-neutral-950 text-base text-white hover:bg-neutral-800 md:h-16 md:text-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
