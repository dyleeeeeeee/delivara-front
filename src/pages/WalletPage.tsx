import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import Toast, { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

interface Tx {
  type: string
  amount: number
  note?: string
}
interface Wallet {
  balance: number
  earnings: number
  transactions: Tx[]
  paystack_enabled: boolean
  pending_payout?: { amount: number; status: string } | null
}

const TX_LABEL: Record<string, string> = {
  fund: 'Wallet top-up',
  hold: 'Held for delivery',
  refund: 'Refund',
  earn: 'Delivery earnings',
  release: 'Released to rider',
  payout: 'Paid out',
}
const PRESETS = [1000, 2000, 5000, 10000]

export default function WalletPage() {
  const user = useAuthStore((s) => s.user)
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isRider = user?.role === 'rider'

  const [tab, setTab] = useState<'wallet' | 'earnings'>('wallet')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState('')
  const [funding, setFunding] = useState(false)

  // cash-out
  const [cashOpen, setCashOpen] = useState(false)
  const [coAmount, setCoAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [acctNum, setAcctNum] = useState('')
  const [acctName, setAcctName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setWallet(await api<Wallet>('/api/wallet'))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const ref = params.get('reference') || params.get('trxref')
    if (!ref) {
      load()
      return
    }
    ;(async () => {
      try {
        const res = await api<{ status: string }>(`/api/wallet/fund/verify?reference=${encodeURIComponent(ref)}`)
        toast.show(res.status === 'success' ? 'Wallet funded ✓' : 'Payment not completed', res.status === 'success' ? 'success' : 'error')
      } catch {
        toast.show('Could not verify payment', 'error')
      } finally {
        params.delete('reference')
        params.delete('trxref')
        setParams(params, { replace: true })
        load()
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fund = async () => {
    const naira = parseInt(amount, 10)
    if (!naira || naira < 100) {
      toast.show('Enter at least ₦100', 'error')
      return
    }
    setFunding(true)
    try {
      const res = await api<{ authorization_url: string }>('/api/wallet/fund/init', {
        method: 'POST',
        body: JSON.stringify({ amount: naira }),
      })
      window.location.href = res.authorization_url
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not start payment', 'error')
      setFunding(false)
    }
  }

  const openCashOut = () => {
    setCoAmount(String(wallet?.earnings ?? ''))
    setCashOpen(true)
  }

  const requestPayout = async () => {
    const amt = parseInt(coAmount, 10)
    if (!amt || amt <= 0) {
      toast.show('Enter an amount', 'error')
      return
    }
    if (!bankName.trim() || !acctNum.trim() || !acctName.trim()) {
      toast.show('Fill in your bank details', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/wallet/payout/request', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, bank_name: bankName, account_number: acctNum, account_name: acctName }),
      })
      toast.show('Payout requested ✓', 'success')
      setCashOpen(false)
      load()
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not request payout', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const earnings = wallet?.earnings ?? 0
  const pending = wallet?.pending_payout
  const earningsTx = (wallet?.transactions ?? []).filter((t) => t.type === 'earn' || t.type === 'payout')

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold">Wallet</h1>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-1 glass-light rounded-xl p-1">
          {([
            { key: 'wallet', label: 'Wallet' },
            { key: 'earnings', label: "Rider's Earnings" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-accent-primary text-white' : 'text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Wallet tab ─── */}
      {tab === 'wallet' && (
        <div className="px-4 space-y-4 mt-4">
          <div className="glass rounded-2xl p-5">
            <p className="text-xs text-text-secondary/60 uppercase tracking-wide">Balance</p>
            <p className="text-4xl font-bold mt-1">₦{(wallet?.balance ?? 0).toLocaleString()}</p>
            <p className="text-xs text-text-secondary/60 mt-2">Fund once, send anytime — the rider is paid on delivery.</p>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-text-secondary">Add money</h2>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`px-3 py-2 rounded-xl text-sm ${amount === String(p) ? 'bg-accent-primary text-white' : 'glass-light text-text-secondary'}`}
                >
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="flex items-center glass-light rounded-xl px-3 py-2.5">
              <span className="text-text-secondary mr-1">₦</span>
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Other amount" className="bg-transparent outline-none text-base text-text-primary w-full" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={fund} disabled={funding} className="w-full py-3 bg-accent-primary rounded-xl text-white font-medium disabled:opacity-40 glow-primary">
              {funding ? 'Redirecting…' : 'Fund with Paystack'}
            </motion.button>
            {wallet && !wallet.paystack_enabled && (
              <p className="text-[11px] text-yellow-400/80 text-center">Funding is being switched on — check back shortly.</p>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <h2 className="text-sm font-medium text-text-secondary mb-3">Recent activity</h2>
            {!wallet || wallet.transactions.length === 0 ? (
              <p className="text-xs text-text-secondary/50 py-2">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {wallet.transactions.map((t, i) => {
                  const credit = t.type === 'fund' || t.type === 'refund' || t.type === 'earn'
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{TX_LABEL[t.type] || t.type}</span>
                      <span className={credit ? 'text-green-400' : 'text-text-primary'}>
                        {credit ? '+' : '−'}₦{t.amount.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Rider's Earnings tab ─── */}
      {tab === 'earnings' && !isRider && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-10 opacity-50">
          <span className="text-5xl mb-3 grayscale">🏍️</span>
          <p className="text-base font-semibold text-text-secondary">Riders only</p>
          <p className="text-xs text-text-secondary/60 mt-2">
            This space is for dispatch riders. Start delivering to earn and cash out here.
          </p>
        </div>
      )}

      {tab === 'earnings' && isRider && (
        <div className="px-4 space-y-4 mt-4">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-green-500/15 to-accent-secondary/10 border border-green-500/25">
            <p className="text-xs text-green-400/70 uppercase tracking-wide">Available to cash out</p>
            <p className="text-5xl font-bold text-green-400 mt-1">₦{earnings.toLocaleString()}</p>
          </div>

          {pending && (
            <div className="glass-light rounded-xl px-4 py-3 flex items-center gap-2 border border-yellow-500/25">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs text-text-secondary">Payout of ₦{pending.amount.toLocaleString()} is being processed.</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openCashOut}
            disabled={earnings <= 0 || !!pending}
            className="w-full py-3.5 bg-green-500/90 rounded-xl text-white font-bold disabled:opacity-40"
          >
            {pending ? 'Payout in progress' : 'Cash out'}
          </motion.button>
          <p className="text-[11px] text-text-secondary/50 text-center">
            Payouts are sent to your bank manually, usually within 24 hours.
          </p>

          <div className="glass rounded-2xl p-4">
            <h2 className="text-sm font-medium text-text-secondary mb-3">Earnings history</h2>
            {earningsTx.length === 0 ? (
              <p className="text-xs text-text-secondary/50 py-2">No earnings yet — accept a delivery to start.</p>
            ) : (
              <div className="space-y-2">
                {earningsTx.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{TX_LABEL[t.type] || t.type}</span>
                    <span className={t.type === 'earn' ? 'text-green-400' : 'text-text-primary'}>
                      {t.type === 'earn' ? '+' : '−'}₦{t.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
        <button onClick={() => navigate('/')} className="w-full py-3 glass-light rounded-xl text-text-secondary text-sm">
          Back
        </button>
      </div>

      {/* Cash-out modal */}
      <AnimatePresence>
        {cashOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCashOpen(false)} className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 240 }} className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl p-5 pb-8 space-y-3">
            <div className="flex justify-center"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
              <h3 className="text-lg font-bold">Cash out</h3>
              <div className="flex items-center glass-light rounded-xl px-3 py-2.5">
                <span className="text-text-secondary mr-1">₦</span>
                <input type="number" inputMode="numeric" value={coAmount} onChange={(e) => setCoAmount(e.target.value)} placeholder="Amount" className="bg-transparent outline-none text-base text-text-primary w-full" />
              </div>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none" />
              <input value={acctNum} onChange={(e) => setAcctNum(e.target.value)} placeholder="Account number" inputMode="numeric" className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none" />
              <input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Account name" className="w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary outline-none" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={requestPayout} disabled={submitting} className="w-full py-3 bg-green-500/90 rounded-xl text-white font-bold disabled:opacity-40">
                {submitting ? 'Requesting…' : 'Request payout'}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GlassNavBar />
      <SideDrawer />
      <Toast />
    </div>
  )
}
