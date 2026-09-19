import { notFound } from 'next/navigation'

// /property-portal/[id] is a catch-all, and on property.czaah.com every
// unknown path is rewritten into it — so a mistyped URL used to render an
// empty "listing" with HTTP 200. Listing ids are UUIDs; anything else is a
// genuine 404 before the client page ever runs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ListingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  return children
}
