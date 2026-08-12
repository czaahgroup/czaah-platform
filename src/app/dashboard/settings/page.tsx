'use client'
// @ts-nocheck

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile { id: string; full_name: string; email: string; phone: string | null; company_name: string | null; country: string | null; company_website: string | null; company_description: string | null; role: string; avatar_url: string | null }
interface NotificationPreferences { id: string; email_new_message: boolean; email_enquiry_status: boolean; email_new_investment: boolean; in_app_new_message: boolean; in_app_enquiry_status: boolean }
interface MfaFactor { id: string; factor_type: string; status: string }

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([])
  const [mfaEnrolling, setMfaEnrolling] = useState(false)
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaMsg, setMfaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('id, full_name, email, phone, company_name, country, company_website, company_description, role, avatar_url').eq('id', user.id).single()
      if (!prof) { router.push('/login'); return }
      setProfile(prof); setFullName(prof.full_name || ''); setPhone(prof.phone || ''); setCompanyName(prof.company_name || ''); setCountry(prof.country || ''); setCompanyWebsite(prof.company_website || ''); setCompanyDescription(prof.company_description || '')
      if (prof.avatar_url) { const { data: signedData } = await supabase.storage.from('platform-files').createSignedUrl(prof.avatar_url, 3600); if (signedData?.signedUrl) setAvatarSignedUrl(signedData.signedUrl) }
      const { data: mfaData } = await supabase.auth.mfa.listFactors()
      if (mfaData?.totp) { setMfaFactors(mfaData.totp.filter(f => f.status === 'verified').map(f => ({ id: f.id, factor_type: f.factor_type, status: f.status }))) }
      const { data: notifPrefs } = await supabase.from('notification_preferences').select('id, email_new_message, email_enquiry_status, email_new_investment, in_app_new_message, in_app_enquiry_status').eq('user_id', user.id).single()
      if (notifPrefs) { setNotifications(notifPrefs) } else { const { data: newPrefs } = await supabase.from('notification_preferences').insert({ user_id: user.id, email_new_message: true, email_enquiry_status: true, email_new_investment: true, in_app_new_message: true, in_app_enquiry_status: true }).select().single(); if (newPrefs) setNotifications(newPrefs) }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => setAvatarPreview(reader.result as string); reader.readAsDataURL(file)
    setUploadingAvatar(true)
    try { const arrayBuffer = await file.arrayBuffer(); const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')); const res = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: base64 }) }); const result = await res.json(); if (res.ok) { setProfileMsg({ type: 'success', text: 'Avatar updated successfully.' }) } else { setProfileMsg({ type: 'error', text: result.error || 'Avatar upload failed.' }); setAvatarPreview(null) } } catch { setProfileMsg({ type: 'error', text: 'Avatar upload failed.' }); setAvatarPreview(null) }
    setUploadingAvatar(false)
  }

  async function handleEnrollMfa() { setMfaLoading(true); setMfaMsg(null); try { const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' }); const result = await res.json(); if (res.ok) { setMfaQrCode(result.data.qrCode); setMfaFactorId(result.data.factorId); setMfaEnrolling(true) } else { setMfaMsg({ type: 'error', text: result.error || 'Failed to start 2FA enrollment.' }) } } catch { setMfaMsg({ type: 'error', text: 'Failed to start 2FA enrollment.' }) } setMfaLoading(false) }
  async function handleVerifyMfa() { if (!mfaFactorId || !mfaCode) return; setMfaLoading(true); setMfaMsg(null); try { const res = await fetch('/api/auth/mfa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factorId: mfaFactorId, code: mfaCode }) }); const result = await res.json(); if (res.ok) { setMfaMsg({ type: 'success', text: 'Two-factor authentication enabled successfully.' }); setMfaEnrolling(false); setMfaQrCode(null); setMfaFactorId(null); setMfaCode(''); setMfaFactors(prev => [...prev, { id: mfaFactorId, factor_type: 'totp', status: 'verified' }]) } else { setMfaMsg({ type: 'error', text: result.error || 'Invalid verification code.' }) } } catch { setMfaMsg({ type: 'error', text: 'Verification failed.' }) } setMfaLoading(false) }
  async function handleDisableMfa(factorId: string) { setMfaLoading(true); setMfaMsg(null); try { const res = await fetch('/api/auth/mfa/unenroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factorId }) }); const result = await res.json(); if (res.ok) { setMfaMsg({ type: 'success', text: 'Two-factor authentication disabled.' }); setMfaFactors(prev => prev.filter(f => f.id !== factorId)) } else { setMfaMsg({ type: 'error', text: result.error || 'Failed to disable 2FA.' }) } } catch { setMfaMsg({ type: 'error', text: 'Failed to disable 2FA.' }) } setMfaLoading(false) }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return; setSavingProfile(true); setProfileMsg(null)
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() || null, company_name: companyName.trim() || null, country: country.trim() || null, company_website: companyWebsite.trim() || null, company_description: companyDescription.trim() || null }).eq('id', profile.id)
    if (error) { setProfileMsg({ type: 'error', text: error.message }) } else { setProfileMsg({ type: 'success', text: 'Profile updated successfully.' }); setProfile(prev => prev ? { ...prev, full_name: fullName.trim() } : null) }
    setSavingProfile(false)
  }

  async function saveNotifications() {
    if (!notifications) return; setSavingNotifications(true); setNotifMsg(null)
    const { error } = await supabase.from('notification_preferences').update({ email_new_message: notifications.email_new_message, email_enquiry_status: notifications.email_enquiry_status, email_new_investment: notifications.email_new_investment, in_app_new_message: notifications.in_app_new_message, in_app_enquiry_status: notifications.in_app_enquiry_status }).eq('id', notifications.id)
    if (error) { setNotifMsg({ type: 'error', text: error.message }) } else { setNotifMsg({ type: 'success', text: 'Notification preferences saved.' }) }
    setSavingNotifications(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return; setPasswordMsg(null)
    if (newPassword.length < 8) { setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'New passwords do not match.' }); return }
    setSavingPassword(true)
    try { const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword }); if (signInError) { setPasswordMsg({ type: 'error', text: 'Current password is incorrect.' }); setSavingPassword(false); return }; const { error: updateError } = await supabase.auth.updateUser({ password: newPassword }); if (updateError) { setPasswordMsg({ type: 'error', text: updateError.message }) } else { setPasswordMsg({ type: 'success', text: 'Password changed successfully.' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') } } catch { setPasswordMsg({ type: 'error', text: 'Failed to change password.' }) }
    setSavingPassword(false)
  }

  function toggleNotif(key: keyof Omit<NotificationPreferences, 'id'>) { if (!notifications) return; setNotifications(prev => prev ? { ...prev, [key]: !prev[key] } : null) }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="raleway-text text-on-surface-variant/50">Loading...</div></div>

  const displayAvatar = avatarPreview || avatarSignedUrl
  const userInitial = profile?.full_name?.[0]?.toUpperCase() || '?'
  const inputCls = "w-full bg-transparent border-b border-outline-variant focus:border-primary px-1 py-2.5 text-sm text-on-surface outline-none transition-colors raleway-text"
  const disabledInputCls = "w-full bg-surface-container border-b border-outline-variant/30 px-1 py-2.5 text-sm text-on-surface-variant/40 cursor-not-allowed raleway-text"

  return (
    <>
      <div className="mb-6"><h1 className="cinzel-text text-2xl text-on-surface">Settings</h1></div>
      <div className="space-y-8">
        {/* Profile */}
        <form onSubmit={saveProfile} className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Profile</h2></div>
          <div className="px-6 py-6 space-y-5">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 overflow-hidden border-2 border-primary/30 flex items-center justify-center bg-surface-container-lowest shrink-0" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                {displayAvatar ? <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="cinzel-text text-3xl text-primary">{userInitial}</span>}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="text-sm text-primary border border-outline-variant/40 hover:border-primary px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer bg-transparent raleway-text">{uploadingAvatar ? 'Uploading...' : 'Change Photo'}</button>
                <p className="text-xs text-on-surface-variant/40 mt-1.5 raleway-text">JPG, PNG. Max 5MB.</p>
              </div>
            </div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Email</label><input type="email" value={profile?.email || ''} disabled className={disabledInputCls} /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputCls} /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+1 234 567 8900" /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Company Name</label><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Country</label><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Company Website</label><input type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} className={inputCls} placeholder="https://example.com" /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Company Description</label><textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`} /></div>
            {profileMsg && <div className={`text-sm px-4 py-2.5 ${profileMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-error/10 border border-error/20 text-error'}`}>{profileMsg.text}</div>}
          </div>
          <div className="px-6 py-4 border-t border-outline-variant/10"><button type="submit" disabled={savingProfile} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 cursor-pointer border-none raleway-text">{savingProfile ? 'Saving...' : 'Save Profile'}</button></div>
        </form>

        {/* 2FA */}
        <div className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Two-Factor Authentication</h2></div>
          <div className="px-6 py-6 space-y-4">
            {mfaFactors.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500" /><span className="text-sm text-on-surface raleway-text">2FA Enabled</span></div><span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400">Active</span></div>
                <p className="text-xs text-on-surface-variant/40 raleway-text">Your account is protected with TOTP-based two-factor authentication.</p>
                {mfaFactors.map(factor => <button key={factor.id} onClick={() => handleDisableMfa(factor.id)} disabled={mfaLoading} className="text-sm text-error border border-error/30 px-4 py-2 hover:bg-error/10 transition-colors disabled:opacity-50 bg-transparent cursor-pointer raleway-text">{ mfaLoading ? 'Processing...' : 'Disable 2FA'}</button>)}
              </div>
            ) : mfaEnrolling ? (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant/50 raleway-text">Scan the QR code below with your authenticator app, then enter the 6-digit code.</p>
                {mfaQrCode && <div className="flex justify-center py-4"><img src={mfaQrCode} alt="2FA QR Code" style={{ width: '200px', height: '200px', background: '#fff', padding: '8px' }} /></div>}
                <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Verification Code</label><input type="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} className={`${inputCls} max-w-xs tracking-widest text-center text-lg`} /></div>
                <div className="flex gap-3">
                  <button onClick={handleVerifyMfa} disabled={mfaLoading || mfaCode.length !== 6} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 border-none cursor-pointer raleway-text">{mfaLoading ? 'Verifying...' : 'Verify & Enable'}</button>
                  <button onClick={() => { setMfaEnrolling(false); setMfaQrCode(null); setMfaFactorId(null); setMfaCode('') }} className="text-sm text-on-surface-variant border border-outline-variant/40 px-4 py-2.5 hover:text-on-surface transition-colors bg-transparent cursor-pointer raleway-text">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-on-surface-variant/50 raleway-text">Add an extra layer of security to your account by enabling two-factor authentication.</p>
                <button onClick={handleEnrollMfa} disabled={mfaLoading} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 border-none cursor-pointer raleway-text">{mfaLoading ? 'Loading...' : 'Enable 2FA'}</button>
              </div>
            )}
            {mfaMsg && <div className={`text-sm px-4 py-2.5 ${mfaMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-error/10 border border-error/20 text-error'}`}>{mfaMsg.text}</div>}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Notification Preferences</h2></div>
          {notifications && (
            <div className="px-6 py-6 space-y-6">
              <div><h3 className="text-sm font-medium text-on-surface mb-3 raleway-text">Email Notifications</h3><div className="space-y-3"><NotifToggle label="New messages" description="Receive an email when you get a new chat message" checked={notifications.email_new_message} onChange={() => toggleNotif('email_new_message')} /><NotifToggle label="Enquiry status changes" description="Receive an email when your enquiry status changes" checked={notifications.email_enquiry_status} onChange={() => toggleNotif('email_enquiry_status')} /><NotifToggle label="New investment opportunities" description="Receive an email about new investment listings" checked={notifications.email_new_investment} onChange={() => toggleNotif('email_new_investment')} /></div></div>
              <div><h3 className="text-sm font-medium text-on-surface mb-3 raleway-text">In-App Notifications</h3><div className="space-y-3"><NotifToggle label="New messages" description="Show in-app notification for new chat messages" checked={notifications.in_app_new_message} onChange={() => toggleNotif('in_app_new_message')} /><NotifToggle label="Enquiry status changes" description="Show in-app notification for enquiry updates" checked={notifications.in_app_enquiry_status} onChange={() => toggleNotif('in_app_enquiry_status')} /></div></div>
              {notifMsg && <div className={`text-sm px-4 py-2.5 ${notifMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-error/10 border border-error/20 text-error'}`}>{notifMsg.text}</div>}
            </div>
          )}
          <div className="px-6 py-4 border-t border-outline-variant/10"><button onClick={saveNotifications} disabled={savingNotifications} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 border-none cursor-pointer raleway-text">{savingNotifications ? 'Saving...' : 'Save Preferences'}</button></div>
        </div>

        {/* Password */}
        <form onSubmit={changePassword} className="bg-surface-container-low border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Change Password</h2></div>
          <div className="px-6 py-6 space-y-5">
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputCls} placeholder="Enter your current password" /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Minimum 8 characters" /></div>
            <div><label className="block text-sm text-on-surface-variant/50 mb-1.5 raleway-text">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Re-enter your new password" /></div>
            {passwordMsg && <div className={`text-sm px-4 py-2.5 ${passwordMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-error/10 border border-error/20 text-error'}`}>{passwordMsg.text}</div>}
          </div>
          <div className="px-6 py-4 border-t border-outline-variant/10"><button type="submit" disabled={savingPassword} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 border-none cursor-pointer raleway-text">{savingPassword ? 'Changing...' : 'Change Password'}</button></div>
        </form>
      </div>
    </>
  )
}

function NotifToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="pt-0.5">
        <button type="button" role="switch" aria-checked={checked} onClick={onChange} className={`relative w-9 h-5 transition-colors ${checked ? 'bg-primary' : 'bg-surface-container border border-outline-variant/40'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform ${checked ? 'translate-x-4 bg-on-primary' : 'translate-x-0 bg-on-surface-variant'}`} />
        </button>
      </div>
      <div>
        <p className="text-sm text-on-surface group-hover:text-primary transition-colors raleway-text">{label}</p>
        <p className="text-xs text-on-surface-variant/40 raleway-text">{description}</p>
      </div>
    </label>
  )
}
