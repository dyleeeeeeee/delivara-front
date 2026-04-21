import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Platform = 'android' | 'ios' | 'desktop' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (window.matchMedia('(display-mode: standalone)').matches) return null // already installed
  return 'desktop'
}

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosSheetOpen, setIosSheetOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed or user dismissed this session
    if (isInstalled() || sessionStorage.getItem('install_dismissed')) return

    // Android/desktop: wait for browser's beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show after a short delay so it doesn't interrupt initial load
      setTimeout(() => setVisible(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show our custom prompt after delay (no beforeinstallprompt on iOS)
    const ua = navigator.userAgent
    if (/iphone|ipad|ipod/i.test(ua) && !isInstalled()) {
      setTimeout(() => setVisible(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('install_dismissed', '1')
  }

  const handleInstall = async () => {
    const p = detectPlatform()
    if (p === 'ios') {
      setIosSheetOpen(true)
      return
    }
    if (!deferredPrompt) return
    const prompt = deferredPrompt as BeforeInstallPromptEvent
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  // Don't render at all if already installed
  if (isInstalled() || dismissed) return null

  // Only show the button if we have a prompt ready (Android/desktop)
  // or we're on iOS (where we guide manually)
  const canShow = deferredPrompt !== null || /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <>
      {/* Floating install pill — bottom left, above navbar */}
      <AnimatePresence>
        {visible && canShow && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-24 left-4 z-[60] flex items-center"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleInstall}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
              }}
            >
              <span className="text-base">📲</span>
              <span>Install App</span>
            </motion.button>

            {/* Dismiss X */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={dismiss}
              className="ml-2 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <span className="text-xs">✕</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS install instructions sheet */}
      <AnimatePresence>
        {iosSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[70]"
              onClick={() => setIosSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl p-6 pb-10"
              style={{
                background: 'rgba(11,15,26,0.98)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-2xl">
                  🚚
                </div>
                <div>
                  <h3 className="font-bold text-white">Install Delivara</h3>
                  <p className="text-xs text-text-secondary">Add to your home screen</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { step: '1', icon: '⬆️', text: 'Tap the Share button at the bottom of Safari' },
                  { step: '2', icon: '📋', text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: '3', icon: '✅', text: 'Tap "Add" in the top right corner' },
                ].map(({ step, icon, text }) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-accent-primary">{step}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span>{icon}</span>
                      <p className="text-sm text-text-secondary">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setIosSheetOpen(false); dismiss() }}
                className="w-full mt-6 py-3 bg-accent-primary rounded-2xl text-white font-semibold text-sm"
              >
                Got it
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Type augmentation for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
