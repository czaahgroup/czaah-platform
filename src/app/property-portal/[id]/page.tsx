import { loadPublicListing } from '@/lib/publicListings'
import ListingView from './ListingView'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The listing is loaded here so its photographs, price and description are in
// the HTML a crawler or a first paint receives. The layout has already turned
// a non-existent listing into a 404; if this lookup fails for another reason
// the view loads the listing in the browser instead.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = UUID.test(id) ? await loadPublicListing(id) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ListingView initial={(listing as any) || null} />
}
