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

export default function PartnerMembershipCardPage() {
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)

    fetch('/api/partner/card')
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

  function loadMarkhorImage(): Promise<HTMLImageElement> {
    const svg = `<svg viewBox="-5 -12 100 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dlHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8a6f2e"/>
          <stop offset="40%" stop-color="#c9a84c"/>
          <stop offset="60%" stop-color="#e8c97a"/>
          <stop offset="100%" stop-color="#8a6f2e"/>
        </linearGradient>
        <linearGradient id="dlBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#c9a84c"/>
          <stop offset="100%" stop-color="#8a6f2e"/>
        </linearGradient>
      </defs>
      <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#dlHornGrad)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#dlHornGrad)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#dlHornGrad)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#dlHornGrad)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#dlBodyGrad)" opacity="0.9"/>
      <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#dlHornGrad)" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.5"/>
      <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#dlHornGrad)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.55"/>
      <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#dlHornGrad)" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.5"/>
      <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#dlBodyGrad)" opacity="0.5"/>
      <line x1="35" y1="108" x2="55" y2="108" stroke="url(#dlHornGrad)" stroke-width="1.5" opacity="0.7"/>
    </svg>`
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
    })
  }

  function drawCardBase(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 680, 428)
    grad.addColorStop(0, '#0a0a0a')
    grad.addColorStop(1, '#111111')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, 680, 428, 24)
    ctx.fill()

    const radGrad = ctx.createRadialGradient(340, 214, 50, 340, 214, 400)
    radGrad.addColorStop(0, 'rgba(201,168,76,0.06)')
    radGrad.addColorStop(1, 'rgba(201,168,76,0)')
    ctx.fillStyle = radGrad
    ctx.fillRect(0, 0, 680, 428)

    ctx.strokeStyle = 'rgba(201,168,76,0.15)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(0, 0, 680, 428, 24)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(201,168,76,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 680; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 428)
      ctx.stroke()
    }
  }

  function loadExternalImage(src: string): Promise<HTMLImageElement> {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
    })
  }

  async function downloadFront() {
    if (!card) return
    const markhorImg = await loadMarkhorImage().catch(() => null)
    const canvas = document.createElement('canvas')
    canvas.width = 680
    canvas.height = 428
    const ctx = canvas.getContext('2d')!
    drawCardBase(ctx)

    ctx.fillStyle = '#C9A84C'
    ctx.font = '600 28px Cinzel, serif'
    ctx.textAlign = 'right'
    ctx.fillText('CZAAH', 640, 56)

    if (markhorImg) {
      ctx.drawImage(markhorImg, 32, 24, 48, 55)
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = '500 22px Raleway, sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '2px'
    ctx.fillText(card.fullName.toUpperCase(), 40, 310)

    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '400 14px Raleway, sans-serif'
    ctx.fillText(card.companyName || '', 40, 336)

    const tier = 'CZAAH PARTNER'
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

    ctx.fillStyle = '#C9A84C'
    ctx.font = '400 13px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`ID: ${card.memberId}`, 640, 400)

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '400 12px Raleway, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Partner Since ${card.memberSince}`, 40, 400)

    const link = document.createElement('a')
    link.download = 'czaah-partner-card-front.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function downloadBack() {
    if (!card) return
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.qrData)}&size=300x300&bgcolor=080808&color=C9A84C`
    const qrImg = await loadExternalImage(qrUrl).catch(() => null)
    const canvas = document.createElement('canvas')
    canvas.width = 680
    canvas.height = 428
    const ctx = canvas.getContext('2d')!
    drawCardBase(ctx)

    if (qrImg) {
      ctx.drawImage(qrImg, 290, 84, 100, 100)
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '400 13px Raleway, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SCAN TO VERIFY PARTNER', 340, 218)

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '400 13px Raleway, sans-serif'
    ctx.fillText('CZAAH Capital & Ventures', 340, 260)

    ctx.fillStyle = '#C9A84C'
    ctx.font = '500 14px Raleway, sans-serif'
    ctx.fillText('czaah.com', 340, 282)

    const link = document.createElement('a')
    link.download = 'czaah-partner-card-back.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function downloadCard() {
    if (flipped) {
      await downloadBack()
    } else {
      await downloadFront()
    }
  }

  async function shareCard() {
    if (!card || !navigator.share) return
    try {
      await navigator.share({
        title: 'CZAAH Partner Card',
        text: `${card.fullName} - CZAAH Partner | ID: ${card.memberId}`,
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
          Loading partner card...
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.qrData)}&size=150x150&bgcolor=080808&color=C9A84C`

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
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
        Partner Card
      </h1>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '13px',
        color: 'rgba(255,255,255,0.35)',
        marginBottom: '40px',
      }}>
        Your digital CZAAH Partner credential. Click the card to flip, then download whichever side is showing.
      </p>

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
          className="partner-card-face"
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.05) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />

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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <svg viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '32px', width: 'auto' }}>
                <defs>
                  <linearGradient id="pcardHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8a6f2e"/>
                    <stop offset="40%" stopColor="#c9a84c"/>
                    <stop offset="60%" stopColor="#e8c97a"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                  <linearGradient id="pcardBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c9a84c"/>
                    <stop offset="100%" stopColor="#8a6f2e"/>
                  </linearGradient>
                </defs>
                <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#pcardHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#pcardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#pcardHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#pcardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#pcardBodyGrad)" opacity="0.9"/>
                <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#pcardHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#pcardHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
                <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#pcardHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#pcardBodyGrad)" opacity="0.5"/>
                <line x1="35" y1="108" x2="55" y2="108" stroke="url(#pcardHornGrad)" strokeWidth="1.5" opacity="0.7"/>
              </svg>

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

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '16px',
                fontWeight: 500,
                color: '#ffffff',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}>{card.fullName}</div>

              <div style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '12px',
              }}>{card.companyName}</div>

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
              }}>CZAAH PARTNER</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.3)',
                }}>Partner Since {card.memberSince}</span>
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
          className="partner-card-face"
          >
            <img
              src={qrUrl}
              alt="Partner QR Code"
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
            }}>Scan to verify partner</p>

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

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
        <button
          onClick={downloadCard}
          className="pcard-download-btn"
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
          Download {flipped ? 'Back' : 'Front'}
        </button>

        {canShare && (
          <button
            onClick={shareCard}
            className="pcard-share-btn"
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

      <style>{`
        .partner-card-face {
          transition: box-shadow 0.3s ease;
        }
        .partner-card-face:hover {
          box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(201,168,76,0.05);
        }
        .pcard-download-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(201,168,76,0.2);
        }
        .pcard-share-btn:hover {
          border-color: rgba(201,168,76,0.6);
          background: rgba(201,168,76,0.05);
        }
      `}</style>
    </div>
  )
}
