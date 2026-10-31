import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filename: string, override: boolean) {
  let text: string
  try {
    text = readFileSync(resolve(process.cwd(), filename), 'utf8')
  } catch {
    return
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (override || process.env[key] == null || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env', false)
loadEnvFile('.env.local', true)

const secretKey = process.env.YOCO_SECRET_KEY?.trim()
const appUrl = process.env.APP_URL?.trim().replace(/\/$/, '')

if (!secretKey || !appUrl) {
  console.error('YOCO_SECRET_KEY and APP_URL are required')
  process.exit(1)
}

if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
  console.error('YOCO_SECRET_KEY must be a Yoco secret key')
  process.exit(1)
}

const webhookUrl = `${appUrl}/api/webhooks/yoco`
const response = await fetch('https://payments.yoco.com/api/webhooks', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'rsa-guest-laundry',
    url: webhookUrl,
  }),
})

const body = (await response.json().catch(() => null)) as {
  id?: string
  mode?: string
  secret?: string
  url?: string
} | null

if (!response.ok || !body?.secret) {
  console.error('Yoco did not register the webhook', response.status)
  process.exit(1)
}

console.log(`Webhook id: ${body.id ?? ''}`)
console.log(`Mode: ${body.mode ?? ''}`)
console.log(`URL: ${body.url ?? webhookUrl}`)
console.log(`YOCO_WEBHOOK_SECRET=${body.secret}`)
