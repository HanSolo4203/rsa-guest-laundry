import Link from 'next/link'

export default function PropertyNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F4EF] px-6 py-16 text-center text-[#1F2933]">
      <p className="text-sm font-medium tracking-wide text-[#2B5F44]">RSL Express</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">We can&apos;t find that property</h1>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-[#3D4A54]">
        This booking link is missing or no longer active. Check the QR code at reception, or ask the front desk.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2B5F44] px-5 text-base font-medium text-white"
      >
        Back to RSL Express
      </Link>
    </main>
  )
}
