// Same page as /dashboard/meetings, rendered here so it stays inside the
// admin shell (src/app/admin/layout.tsx) instead of bouncing staff into
// the separate member portal layout. Scheduled video-call meetings join
// straight into the /meet/[roomId] room, keyed by the meeting's own id.
export { default } from '@/app/dashboard/meetings/page'
