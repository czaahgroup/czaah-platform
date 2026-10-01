import { notFound } from 'next/navigation'
import { BuyView } from '../../BuyView'
import { loadRouteLocation, locationPageMetadata } from '@/lib/locationPages'
import { ListingsSeed } from '../../../_components/useListings'
import { loadPortalListings } from '@/lib/publicListings'

type Params = { params: Promise<{ country: string; city: string }> }

export async function generateMetadata({ params }: Params) {
  const { country, city } = await params
  const loc = await loadRouteLocation(country, city)
  return locationPageMetadata('buy', loc, loc?.city ? `/buy/${loc.country.slug}/${loc.city.slug}` : `/buy/${country}/${city}`)
}

export default async function Page({ params }: Params) {
  const { country, city } = await params
  const loc = await loadRouteLocation(country, city)
  if (loc === null) notFound()
  return (
    <ListingsSeed data={await loadPortalListings()}>
      <BuyView countrySlug={country} citySlug={city} />
    </ListingsSeed>
  )
}
