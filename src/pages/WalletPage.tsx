import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassNavBar from '../components/GlassNavBar'
import SideDrawer from '../components/SideDrawer'
import Toast, { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

interface Tx {
  type: string
  amount: number
  note?: string
  created_at?: string
}
interface Wallet {
  balance: number
  earnings: number
  transactions: Tx[]
  paystack_enabled: boolean
}

const TX_LABEL: Record<string, string> = {
  fund: 'Wallet top-up',
  hold: 'Held for delivery',
  refund: 'Refund',
  earn: 'Delivery earnings',
  release: 'Released to rider',
  payout: 'Payout',
}

const PRESETS = [1000, 2000, 5000, 10000]

export default function WalletPage() {
  const user = useAuthStore((s) => s.user)
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState('')
  const [funding, setFunding] = useState(false)

  const load = useCallback(async () => {
    try {
      setWallet(await api<Wallet>('/api/wallet'))
    } catch {
      /* ignore */
    }
  }, [])

  // On return from Paystack, verify the reference and credit the wallet.
  useEffect(() => {
    const ref = params.get('reference') || params.get('trxref')
    if (!ref) {
      load()
      return
    }
    ;(async () => {
      try {
        const res = await api<{ status: string }>(`/api/wallet/fund/verify?reference=${encodeURIComponent(ref)}`)
        if (res.status === 'success') toast.show('Wallet funded ✓', 'success')
        else toast.show('Payment not completed', 'error')
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
      window.location.href = res.authorization_url // redirect to Paystack
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not start payment', 'error')
      setFunding(false)
    }
  }

  const isRider = user?.role === 'rider'

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold">Wallet</h1>
        <p className="text-xs text-text-secondary mt-1">Fund once, send anytime — the rider is paid on delivery.</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Balance */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-text-secondary/60 uppercase tracking-wide">Balance</p>
          <p className="text-4xl font-bold mt-1">
            ₦{(wallet?.balance ?? 0).toLocaleString()}
          </p>
          {isRider && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-text-secondary/70">Earnings (withdrawable)</span>
              <span className="text-sm font-bold text-green-400">₦{(wallet?.earnings ?? 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Fund */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Add money</h2>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`px-3 py-2 rounded-xl text-sm ${
                  amount === String(p) ? 'bg-accent-primary text-white' : 'glass-light text-text-secondary'
                }`}
              >
                ₦{p.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex items-center glass-light rounded-xl px-3 py-2.5">
            <span className="text-text-secondary mr-1">₦</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Other amount"
              className="bg-transparent outline-none text-base text-text-primary w-full"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={fund}
            disabled={funding}
            className="w-full py-3 bg-accent-primary rounded-xl text-white font-medium disabled:opacity-40 glow-primary"
          >
            {funding ? 'Redirecting…' : 'Fund with Paystack'}
          </motion.button>
          {wallet && !wallet.paystack_enabled && (
            <p className="text-[11px] text-yellow-400/80 text-center">
              Funding is being switched on — check back shortly.
            </p>
          )}
        </div>

        {/* History */}
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

        <button onClick={() => navigate('/')} className="w-full py-3 glass-light rounded-xl text-text-secondary text-sm">
          Back
        </button>
      </div>

      <GlassNavBar />
      <SideDrawer />
      <Toast />
    </div>
  )
}
