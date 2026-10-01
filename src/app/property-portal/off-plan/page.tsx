import OffPlanView from './OffPlanView'
import { ListingsSeed } from '../_components/useListings'
import { loadPortalListings } from '@/lib/publicListings'

// Listings are loaded on the server so the results are in the HTML itself
// (search engines, first paint). On failure the view fetches them instead.
export const dynamic = 'force-dynamic'

export default async function Page() {
  return (
    <ListingsSeed data={await loadPortalListings()}>
      <OffPlanView />
    </ListingsSeed>
  )
}
