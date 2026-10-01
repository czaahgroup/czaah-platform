import { loadPortalListings } from '@/lib/publicListings'
import { ListingsSeed } from './_components/useListings'
import PropertyPortalHome from './HomeView'

// Listings are loaded here so the featured properties, market counts and
// comparison are in the HTML itself — for search engines and for first paint.
// If the load fails the page still renders and fetches them in the browser.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const listings = await loadPortalListings()
  return (
    <ListingsSeed data={listings}>
      <PropertyPortalHome />
    </ListingsSeed>
  )
}
