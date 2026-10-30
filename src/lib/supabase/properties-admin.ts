import { createClient } from '@/lib/supabase/client'
import type { Property, PropertyBackgroundType, Service } from '@/lib/types/database'

const ASSET_LIMIT = 52_428_800

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

export type PropertyAssetPurpose = 'logo' | 'background'

export type PropertySaveValues = {
  name: string
  slug: string
  active: boolean
  background_type: PropertyBackgroundType
  primary_color: string
  accent_color: string
  background_color: string
  text_color: string
  button_text_color: string
  font: string
  heading: string
  welcome_message: string
  contact_info: string
  ask_room_number: boolean
}

export type SavePropertyInput = {
  id: string | null
  values: PropertySaveValues
  serviceIds: string[]
  logoFile: File | null
  backgroundFile: File | null
  clearLogo: boolean
  clearBackground: boolean
  existingLogoUrl: string | null
  existingBackgroundUrl: string | null
  existingBackgroundType: PropertyBackgroundType
}

export class PropertyUploadError extends Error {
  property: Property

  constructor(message: string, property: Property) {
    super(message)
    this.name = 'PropertyUploadError'
    this.property = property
  }
}

export function slugifyPropertyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function mimeOf(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension ? MIME_BY_EXT[extension] ?? '' : ''
}

export function propertyAssetError(file: File, purpose: PropertyAssetPurpose): string | null {
  if (file.size > ASSET_LIMIT) return 'File must be 50 MB or smaller.'
  const mime = mimeOf(file)
  const isImage = mime.startsWith('image/') && mime in EXT_BY_MIME
  const isVideo = mime === 'video/mp4' || mime === 'video/webm'
  if (purpose === 'logo' && !isImage) return 'Logo must be a JPEG, PNG, WebP, or GIF.'
  if (purpose === 'background' && !isImage && !isVideo) {
    return 'Background must be a JPEG, PNG, WebP, GIF, MP4, or WebM.'
  }
  return null
}

function backgroundTypeFor(file: File): 'image' | 'video' {
  const mime = mimeOf(file)
  return mime === 'video/mp4' || mime === 'video/webm' ? 'video' : 'image'
}

export function assetMediaKind(file: File): 'image' | 'video' {
  return backgroundTypeFor(file)
}

function errorMessage(error: { message?: string; code?: string }, fallback: string): string {
  if (error.code === '23505') return 'That slug is already used. Choose another.'
  return error.message || fallback
}

export async function listProperties(): Promise<Property[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('properties').select('*').order('name')
  if (error) throw new Error(errorMessage(error, 'Could not load properties'))
  return (data ?? []) as Property[]
}

export async function listPropertyServiceIds(propertyId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_services')
    .select('service_id')
    .eq('property_id', propertyId)
  if (error) throw new Error(errorMessage(error, 'Could not load services for this property'))
  return (data ?? []).map((row: { service_id: string }) => row.service_id)
}

async function uploadPropertyAsset(propertyId: string, file: File, purpose: PropertyAssetPurpose): Promise<string> {
  const problem = propertyAssetError(file, purpose)
  if (problem) throw new Error(problem)

  const mime = mimeOf(file)
  const extension = EXT_BY_MIME[mime]
  const path = `${propertyId}/${purpose}-${crypto.randomUUID()}.${extension}`
  const supabase = createClient()
  const { error } = await supabase.storage.from('property-assets').upload(path, file, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw new Error(`Could not upload the ${purpose}. ${error.message}`)

  const { data } = supabase.storage.from('property-assets').getPublicUrl(path)
  return data.publicUrl
}

async function setPropertyServices(propertyId: string, serviceIds: string[]) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_services')
    .select('service_id')
    .eq('property_id', propertyId)
  if (error) throw new Error(errorMessage(error, 'Could not update services'))

  const current = new Set((data ?? []).map((row: { service_id: string }) => row.service_id))
  const next = new Set(serviceIds)
  const toRemove = [...current].filter((id) => !next.has(id))
  const toAdd = [...next].filter((id) => !current.has(id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('property_services')
      .delete()
      .eq('property_id', propertyId)
      .in('service_id', toRemove)
    if (deleteError) throw new Error(errorMessage(deleteError, 'Could not update services'))
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from('property_services').insert(
      toAdd.map((serviceId) => ({ property_id: propertyId, service_id: serviceId }))
    )
    if (insertError) throw new Error(errorMessage(insertError, 'Could not update services'))
  }
}

function propertyRow(values: PropertySaveValues, logoUrl: string | null, backgroundUrl: string | null, backgroundType: PropertyBackgroundType) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    active: values.active,
    logo_url: logoUrl,
    background_url: backgroundUrl,
    background_type: backgroundType,
    primary_color: values.primary_color.trim(),
    accent_color: values.accent_color.trim(),
    background_color: values.background_color.trim(),
    text_color: values.text_color.trim(),
    button_text_color: values.button_text_color.trim(),
    font: values.font,
    heading: values.heading.trim(),
    welcome_message: values.welcome_message.trim() || null,
    contact_info: values.contact_info.trim() || null,
    ask_room_number: values.ask_room_number,
  }
}

export async function saveProperty(input: SavePropertyInput): Promise<Property> {
  const supabase = createClient()
  let id = input.id
  let logoUrl = input.clearLogo ? null : input.existingLogoUrl
  let backgroundUrl = input.clearBackground ? null : input.existingBackgroundUrl
  let backgroundType: PropertyBackgroundType = input.clearBackground ? 'none' : input.existingBackgroundType

  if (!id) {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyRow(input.values, null, null, backgroundType))
      .select('id')
      .single()
    if (error || !data) throw new Error(errorMessage(error ?? {}, 'Could not create the property'))
    id = data.id as string
  }

  let uploadWarning: string | null = null
  try {
    if (input.logoFile) logoUrl = await uploadPropertyAsset(id, input.logoFile, 'logo')
    if (input.backgroundFile) {
      backgroundUrl = await uploadPropertyAsset(id, input.backgroundFile, 'background')
      backgroundType = backgroundTypeFor(input.backgroundFile)
    }
  } catch (error) {
    uploadWarning = error instanceof Error ? error.message : 'Could not upload the file.'
  }

  const { data, error } = await supabase
    .from('properties')
    .update(propertyRow(input.values, logoUrl, backgroundUrl, backgroundType))
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error(errorMessage(error ?? {}, 'Could not save the property'))

  await setPropertyServices(id, input.serviceIds)
  const property = data as Property
  if (uploadWarning) throw new PropertyUploadError(`${uploadWarning} Other changes were saved.`, property)
  return property
}

export function servicesForProperty(services: Service[], serviceIds: string[]): Service[] {
  const selected = new Set(serviceIds)
  return services.filter((service) => selected.has(service.id))
}
