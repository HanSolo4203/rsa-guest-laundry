import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'RSL Express',
  description: 'Guest laundry for hotels and hostels. Scan the QR code at your property to book a collection.',
}

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#F7F4EF] px-6 py-16 text-[#1F2933]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <p className="text-sm font-medium tracking-wide text-[#2B5F44]">Guest laundry</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">RSL Express</h1>
        <p className="mt-4 text-base leading-relaxed text-[#3D4A54]">
          Scan the QR code at your hotel or hostel to book a laundry collection. Each property has its own page.
        </p>
        <Link
          href="/trade"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2B5F44] px-5 text-base font-medium text-white"
        >
          The Trade Boutique Hotel
        </Link>
        <p className="mt-3 text-sm text-[#5C6B76]">Open the Trade booking page</p>
      </div>
      <p className="mx-auto mt-12 text-sm text-[#5C6B76]">
        Staff?{' '}
        <Link href="/login" className="font-medium text-[#2B5F44] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
