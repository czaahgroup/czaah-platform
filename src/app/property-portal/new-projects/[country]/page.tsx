import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { NewProjectsView } from '../NewProjectsView'
import { loadLocationTree } from '@/lib/propertyLocations'
import { findCountry, locationLabel } from '../../_components/locationNav'
import { loadProjects } from '@/lib/propertyDevelopers'
import { portalMetadata } from '../../_components/seo'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ country: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { country } = await params
  const c = findCountry(await loadLocationTree(), country)
  if (!c) return {}
  const place = locationLabel({ country: c, city: null })
  // An empty market still works for visitors but stays out of search results.
  const count = (await loadProjects({ country: c.name })).length
  return portalMetadata({
    path: `/new-projects/${c.slug}`,
    title: `New Projects in ${place}`,
    description: `New and off-plan developments in ${place} listed with CZAAH Properties.`,
    noindex: count === 0,
  })
}

export default async function Page({ params }: Params) {
  const { country } = await params
  const tree = await loadLocationTree()
  const c = findCountry(tree, country)
  // A market that is off or never existed is a real 404 (a failed lookup is not).
  if (tree && !c) notFound()
  return <NewProjectsView country={c} />
}
