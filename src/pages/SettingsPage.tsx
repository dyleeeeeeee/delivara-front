import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import Toast, { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

export default function SettingsPage() {
  const { user, logout, loadUser } = useAuthStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setBusinessName(user.business_name || '')
  }, [user])

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
              <label className="text-xs text-text-secondary/60">Business Name</label>
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
