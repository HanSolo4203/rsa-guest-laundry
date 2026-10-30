'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
  'h-16 min-h-16 rounded-xl border-2 border-neutral-950 bg-white px-4 text-[22px] text-neutral-950 shadow-none placeholder:text-neutral-600 md:text-[22px]'

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
    <Card className="w-full max-w-xl border-2 border-neutral-950 bg-white text-neutral-950 shadow-none">
      <CardHeader className="gap-3">
        <CardTitle className="text-4xl font-semibold text-neutral-950">
          Set up this tablet
        </CardTitle>
        <CardDescription className="text-[22px] leading-snug text-neutral-800">
          Sign in once with the kiosk device account. Staff will use a PIN after that.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="min-h-16 text-[22px] text-neutral-950">
                    Email
                  </FormLabel>
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
                  <FormMessage className="text-[22px] text-red-800" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="min-h-16 text-[22px] text-neutral-950">
                    Password
                  </FormLabel>
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
                  <FormMessage className="text-[22px] text-red-800" />
                </FormItem>
              )}
            />
            {formError ? (
              <p role="alert" className="text-[22px] font-medium text-red-800">
                {formError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-16 min-h-16 w-full rounded-xl bg-neutral-950 text-[22px] text-white hover:bg-neutral-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-6 animate-spin" />
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
