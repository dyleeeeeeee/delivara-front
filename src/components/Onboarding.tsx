import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/auth'
import OtpInput from './OtpInput'
import Map from './Map'

type Step = 'welcome' | 'method' | 'role' | 'email' | 'phone' | 'otp' | 'complete'

export default function Onboarding() {
  const navigate = useNavigate()
  const { requestOtp, verifyOtp, loading, error, clearError, token, user } = useAuthStore()

  const [step, setStep] = useState<Step>('welcome')
  const [method, setMethod] = useState<'email' | 'phone'>('phone')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'vendor' | 'rider'>('vendor')
  const [referralCode, setReferralCode] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [sending, setSending] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(Date.now())

  const showError = localError || error || ''

  // Redirect already-authenticated users to home
  useEffect(() => {
    if (token && user && step !== 'complete') {
      navigate('/', { replace: true })
    }
  }, [token, user, step, navigate])

  // Cooldown ticker for Resend OTP button
  useEffect(() => {
    if (resendAt <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [resendAt])

  const handleRequestOtp = async (contact: string) => {
    if (sending) return
    setLocalError('')
    clearError()
    setSending(true)
    try {
      const code = await requestOtp(contact, role, method)
      setDevCode(code)
      setResendAt(Date.now() + 30_000) // 30s cooldown
      setStep('otp')
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async () => {
    const contact = method === 'email' ? email : phone
    if (!contact) return
    if (resendAt > Date.now()) return
    setOtp('')
    await handleRequestOtp(contact)
  }

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? otp
    if (codeToVerify.length < 6 || loading) return
    setLocalError('')
    clearError()
    try {
      const contact = method === 'email' ? email : phone
      await verifyOtp(contact, codeToVerify, role, referralCode || undefined, method)
      setStep('complete')
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Invalid or expired code')
      setOtp('')
    }
  }

  // Auto-submit OTP once all 6 digits are entered
  useEffect(() => {
    if (step === 'otp' && otp.length === 6 && !loading) {
      handleVerify(otp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  const handleComplete = () => {
    navigate('/', { replace: true })
  }

  // Progress bar reflects only the screens this user will see
  const activeContactStep: Step = method
  const flowSteps: { id: Step; title: string }[] = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'method', title: 'Method' },
    { id: 'role', title: 'Role' },
    { id: activeContactStep, title: method === 'email' ? 'Email' : 'Phone' },
    { id: 'otp', title: 'Verify' },
    { id: 'complete', title: 'Done' },
  ]
  const currentStepIndex = flowSteps.findIndex((s) => s.id === step)
  const resendSecondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000))

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Map center={[3.3792, 6.5244]} zoom={12} />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black/50" />

      {/* Progress indicator */}
      <div className="absolute top-8 left-0 right-0 z-20 px-6">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={flowSteps.length} aria-valuenow={currentStepIndex + 1}>
            {flowSteps.map((s, i) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= currentStepIndex ? 'bg-accent-primary' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Glass card centered */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm glass rounded-3xl p-8 space-y-6"
          style={{ boxShadow: '0 8px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)' }}
        >
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <WelcomeScreen key="welcome" onNext={() => setStep('method')} />
            )}

            {step === 'method' && (
              <MethodSelection key="method" onSelect={setMethod} onNext={() => setStep('role')} />
            )}

            {step === 'role' && (
              <RoleSelection
                key="role"
                role={role}
                onChange={setRole}
                onNext={() => setStep(method)}
                referralCode={referralCode}
                onReferralChange={setReferralCode}
              />
            )}

            {step === 'email' && (
              <EmailInput
                key="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLocalError('') }}
                onNext={() => handleRequestOtp(email)}
                onBack={() => setStep('role')}
                error={showError}
                sending={sending}
              />
            )}

            {step === 'phone' && (
              <PhoneInput
                key="phone"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setLocalError('') }}
                onNext={() => handleRequestOtp(phone)}
                onBack={() => setStep('role')}
                error={showError}
                sending={sending}
              />
            )}

            {step === 'otp' && (
              <OtpVerification
                key="otp"
                contact={method === 'email' ? email : phone}
                method={method}
                devCode={devCode}
                otp={otp}
                onChange={setOtp}
                onVerify={() => handleVerify()}
                onBack={() => { setStep(method); setOtp(''); setLocalError(''); clearError() }}
                onResend={handleResend}
                resendSecondsLeft={resendSecondsLeft}
                sending={sending}
                loading={loading}
                error={showError}
              />
            )}

            {step === 'complete' && (
              <CompleteScreen key="complete" onContinue={handleComplete} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-6 text-center"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-accent-primary/20 border border-accent-primary/30"
        >
          <span className="text-4xl">🚚</span>
        </motion.div>
        <div>
          <h1 className="text-3xl font-bold text-white">Delivra</h1>
          <p className="text-text-secondary mt-2 text-sm">Real-time delivery platform</p>
        </div>
      </div>

      <div className="space-y-3 text-left">
        <FeatureItem icon="⚡" text="Instant delivery tracking" />
        <FeatureItem icon="📍" text="Real-time location updates" />
        <FeatureItem icon="📱" text="Easy rider & vendor tools" />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="w-full py-3.5 bg-accent-primary rounded-xl text-white font-semibold text-sm glow-primary"
      >
        Get Started →
      </motion.button>
    </motion.div>
  )
}

function MethodSelection({ onSelect, onNext }: { onSelect: (m: 'email' | 'phone') => void; onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">How would you like to sign up?</h2>
        <p className="text-text-secondary mt-2 text-sm">Choose your preferred verification method</p>
      </div>

      <div className="space-y-3">
        <MethodCard
          icon="📧"
          title="Email"
          description="Get a code via email"
          onClick={() => { onSelect('email'); onNext() }}
        />
        <MethodCard
          icon="📱"
          title="Phone"
          description="Get a code via SMS"
          onClick={() => { onSelect('phone'); onNext() }}
        />
      </div>
    </motion.div>
  )
}

function MethodCard({ icon, title, description, onClick }: { icon: string; title: string; description: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-4 glass-light rounded-2xl text-left hover:bg-white/5 transition-all border border-white/10"
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-text-secondary text-xs">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function EmailInput({ value, onChange, onNext, onBack, error, sending }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onNext: () => void; onBack: () => void; error: string; sending: boolean }) {
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setIsValid(emailRegex.test(value))
  }, [value])

  const canContinue = isValid && !sending

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Enter your email</h2>
        <p className="text-text-secondary mt-2 text-sm">We'll send you a verification code</p>
      </div>

      <div className="space-y-3">
        <label className="sr-only" htmlFor="onboarding-email">Email address</label>
        <input
          id="onboarding-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder="you@example.com"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => e.key === 'Enter' && canContinue && onNext()}
          aria-invalid={!!value && !isValid}
          className="w-full px-4 py-3.5 glass-light rounded-xl text-white placeholder:text-text-secondary/50 outline-none text-sm border border-transparent focus:border-accent-primary/50 transition-all"
        />

        {value && (
          <div className="flex items-center gap-2 text-xs">
            {isValid ? (
              <span className="text-green-400">✓ Looks good</span>
            ) : (
              <span className="text-red-400">Enter a valid email</span>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-xs text-center" role="alert">{error}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 glass-light rounded-xl text-text-secondary text-sm"
        >
          ← Back
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm disabled:opacity-40 glow-primary flex items-center justify-center gap-2"
        >
          {sending ? (<><Spinner /> Sending…</>) : 'Continue'}
        </motion.button>
      </div>
    </motion.div>
  )
}

function PhoneInput({ value, onChange, onNext, onBack, error, sending }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onNext: () => void; onBack: () => void; error: string; sending: boolean }) {
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    // At least 10 digits; symbols allowed but ignored
    const digits = value.replace(/\D/g, '')
    setIsValid(digits.length >= 10)
  }, [value])

  const canContinue = isValid && !sending

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Enter your phone</h2>
        <p className="text-text-secondary mt-2 text-sm">We'll send you an SMS verification code</p>
      </div>

      <div className="space-y-3">
        <label className="sr-only" htmlFor="onboarding-phone">Phone number</label>
        <input
          id="onboarding-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          autoFocus
          placeholder="+234 800 000 0000"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => e.key === 'Enter' && canContinue && onNext()}
          aria-invalid={!!value && !isValid}
          className="w-full px-4 py-3.5 glass-light rounded-xl text-white placeholder:text-text-secondary/50 outline-none text-sm border border-transparent focus:border-accent-primary/50 transition-all"
        />

        <p className="text-[11px] text-text-secondary/60">
          Nigerian number? Type it as <span className="font-mono">0801…</span> — we'll add <span className="font-mono">+234</span> for you.
        </p>

        {value && (
          <div className="flex items-center gap-2 text-xs">
            {isValid ? (
              <span className="text-green-400">✓ Looks good</span>
            ) : (
              <span className="text-red-400">Enter at least 10 digits</span>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-xs text-center" role="alert">{error}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 glass-light rounded-xl text-text-secondary text-sm"
        >
          ← Back
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm disabled:opacity-40 glow-primary flex items-center justify-center gap-2"
        >
          {sending ? (<><Spinner /> Sending…</>) : 'Continue'}
        </motion.button>
      </div>
    </motion.div>
  )
}

function OtpVerification({ contact, method, devCode, otp, onChange, onVerify, onBack, onResend, resendSecondsLeft, sending, loading, error }: { contact: string; method: 'email' | 'phone'; devCode: string; otp: string; onChange: (v: string) => void; onVerify: () => void; onBack: () => void; onResend: () => void; resendSecondsLeft: number; sending: boolean; loading: boolean; error: string }) {
  const showDev = devCode && import.meta.env.DEV

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Verify your {method}</h2>
        <p className="text-text-secondary mt-2 text-sm">
          Code sent to <span className="text-white font-medium">{contact}</span>
        </p>
      </div>

      {showDev && (
        <div className="text-center bg-accent-primary/10 border border-accent-primary/20 rounded-xl py-3 px-4">
          <p className="text-[10px] text-text-secondary mb-1">Dev OTP</p>
          <p className="text-accent-primary font-bold font-mono tracking-[0.3em] text-xl">{devCode}</p>
        </div>
      )}

      <OtpInput value={otp} onChange={onChange} />

      {error && <p className="text-red-400 text-xs text-center" role="alert">{error}</p>}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onVerify}
        disabled={otp.length < 6 || loading}
        className="w-full py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm disabled:opacity-40 glow-primary flex items-center justify-center gap-2"
      >
        {loading ? (<><Spinner /> Verifying…</>) : 'Verify'}
      </motion.button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onBack}
          className="text-text-secondary hover:text-white transition"
        >
          ← Change {method}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={resendSecondsLeft > 0 || sending}
          className="text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {sending
            ? 'Sending…'
            : resendSecondsLeft > 0
              ? `Resend in ${resendSecondsLeft}s`
              : 'Resend code'}
        </button>
      </div>
    </motion.div>
  )
}

function RoleSelection({ role, onChange, onNext, referralCode, onReferralChange }: { role: 'vendor' | 'rider'; onChange: (r: 'vendor' | 'rider') => void; onNext: () => void; referralCode: string; onReferralChange: (v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Choose your role</h2>
        <p className="text-text-secondary mt-2 text-sm">How will you use Delivra?</p>
      </div>

      <div className="flex gap-2">
        {(['vendor', 'rider'] as const).map((r) => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all capitalize ${
              role === r
                ? 'bg-accent-primary text-white glow-primary'
                : 'glass-light text-text-secondary'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {role === 'rider' && (
        <input
          placeholder="Referral code (optional)"
          value={referralCode}
          onChange={(e) => onReferralChange(e.target.value)}
          className="w-full px-4 py-3 glass-light rounded-xl text-white placeholder:text-text-secondary/50 outline-none text-sm border border-transparent focus:border-accent-primary/50 transition-all"
        />
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="w-full py-3 bg-accent-primary rounded-xl text-white font-semibold text-sm glow-primary"
      >
        Continue →
      </motion.button>
    </motion.div>
  )
}

function CompleteScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30"
      >
        <span className="text-4xl">✓</span>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white">Welcome to Delivra!</h2>
        <p className="text-text-secondary mt-2 text-sm">Your account is ready to go</p>
      </div>

      <div className="space-y-2 text-left">
        <NextStep icon="📦" text="Create your first delivery" />
        <NextStep icon="📍" text="Track in real-time" />
        <NextStep icon="⚡" text="Get instant notifications" />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full py-3.5 bg-accent-primary rounded-xl text-white font-semibold text-sm glow-primary"
      >
        Start Using Delivra →
      </motion.button>
    </motion.div>
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-3 p-3 glass-light rounded-xl"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-text-secondary">{text}</span>
    </motion.div>
  )
}

function NextStep({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-3"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-text-secondary">{text}</span>
    </motion.div>
  )
}
