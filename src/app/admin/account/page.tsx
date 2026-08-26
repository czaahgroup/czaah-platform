// Same page as /dashboard/settings (personal profile, avatar, 2FA) —
// renamed "Account & Security" here to avoid colliding with /admin/settings
// (system-wide settings), and rendered so it stays inside the admin shell
// (src/app/admin/layout.tsx) instead of bouncing staff into the separate
// member portal layout.
export { default } from '@/app/dashboard/settings/page'
