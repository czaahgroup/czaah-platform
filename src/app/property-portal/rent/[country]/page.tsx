import { notFound } from 'next/navigation'
import { RentView } from '../RentView'
import { loadRouteLocation, locationPageMetadata } from '@/lib/locationPages'

type Params = { params: Promise<{ country: string }> }

export async function generateMetadata({ params }: Params) {
  const { country } = await params
  const loc = await loadRouteLocation(country)
  return locationPageMetadata('rent', loc, `/rent/${loc ? loc.country.slug : country}`)
}

export default async function Page({ params }: Params) {
  const { country } = await params
  const loc = await loadRouteLocation(country)
  // A market that is off, or never existed, is a real 404.
  if (loc === null) notFound()
  return <RentView countrySlug={country} />
}
