'use client';

interface RegistrationChooserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'worker' | 'employer' | 'oep') => void;
}

const options = [
  {
    type: 'worker' as const,
    icon: 'badge',
    title: 'Register as a Worker',
    desc: 'Looking for overseas or domestic employment? Register your profile to join our recruitment network.',
  },
  {
    type: 'employer' as const,
    icon: 'apartment',
    title: 'Register as an Employer',
    desc: 'Hiring skilled or semi-skilled workers? Tell us your requirements and we’ll source candidates.',
  },
  {
    type: 'oep' as const,
    icon: 'flight_takeoff',
    title: 'Register as an Employment Promoter',
    desc: 'A licensed overseas recruitment agency? Join our verified partner network for cross-border deployment.',
  },
];

export function RegistrationChooserModal({ open, onClose, onSelect }: RegistrationChooserModalProps) {
  if (!open) return null;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      <style>{`
        .rc-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: rcFadeIn 0.25s ease;
        }
        @keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .rc-modal {
          background: #080808; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; max-width: 560px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative;
          animation: rcSlideUp 0.3s ease;
        }
        @keyframes rcSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .rc-close {
          position: absolute; top: 16px; right: 16px; z-index: 2;
          background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 24px; cursor: pointer; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: all 0.2s;
        }
        .rc-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .rc-header { padding: 36px 32px 8px; }
        .rc-title {
          font-family: 'Cinzel', serif; font-size: 22px; font-weight: 600;
          color: #fff; margin: 0 0 8px;
        }
        .rc-subtitle {
          font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.45); line-height: 1.6; margin: 0;
        }
        .rc-options { padding: 24px 32px 32px; display: flex; flex-direction: column; gap: 12px; }
        .rc-option {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 18px 20px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);
          cursor: pointer; transition: all 0.2s; text-align: left; width: 100%;
        }
        .rc-option:hover { border-color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.05); }
        .rc-option-icon {
          flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;
          background: rgba(201,168,76,0.1); display: flex; align-items: center; justify-content: center;
        }
        .rc-option-body { flex: 1; }
        .rc-option-title {
          font-family: 'Cinzel', serif; font-size: 15px; color: #fff;
          font-weight: 600; margin: 0 0 4px;
        }
        .rc-option-desc {
          font-family: 'Raleway', sans-serif; font-size: 12.5px;
          color: rgba(255,255,255,0.45); line-height: 1.6; margin: 0;
        }
        .rc-option-arrow {
          flex-shrink: 0; color: rgba(201,168,76,0.5); font-size: 20px;
          align-self: center; transition: transform 0.2s;
        }
        .rc-option:hover .rc-option-arrow { transform: translateX(3px); color: #c9a84c; }
        @media (max-width: 640px) {
          .rc-header, .rc-options { padding-left: 20px; padding-right: 20px; }
          .rc-title { font-size: 19px; }
        }
      `}</style>

      <div className="rc-overlay" onClick={handleOverlayClick}>
        <div className="rc-modal">
          <button className="rc-close" onClick={onClose} aria-label="Close">&times;</button>

          <div className="rc-header">
            <h2 className="rc-title">How would you like to register?</h2>
            <p className="rc-subtitle">Choose the option that best describes you, and we&apos;ll take you to the right form.</p>
          </div>

          <div className="rc-options">
            {options.map(opt => (
              <button
                key={opt.type}
                type="button"
                className="rc-option"
                onClick={() => onSelect(opt.type)}
              >
                <div className="rc-option-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#c9a84c' }}>{opt.icon}</span>
                </div>
                <div className="rc-option-body">
                  <div className="rc-option-title">{opt.title}</div>
                  <div className="rc-option-desc">{opt.desc}</div>
                </div>
                <span className="material-symbols-outlined rc-option-arrow">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
