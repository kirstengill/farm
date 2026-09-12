import type { ReactNode } from 'react'
import FarmImage from '../components/FarmImage'
import { FARM_ART } from '../lib/farmArt'

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Image side */}
      <div className="relative hidden lg:block">
        <FarmImage
          src={FARM_ART.pasture}
          alt="German farmland"
          className="absolute inset-0 h-full w-full object-cover"
          eager
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/30 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-serif text-3xl font-medium leading-snug">
            “Invest in the land that feeds us.”
          </p>
          <p className="mt-3 text-sm text-white/70">Feldwert Capital · Hamburg, Germany</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col justify-center bg-[#FAF8F4] px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md animate-fade-up">{children}</div>
      </div>
    </div>
  )
}
