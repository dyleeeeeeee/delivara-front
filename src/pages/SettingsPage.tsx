import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import Toast, { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

interface Referral {
  code: string
  count: number
  share_text: string
}

export default function SettingsPage() {
  const { user, logout, loadUser, requestOtp, verifyOtp } = useAuthStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [saving, setSaving] = useState(false)
  const [referral, setReferral] = useState<Referral | null>(null)

  // Account linking (add another phone/email to this account)
  const [addKind, setAddKind] = useState<'email' | 'phone' | null>(null)
  const [linkContact, setLinkContact] = useState('')
  const [linkStep, setLinkStep] = useState<'contact' | 'code'>('contact')
  const [linkCode, setLinkCode] = useState('')
  const [linking, setLinking] = useState(false)

  const startLink = (kind: 'email' | 'phone') => {
    setAddKind(kind); setLinkContact(''); setLinkCode(''); setLinkStep('contact')
  }
  const sendLinkCode = async () => {
    if (!addKind || !linkContact.trim() || !user) return
    setLinking(true)
    try {
      await requestOtp(linkContact.trim(), user.role, addKind)
      setLinkStep('code')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to send code', 'error')
    } finally { setLinking(false) }
  }
  const confirmLink = async () => {
    if (!addKind || !user) return
    setLinking(true)
    try {
      await verifyOtp(linkContact.trim(), linkCode.trim(), user.role, undefined, addKind)
      await loadUser()
      toast.show('Account linked ✓', 'success')
      setAddKind(null); setLinkContact(''); setLinkCode('')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not link', 'error')
    } finally { setLinking(false) }
  }

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setBusinessName(user.business_name || '')
    api<Referral>('/api/me/referral').then(setReferral).catch(() => {})
  }, [user])

  const shareReferral = () => {
    if (!referral) return
    const text = encodeURIComponent(referral.share_text)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const copyCode = async () => {
    if (!referral) return
    try {
      await navigator.clipboard.writeText(referral.code)
      toast.show('Code copied', 'success')
    } catch {
      toast.show('Could not copy', 'error')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = { name }
      if (user?.role === 'vendor') body.business_name = businessName
      await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await loadUser()
      toast.show('Profile updated', 'success')
    } catch {
      toast.show('Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="px-4 space-y-4">
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Profile</h2>

          <div>
            <label className="text-xs text-text-secondary/60">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 outline-none mt-1"
            />
          </div>

          {user?.role === 'vendor' && (
            <div>
              <label className="text-xs text-text-secondary/60">Business name (optional)</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 outline-none mt-1"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-text-secondary/60">Phone</label>
            <p className="px-4 py-3 text-sm text-text-secondary">{user?.phone || '—'}</p>
          </div>

          <div>
            <label className="text-xs text-text-secondary/60">Role</label>
            <p className="px-4 py-3 text-sm text-text-secondary capitalize">{user?.role || '—'}</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-accent-primary rounded-xl text-white font-medium disabled:opacity-40 glow-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>

        {/* Sign-in methods (linked accounts) */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Sign-in methods</h2>
          <div className="space-y-1.5">
            {(user?.identities && user.identities.length > 0
              ? user.identities
              : [{ kind: user?.email ? 'email' : 'phone', value: user?.phone || user?.email || '—' }]
            ).map((id) => (
              <div key={id.value} className="flex items-center gap-2 text-sm">
                <span>{id.kind === 'phone' ? '📱' : '✉️'}</span>
                <span className="text-text-secondary">{id.value}</span>
              </div>
            ))}
          </div>

          {!addKind ? (
            <div className="flex gap-2">
              <button onClick={() => startLink('email')} className="flex-1 py-2 glass-light rounded-xl text-sm text-text-secondary">+ Email</button>
              <button onClick={() => startLink('phone')} className="flex-1 py-2 glass-light rounded-xl text-sm text-text-secondary">+ Phone</button>
            </div>
          ) : linkStep === 'contact' ? (
            <div className="space-y-2">
              <input
                value={linkContact}
                onChange={(e) => setLinkContact(e.target.value)}
                placeholder={addKind === 'email' ? 'New email' : 'New phone (0801…)'}
                className="w-full px-4 py-2.5 glass-light rounded-xl text-sm text-text-primary outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setAddKind(null)} className="flex-1 py-2 glass-light rounded-xl text-sm text-text-secondary">Cancel</button>
                <button onClick={sendLinkCode} disabled={linking} className="flex-1 py-2 bg-accent-primary rounded-xl text-sm text-white disabled:opacity-40">{linking ? 'Sending…' : 'Send code'}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value)}
                placeholder="Enter code"
                inputMode="numeric"
                className="w-full px-4 py-2.5 glass-light rounded-xl text-sm text-text-primary outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setAddKind(null)} className="flex-1 py-2 glass-light rounded-xl text-sm text-text-secondary">Cancel</button>
                <button onClick={confirmLink} disabled={linking} className="flex-1 py-2 bg-accent-primary rounded-xl text-sm text-white disabled:opacity-40">{linking ? 'Linking…' : 'Verify & link'}</button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-secondary/50">Link your phone and email to keep all your history in one account.</p>
        </div>

        {/* Referral / invite */}
        {referral && (
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-secondary">Invite & earn</h2>
              <span className="text-xs text-text-secondary/60">
                {referral.count} joined
              </span>
            </div>
            <p className="text-xs text-text-secondary/70">
              Share your code — friends use it when signing up.
            </p>
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between glass-light rounded-xl px-4 py-3"
            >
              <span className="text-lg font-bold tracking-[0.2em] text-accent-primary">
                {referral.code}
              </span>
              <span className="text-xs text-text-secondary/60">Tap to copy</span>
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={shareReferral}
              className="w-full py-3 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium"
            >
              Share on WhatsApp
            </motion.button>
          </div>
        )}

        <div className="glass rounded-xl p-4">
          <h2 className="text-sm font-medium text-text-secondary mb-3">Account</h2>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="w-full py-3 glass-light rounded-xl text-red-400 text-sm font-medium"
          >
            Log Out
          </motion.button>
        </div>
      </div>

      <GlassNavBar />
      <SideDrawer />
      <Toast />
    </div>
  )
}
