import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import OtpInput from '../components/OtpInput'
import Map from '../components/Map'

export default function LoginPage() {
  const navigate = useNavigate()
  const { requestOtp, verifyOtp, loading, error, clearError, token, user } = useAuthStore()

  useEffect(() => {
    if (token && user) {
      navigate('/')
    }
  }, [token, user, navigate])

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'vendor' | 'rider'>('vendor')
  const [referralCode, setReferralCode] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState('')
  const [localError, setLocalError] = useState('')

  const showError = localError || error || ''

  const handleRequestOtp = async () => {
    if (!phone) return
    setLocalError('')
    clearError()
    try {
      const code = await requestOtp(phone, role)
      setDevCode(code)
      setStep('otp')
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send OTP')
    }
  }

  const handleVerify = async () => {
    if (otp.length < 6 || loading) return
    setLocalError('')
    clearError()
    try {
      await verifyOtp(phone, otp, role, referralCode || undefined)
      navigate('/')
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Invalid or expired code')
      setOtp('')
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Map center={[3.3792, 6.5244]} zoom={12} />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black/50" />

      {/* Glass card centered */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm glass rounded-3xl p-8 space-y-7"
          style={{ boxShadow: '0 8px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)' }}
        >
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-primary/20 border border-accent-primary/30 mb-3">
              <span className="text-2xl">🚚</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Delivara</h1>
            <p className="text-text-secondary mt-1 text-sm">Real-time delivery platform</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  {(['vendor', 'rider'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                        role === r
                          ? 'bg-accent-primary text-white glow-primary'
                          : 'glass-light text-text-secondary'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setLocalError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  className="w-full px-4 py-3 glass-light rounded-xl text-white placeholder:text-text-secondary/50 outline-none text-sm"
                />

                {role === 'rider' && (
                  <input
                    placeholder="Referral code (optional)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="w-full px-4 py-3 glass-light rounded-xl text-white placeholder:text-text-secondary/50 outline-none text-sm"
                  />
                )}

                {showError && (
                  <p className="text-red-400 text-xs text-center">{showError}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRequestOtp}
                  disabled={!phone}
                  className="w-full py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm disabled:opacity-40 glow-primary"
                >
                  Get OTP
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <p className="text-center text-text-secondary text-sm">
                  Code sent to{' '}
                  <span className="text-white font-medium">{phone}</span>
                </p>

                {devCode && (
                  <div className="text-center bg-accent-primary/10 border border-accent-primary/20 rounded-xl py-2.5 px-4">
                    <p className="text-[10px] text-text-secondary mb-1">Dev OTP</p>
                    <p className="text-accent-primary font-bold font-mono tracking-[0.3em] text-xl">{devCode}</p>
                  </div>
                )}

                <OtpInput value={otp} onChange={setOtp} />

                {showError && (
                  <p className="text-red-400 text-xs text-center">{showError}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleVerify}
                  disabled={otp.length < 6 || loading}
                  className="w-full py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm disabled:opacity-40 glow-primary"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify'}
                </motion.button>

                <button
                  onClick={() => { setStep('phone'); setOtp(''); setLocalError(''); clearError() }}
                  className="w-full text-center text-text-secondary text-xs"
                >
                  ← Change number
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
