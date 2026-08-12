'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

interface CardData {
  fullName: string
  email: string
  companyName: string
  role: string
  memberId: string
  memberSince: string
  qrData: string
}

function getTierLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'ADMIN'
    case 'investment_partner': return 'INVESTMENT PARTNER'
    case 'elite_member': return 'ELITE MEMBER'
    default: return 'MEMBER'
  }
}

export default function MembershipCardPage() {
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)

    fetch('/api/member/card')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load card data')
        return res.json()
      })
      .then(data => {
        setCard(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function downloadCard() {
    if (!card) return
    const canvas = document.createElement('canvas')
    canvas.width = 680
    canvas.height = 428
    const ctx = canvas.getContext('2d')!

    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, 680, 428)
    grad.addColorStop(0, '#0a0a0a')
    grad.addColorStop(1, '#111111')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, 680, 428, 24)
    ctx.fill()

    // Gold radial glow
    const radGrad = ctx.createRadialGradient(340, 214, 50, 340, 214, 400)
    radGrad.addColorStop(0, 'rgba(201,168,76,0.06)')
    radGrad.addColorStop(1, 'rgba(201,168,76,0)')
    ctx.fillStyle = radGrad
    ctx.fillRect(0, 0, 680, 428)

    // Draw gold border
    ctx.strokeStyle = 'rgba(201,168,76,0.15)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(0, 0, 680, 428, 24)
    ctx.stroke()

    // Subtle center lines
    ctx.strokeStyle = 'rgba(201,168,76,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 680; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 428)
      ctx.stroke()
    }

    // CZAAH text top-right
    ctx.fillStyle = '#C9A84C'
    ctx.font = '600 28px Cinzel, serif'
    ctx.textAlign = 'right'
    ctx.fillText('CZAAH', 640, 56)

    // Markhor icon placeholder (small gold diamond) top-left
    ctx.fillStyle = '#C9A84C'
    ctx.font = '600 28px serif'
    ctx.textAlign = 'left'
    // Draw a simple markhor-inspired shape
    ctx.save()
    ctx.translate(56, 44)
    ctx.beginPath()
    ctx.moveTo(0, -14)
    ctx.quadraticCurveTo(8, -6, 4, 4)
    ctx.quadraticCurveTo(2, 8, 0, 14)
    ctx.quadraticCurveTo(-2, 8, -4, 4)
    ctx.quadraticCurveTo(-8, -6, 0, -14)
    ctx.fillStyle = 'rgba(201,168,76,0.7)'
    ctx.fill()
    ctx.restore()

    // Member name
    ctx.fillStyle = '#ffffff'
    ctx.font = '500 22px Raleway, sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '2px'
    ctx.fillText(card.fullName.toUpperCase(), 40, 310)

    // Company name
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '400 14px Raleway, sans-serif'
    ctx.fillText(card.companyName || '', 40, 336)

    // Tier badge
    const tier = getTierLabel(card.role)
    ctx.font = '500 11px Raleway, sans-serif'
    const tierWidth = ctx.measureText(tier).width
    const badgeX = 40
    const badgeY = 358
    ctx.strokeStyle = 'rgba(201,168,76,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY - 12, tierWidth + 20, 20, 10)
    ctx.stroke()
    ctx.fillStyle = '#C9A84C'
    ctx.textAlign = 'left'
    ctx.fillText(tier, badgeX + 10, badgeY + 3)

    // Member ID bottom-right
    ctx.fillStyle = '#C9A84C'
    ctx.font = '400 13px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`ID: ${card.memberId}`, 640, 400)

    // Member Since bottom-left
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '400 12px Raleway, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Member Since ${card.memberSince}`, 40, 400)

    // Download
    const link = document.createElement('a')
    link.download = 'czaah-membership-card.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function shareCard() {
    if (!card || !navigator.share) return
    try {
      await navigator.share({
        title: 'CZAAH Membership Card',
        text: `${card.fullName} - CZAAH ${getTierLabel(card.role)} | ID: ${card.memberId}`,
        url: card.qrData,
      })
    } catch {
      // User cancelled share
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Loading membership card...
        </p>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#ff4444' }}>
          {error || 'Failed to load card data'}
        </p>
      </div>
    )
  }

  const tier = getTierLabel(card.role)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.qrData)}&size=150x150&bgcolor=080808&color=C9A84C`

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
      {/* Page Header */}
      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '22px',
        fontWeight: 600,
        color: 'transparent',
        background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, #8a6f2e 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        marginBottom: '8px',
      }}>
        Membership Card
      </h1>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '13px',
        color: 'rgba(255,255,255,0.35)',
        marginBottom: '40px',
      }}>
        Your digital CZAAH membership credential. Click the card to flip.
      </p>

      {/* Card Container with 3D Flip */}
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          perspective: '1000px',
          cursor: 'pointer',
          width: '400px',
          height: '252px',
          margin: '0 auto 40px',
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* FRONT OF CARD */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '0px',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.03)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="membership-card-face"
          >
            {/* Gold radial glow overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.05) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />

            {/* Geometric lines */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              opacity: 0.03,
              backgroundImage: `
                linear-gradient(90deg, #C9A84C 1px, transparent 1px),
                linear-gradient(0deg, #C9A84C 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }} />

            {/* Top row: Logo + CZAAH */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              {/* Markhor Icon */}
              <svg viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '32px', width: 'auto' }}>
                <defs>
                  <linearGradient id="cardHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8a6f2e"/>
                    <stop offset="40%" stopColor="#c9a84c"/>
                    <stop offset="60%" stopColor="#e8c97a"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                  <linearGradient id="cardBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c9a84c"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                </defs>
                <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#cardHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#cardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#cardHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#cardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#cardBodyGrad)" opacity="0.9"/>
                <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#cardHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#cardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
                <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#cardHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#cardBodyGrad)" opacity="0.5"/>
                <line x1="35" y1="108" x2="55" y2="108" stroke="url(#cardHornGrad)" strokeWidth="1.5" opacity="0.7"/>
              </svg>

              {/* CZAAH */}
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 600,
                fontSize: '20px',
                letterSpacing: '4px',
                color: 'transparent',
                background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, #8a6f2e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}>CZAAH</span>
            </div>

            {/* Bottom section */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Member Name */}
              <div style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '16px',
                fontWeight: 500,
                color: '#ffffff',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}>{card.fullName}</div>

              {/* Company */}
              <div style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '12px',
              }}>{card.companyName}</div>

              {/* Tier Badge */}
              <div style={{
                display: 'inline-block',
                padding: '3px 14px',
                border: '1px solid rgba(201,168,76,0.5)',
                borderRadius: '20px',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '2px',
                color: '#C9A84C',
                marginBottom: '14px',
              }}>{tier}</div>

              {/* Bottom row: Member Since + ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.3)',
                }}>Member Since {card.memberSince}</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: '#C9A84C',
                }}>ID: {card.memberId}</span>
              </div>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '0px',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.03)',
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '24px',
          }}
          className="membership-card-face"
          >
            {/* QR Code */}
            <img
              src={qrUrl}
              alt="Membership QR Code"
              width={120}
              height={120}
              style={{ borderRadius: '0px', imageRendering: 'pixelated' }}
            />

            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              letterSpacing: '1.5px',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
              textTransform: 'uppercase' as const,
            }}>Scan to verify membership</p>

            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
                margin: '0 0 4px 0',
              }}>CZAAH Capital &amp; Ventures</p>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                fontWeight: 500,
                color: '#C9A84C',
                margin: 0,
                letterSpacing: '1px',
              }}>czaah.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
        <button
          onClick={downloadCard}
          className="card-download-btn"
          style={{
            padding: '12px 32px',
            border: 'none',
            borderRadius: '0px',
            background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
            color: '#000',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          Download Card
        </button>

        {canShare && (
          <button
            onClick={shareCard}
            className="card-share-btn"
            style={{
              padding: '12px 32px',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '0px',
              background: 'transparent',
              color: '#C9A84C',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            Share
          </button>
        )}
      </div>

      {/* Hover & Animation Styles */}
      <style>{`
        .membership-card-face {
          transition: box-shadow 0.3s ease;
        }
        .membership-card-face:hover {
          box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(201,168,76,0.05);
        }
        .card-download-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(201,168,76,0.2);
        }
        .card-share-btn:hover {
          border-color: rgba(201,168,76,0.6);
          background: rgba(201,168,76,0.05);
        }
      `}</style>
    </div>
  )
}
