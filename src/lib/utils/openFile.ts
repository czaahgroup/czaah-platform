/**
 * Opens a file from Supabase Storage using a signed URL.
 * Works for both 'platform-files' and 'kyc-documents' buckets.
 */
export async function openFile(path: string, bucket: string = 'platform-files') {
  try {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}&bucket=${encodeURIComponent(bucket)}`)
    if (!res.ok) {
      console.error('Failed to get signed URL')
      return
    }
    const { url } = await res.json()
    window.open(url, '_blank')
  } catch (err) {
    console.error('Failed to open file:', err)
  }
}
