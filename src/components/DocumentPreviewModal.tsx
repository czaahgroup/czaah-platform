'use client';

interface DocumentPreviewModalProps {
  title: string;
  url: string;
  contentType: string | null;
  onClose: () => void;
}

export function DocumentPreviewModal({ title, url, contentType, onClose }: DocumentPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full flex flex-col bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden" style={{ maxWidth: '640px', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <span className="text-sm font-medium text-on-surface">{title}</span>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer bg-transparent border-none text-on-surface-variant hover:text-on-surface text-xl w-7 h-7 flex items-center justify-center">&times;</button>
        </div>

        <div className="flex items-center justify-center overflow-auto" style={{ flex: 1, minHeight: '360px', background: '#050505', padding: '24px' }}>
          {contentType?.startsWith('image/') ? (
            <img
              src={url}
              alt={title}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
            />
          ) : contentType === 'application/pdf' ? (
            <iframe src={url} title={title} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '8px', background: '#fff' }} />
          ) : (
            <p className="text-sm text-on-surface-variant/50">Preview isn&apos;t available for this file type.</p>
          )}
        </div>

        <div className="px-5 py-3 text-center border-t border-outline-variant/10">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open in New Tab</a>
        </div>
      </div>
    </div>
  );
}

export async function resolveDocumentPreview(fetchUrl: string): Promise<{ url: string; contentType: string | null } | null> {
  const res = await fetch(fetchUrl);
  if (!res.ok) return null;
  const { url } = await res.json();
  if (!url) return null;

  let contentType: string | null = null;
  try {
    const headRes = await fetch(url, { method: 'HEAD' });
    contentType = headRes.headers.get('content-type');
  } catch {
    // fall through — caller falls back to the generic viewer
  }

  return { url, contentType };
}
