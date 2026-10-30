'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, type Control, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GuestFormPreview, type GuestPreviewModel } from '@/components/dashboard/guest-form-preview'
import { PropertyAccess } from '@/components/dashboard/property-access'
import { PropertyLinkActions } from '@/components/dashboard/property-link-actions'
import { brandFallbackColors, brandFontChoices, isBrandFont } from '@/components/property-theme-provider'
import { buttonContrastWarning, hexForColorInput } from '@/lib/contrast'
import {
  PropertyUploadError,
  propertyAssetError,
  saveProperty,
  servicesForProperty,
  slugifyPropertyName,
  assetMediaKind,
  type PropertyAssetPurpose,
} from '@/lib/supabase/properties-admin'
import type { Property, PropertyBackgroundType, Service } from '@/lib/types/database'

const propertyFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(80, 'Slug must be 80 characters or fewer')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
  active: z.boolean(),
  background_type: z.enum(['image', 'video', 'none']),
  primary_color: hexColour(),
  accent_color: hexColour(),
  background_color: hexColour(),
  text_color: hexColour(),
  button_text_color: hexColour(),
  font: z.enum(['inter', 'playfair', 'poppins', 'dm-serif', 'space-grotesk']),
  heading: z.string().trim().min(1, 'Heading is required').max(120, 'Heading must be 120 characters or fewer'),
  welcome_message: z.string().max(500, 'Welcome message must be 500 characters or fewer'),
  contact_info: z.string().max(500, 'Contact info must be 500 characters or fewer'),
  ask_room_number: z.boolean(),
  service_ids: z.array(z.string()),
})

function hexColour() {
  return z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Use a hex colour such as #2B5F44')
}

type PropertyFormValues = z.infer<typeof propertyFormSchema>

const controlClass = 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400'

function formValues(property: Property | null, serviceIds: string[]): PropertyFormValues {
  const font = property?.font ?? ''
  return {
    name: property?.name ?? '',
    slug: property?.slug ?? '',
    active: property?.active ?? true,
    background_type: property?.background_type ?? 'none',
    primary_color: property?.primary_color || brandFallbackColors.primary,
    accent_color: property?.accent_color || brandFallbackColors.accent,
    background_color: property?.background_color || brandFallbackColors.background,
    text_color: property?.text_color || brandFallbackColors.text,
    button_text_color: property?.button_text_color || brandFallbackColors.buttonText,
    font: isBrandFont(font) ? font : 'inter',
    heading: property?.heading ?? 'Book Guest Laundry Service',
    welcome_message: property?.welcome_message ?? '',
    contact_info: property?.contact_info ?? '',
    ask_room_number: property?.ask_room_number ?? true,
    service_ids: serviceIds,
  }
}

export function PropertyEditor({
  property,
  serviceIds,
  services,
  initialTab = 'details',
  onCancel,
  onSaved,
  onShowPrices,
}: {
  property: Property | null
  serviceIds: string[]
  services: Service[]
  initialTab?: 'details' | 'access'
  onCancel: () => void
  onSaved: (property: Property) => void
  onShowPrices?: (property: Property) => void
}) {
  const slugTouched = useRef(Boolean(property))
  const servicesTouched = useRef(serviceIds.length > 0)
  const [submitting, setSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [clearBackground, setClearBackground] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: formValues(property, serviceIds),
  })

  const values = form.watch()

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  useEffect(() => {
    if (!backgroundFile) {
      setBackgroundPreview(null)
      return
    }
    const url = URL.createObjectURL(backgroundFile)
    setBackgroundPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [backgroundFile])

  useEffect(() => {
    if (property || servicesTouched.current || services.length === 0) return
    form.setValue('service_ids', services.map((service) => service.id))
  }, [form, property, services])

  function chooseFile(file: File | undefined, purpose: PropertyAssetPurpose) {
    if (!file) return
    const problem = propertyAssetError(file, purpose)
    if (problem) {
      toast.error(problem)
      return
    }
    if (purpose === 'logo') {
      setLogoFile(file)
      setClearLogo(false)
      return
    }
    setBackgroundFile(file)
    setClearBackground(false)
    form.setValue('background_type', assetMediaKind(file))
  }

  async function onSubmit(data: PropertyFormValues) {
    setSubmitting(true)
    try {
      const saved = await saveProperty({
        id: property?.id ?? null,
        values: data,
        serviceIds: data.service_ids,
        logoFile,
        backgroundFile,
        clearLogo,
        clearBackground,
        existingLogoUrl: property?.logo_url ?? null,
        existingBackgroundUrl: property?.background_url ?? null,
        existingBackgroundType: property?.background_type ?? 'none',
      })
      toast.success(property ? 'Property updated' : 'Property added')
      onSaved(saved)
    } catch (error) {
      console.error(error)
      if (error instanceof PropertyUploadError) {
        toast.error(error.message)
        onSaved(error.property)
        return
      }
      toast.error(error instanceof Error ? error.message : 'Could not save the property')
    } finally {
      setSubmitting(false)
    }
  }

  const contrastWarning = buttonContrastWarning(values.button_text_color, values.primary_color)
  const previewLogo = logoPreview ?? (clearLogo ? null : property?.logo_url ?? null)
  const previewBackground = backgroundPreview ?? (clearBackground ? null : property?.background_url ?? null)
  const preview: GuestPreviewModel = {
    name: values.name,
    logoUrl: previewLogo,
    backgroundUrl: previewBackground,
    backgroundType: values.background_type,
    primaryColor: values.primary_color,
    accentColor: values.accent_color,
    backgroundColor: values.background_color,
    textColor: values.text_color,
    buttonTextColor: values.button_text_color,
    font: values.font,
    heading: values.heading,
    welcomeMessage: values.welcome_message,
    contactInfo: values.contact_info,
    askRoomNumber: values.ask_room_number,
  }

  const details = (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{property ? 'Edit property' : 'Add property'}</h2>
              <p className="mt-1 text-sm text-gray-400">Branding, guest booking link, and portal link for this property.</p>
            </div>
            {property ? (
              <PropertyLinkActions slug={values.slug} savedSlug={property.slug} />
            ) : (
              <p className="max-w-xs text-sm text-gray-400">Save the property to copy its booking link and portal link.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="name"
              label="Name"
              onValueChange={(value) => {
                if (!slugTouched.current) {
                  form.setValue('slug', slugifyPropertyName(value), { shouldValidate: form.formState.isSubmitted })
                }
              }}
            />
            <TextField
              control={form.control}
              name="slug"
              label="Slug"
              hint="Used in the guest link and this property's portal link, /portal/your-slug."
              onValueChange={() => {
                slugTouched.current = true
              }}
            />
          </div>

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 px-3 py-3">
                <div>
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-gray-400">Inactive properties are hidden from guests.</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AssetField
              label="Logo"
              accept="image/jpeg,image/png,image/webp,image/gif"
              file={logoFile}
              hasExisting={Boolean(property?.logo_url) && !clearLogo}
              onChoose={(file) => chooseFile(file, 'logo')}
              onClear={() => {
                setLogoFile(null)
                setClearLogo(true)
              }}
            />
            <AssetField
              label="Background"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              file={backgroundFile}
              hasExisting={Boolean(property?.background_url) && !clearBackground}
              detail={backgroundLabel(values.background_type, backgroundFile, clearBackground, Boolean(property?.background_url))}
              onChoose={(file) => chooseFile(file, 'background')}
              onClear={() => {
                setBackgroundFile(null)
                setClearBackground(true)
                form.setValue('background_type', 'none')
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColourField control={form.control} name="primary_color" label="Primary colour" />
            <ColourField control={form.control} name="accent_color" label="Accent colour" />
            <ColourField control={form.control} name="background_color" label="Background colour" />
            <ColourField control={form.control} name="text_color" label="Text colour" />
            <div>
              <ColourField control={form.control} name="button_text_color" label="Button text colour" />
              {contrastWarning ? (
                <p className="mt-2 text-sm" style={{ color: '#fbbf24' }} role="status">
                  {contrastWarning}
                </p>
              ) : null}
            </div>
            <FormField
              control={form.control}
              name="font"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={`w-full ${controlClass}`}>
                        <SelectValue placeholder="Choose a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-gray-700 bg-gray-800 text-white">
                      {brandFontChoices.map((choice) => (
                        <SelectItem key={choice.value} value={choice.value}>
                          {choice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage style={{ color: '#fca5a5' }} />
                </FormItem>
              )}
            />
          </div>

          <TextField control={form.control} name="heading" label="Heading" />
          <TextAreaField control={form.control} name="welcome_message" label="Welcome message" />
          <TextAreaField control={form.control} name="contact_info" label="Contact info" />

          <FormField
            control={form.control}
            name="ask_room_number"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 px-3 py-3">
                <div>
                  <FormLabel>Ask for room number</FormLabel>
                  <p className="text-sm text-gray-400">Guests can enter a room when this is on.</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services</FormLabel>
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-700 p-3">
                  {services.length === 0 ? (
                    <p className="text-sm text-gray-400">No services yet. Add services before offering them here.</p>
                  ) : (
                    services.map((service) => {
                      const checked = field.value.includes(service.id)
                      return (
                        <label key={service.id} className="flex items-center gap-3 text-sm text-gray-200">
                          <input
                            type="checkbox"
                            className="size-4 accent-purple-500"
                            checked={checked}
                            onChange={() => {
                              servicesTouched.current = true
                              const next = checked
                                ? field.value.filter((id) => id !== service.id)
                                : [...field.value, service.id]
                              field.onChange(next)
                            }}
                          />
                          <span>{service.name}</span>
                          <span className="text-gray-400">{service.price}</span>
                        </label>
                      )
                    })
                  )}
                </div>
                <FormMessage style={{ color: '#fca5a5' }} />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting} className="bg-purple-600 text-white hover:bg-purple-700">
              {submitting ? 'Saving…' : property ? 'Save changes' : 'Add property'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-200 hover:bg-gray-700">
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <div className="xl:sticky xl:top-6">
        <h2 className="mb-3 text-sm font-medium text-gray-300">Guest form preview</h2>
        {contrastWarning ? (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" style={{ color: '#fbbf24' }} role="status">
            {contrastWarning}
          </p>
        ) : null}
        <GuestFormPreview property={preview} services={servicesForProperty(services, values.service_ids)} />
      </div>
    </div>
  )

  if (!property) return details

  return (
    <Tabs defaultValue={initialTab} className="gap-4">
      <TabsList className="bg-gray-800 text-gray-300">
        <TabsTrigger value="details" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
          Details
        </TabsTrigger>
        <TabsTrigger value="access" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
          Access
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details">{details}</TabsContent>
      <TabsContent value="access">
        <PropertyAccess property={property} onShowPrices={onShowPrices} />
      </TabsContent>
    </Tabs>
  )
}

function backgroundLabel(
  type: PropertyBackgroundType,
  file: File | null,
  cleared: boolean,
  hasExisting: boolean
): string {
  if (file) return assetMediaKind(file) === 'video' ? 'Video selected' : 'Image selected'
  if (cleared || !hasExisting) return 'No background'
  if (type === 'video') return 'Current background is a video'
  if (type === 'image') return 'Current background is an image'
  return 'No background'
}

function TextField({
  control,
  name,
  label,
  hint,
  onValueChange,
}: {
  control: Control<PropertyFormValues>
  name: 'name' | 'slug' | 'heading'
  label: string
  hint?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              onChange={(event) => {
                const next = name === 'slug' ? event.target.value.toLowerCase() : event.target.value
                field.onChange(next)
                onValueChange?.(next)
              }}
              className={controlClass}
            />
          </FormControl>
          {hint ? <p className="text-sm text-gray-400">{hint}</p> : null}
          <FormMessage style={{ color: '#fca5a5' }} />
        </FormItem>
      )}
    />
  )
}

function TextAreaField({
  control,
  name,
  label,
}: {
  control: Control<PropertyFormValues>
  name: 'welcome_message' | 'contact_info'
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <textarea
              {...field}
              rows={3}
              className={`min-h-24 w-full rounded-md border px-3 py-2 text-sm ${controlClass}`}
            />
          </FormControl>
          <FormMessage style={{ color: '#fca5a5' }} />
        </FormItem>
      )}
    />
  )
}

function ColourField({
  control,
  name,
  label,
}: {
  control: Control<PropertyFormValues>
  name: FieldPath<PropertyFormValues>
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={label}
              value={hexForColorInput(typeof field.value === 'string' ? field.value : '#000000')}
              onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              className="h-9 w-12 cursor-pointer rounded border border-gray-600 bg-gray-700 p-1"
            />
            <FormControl>
              <Input
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                className={controlClass}
              />
            </FormControl>
          </div>
          <FormMessage style={{ color: '#fca5a5' }} />
        </FormItem>
      )}
    />
  )
}

function AssetField({
  label,
  accept,
  file,
  hasExisting,
  detail,
  onChoose,
  onClear,
}: {
  label: string
  accept: string
  file: File | null
  hasExisting: boolean
  detail?: string
  onChoose: (file: File | undefined) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <input
        type="file"
        accept={accept}
        className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-gray-700 file:px-3 file:py-2 file:text-sm file:text-white"
        onChange={(event) => {
          onChoose(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <p className="text-xs text-gray-400">{detail ?? (file ? file.name : hasExisting ? 'Current file kept' : 'No file')}</p>
      {file || hasExisting ? (
        <Button type="button" variant="outline" size="sm" onClick={onClear} className="border-gray-600 text-gray-200 hover:bg-gray-700">
          Remove {label.toLowerCase()}
        </Button>
      ) : null}
    </div>
  )
}
