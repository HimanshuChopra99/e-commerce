import { useState } from 'react'
import { useSelector } from 'react-redux'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

function formatMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

const transactions = [
  { id: 1, title: 'Delivery payout — Order #1182', date: 'Today, 4:20 PM', amount: 12.5, type: 'credit' },
  { id: 2, title: 'Delivery payout — Order #1179', date: 'Today, 1:05 PM', amount: 8.4, type: 'credit' },
  { id: 3, title: 'Withdrawal to bank', date: 'Yesterday', amount: -40.0, type: 'debit' },
  { id: 4, title: 'Delivery payout — Order #1170', date: 'Yesterday, 6:40 PM', amount: 15.2, type: 'credit' },
]

export default function WalletPayouts() {
  const stats = useSelector((s) => s.app.stats) || {}
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-12">
      <PageHeader title="Wallet & Payouts" subtitle="Earnings and withdrawals" />

      <main className="px-margin-mobile pt-4 pb-8 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Balance hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#7b46e0] to-[#9a6bff] text-white p-5 shadow-lg shadow-primary/25">
          <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 opacity-90">
              <Icon name="account_balance_wallet" fill className="text-label-lg" />
              <span className="text-label-sm uppercase tracking-wider">Available Balance</span>
            </div>
            <p className="text-[34px] leading-none font-bold tracking-tight mt-2">
              {formatMoney(stats.earnings)}
            </p>
            <p className="text-label-sm text-white/80 mt-1">
              {formatMoney(stats.earningsToday)} earned today
            </p>

            <button
              onClick={() => setWithdrawOpen(true)}
              className="mt-4 w-full h-12 bg-white text-primary rounded-2xl font-bold text-label-lg transition-all active:scale-[0.98] shadow-md"
            >
              Withdraw Funds
            </button>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-emerald-600 flex items-center justify-center mb-2.5">
              <Icon name="payments" fill className="text-[18px]" />
            </div>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">Delivered</p>
            <p className="text-xl font-bold text-on-surface">{stats.deliveredCount ?? 0}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2.5">
              <Icon name="local_shipping" fill className="text-[18px]" />
            </div>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">In Transit</p>
            <p className="text-xl font-bold text-on-surface">{stats.inTransitCount ?? 0}</p>
          </div>
        </section>

        {/* Payout account */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider">
            Payout Account
          </h3>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-11 h-11 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
              <Icon name="account_balance" fill className="text-[20px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-lg font-bold text-on-surface">Chase Bank</p>
              <p className="text-label-sm text-on-surface-variant">Checking •••• 8841</p>
            </div>
            <button className="text-label-sm font-bold text-primary hover:text-primary/80 transition-colors">
              Change
            </button>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Recent Transactions
          </h3>
          <div className="mt-2 bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden">
            <ul className="divide-y divide-surface-container-high/40">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        t.type === 'credit'
                          ? 'bg-green-50 text-emerald-600'
                          : 'bg-error-container text-error'
                      }`}
                    >
                      <Icon
                        name={t.type === 'credit' ? 'south_west' : 'north_east'}
                        fill
                        className="text-[18px]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md font-bold text-on-surface truncate">{t.title}</p>
                      <p className="text-label-sm text-on-surface-variant">{t.date}</p>
                    </div>
                  </div>
                  <span
                    className={`text-body-lg font-bold shrink-0 ml-2 ${
                      t.type === 'credit' ? 'text-emerald-600' : 'text-on-surface'
                    }`}
                  >
                    {t.type === 'credit' ? '+' : ''}{formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* Withdraw dialog */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm anim-dialog-backdrop"
            onClick={() => setWithdrawOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest shadow-2xl anim-dialog">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <Icon name="payments" fill className="text-[28px]" />
              </div>
              <h2 className="text-headline-md font-bold text-on-surface">Withdraw funds</h2>
              <p className="text-body-md text-on-surface-variant mt-1 max-w-[260px]">
                Your earnings will be transferred to your linked bank account.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 mt-6">
              <button
                onClick={() => setWithdrawOpen(false)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold text-label-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
              >
                <Icon name="check" className="text-[18px]" /> Confirm Withdrawal
              </button>
              <button
                onClick={() => setWithdrawOpen(false)}
                className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-bold text-label-lg transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
