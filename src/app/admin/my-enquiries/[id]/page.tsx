// Same page as /dashboard/enquiries/[id], rendered here so it stays inside
// the admin shell (src/app/admin/layout.tsx) instead of bouncing staff
// into the separate member portal layout. The source page is a dynamic
// route that requires the edge runtime under this app's Cloudflare Pages
// build — re-declared here since route segment config isn't carried over
// by a re-export.
export const runtime = 'edge'
export { default } from '@/app/dashboard/enquiries/[id]/page'
