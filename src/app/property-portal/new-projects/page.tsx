import { NewProjectsView } from './NewProjectsView'
import { portalMetadata } from '../_components/seo'

export const dynamic = 'force-dynamic'

export const metadata = portalMetadata({
  path: '/new-projects',
  title: 'New Projects & Off-Plan Developments',
  description: 'New and off-plan developments in the United Kingdom, Dubai and Pakistan — developer, location, units and payment plans.',
})

export default function Page() {
  return <NewProjectsView country={null} />
}
