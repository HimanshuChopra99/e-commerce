import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const initialMethods = [
  { id: 1, type: 'card', brand: 'Visa', last4: '4242', expiry: '09/27', primary: true },
  { id: 2, type: 'bank', bank: 'Chase Bank', account: '•••• 8841', primary: false },
]

export default function PaymentMethods() {
  const [methods, setMethods] = useState(initialMethods)
  const [adding, setAdding] = useState(false)

  const setPrimary = (id) => {
    setMethods((m) => m.map((x) => ({ ...x, primary: x.id === id })))
  }

  const removeMethod = (id) => {
    setMethods((m) => m.filter((x) => x.id !== id))
  }

  const addCard = () => {
    const card = {
      id: Date.now(),
      type: 'card',
      brand: 'Mastercard',
      last4: '7788',
      expiry: '12/29',
      primary: methods.length === 0,
    }
    setMethods((m) => [...m, card])
    setAdding(false)
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-12">
      <PageHeader title="Payment Methods" subtitle="Cards & bank accounts" />

      <main className="px-margin-mobile pt-4 pb-8 max-w-2xl mx-auto flex flex-col gap-4">
        {/* Methods list */}
        <div className="flex flex-col gap-3">
          {methods.map((m) => (
            <div
              key={m.id}
              className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    m.type === 'card' ? 'bg-primary-fixed text-primary' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                  }`}
                >
                  <Icon name={m.type === 'card' ? 'credit_card' : 'account_balance'} fill className="text-[20px]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body-lg font-bold text-on-surface truncate">
                      {m.type === 'card' ? `${m.brand} •••• ${m.last4}` : m.bank}
                    </p>
                    {m.primary && (
                      <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full shrink-0">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-label-sm text-on-surface-variant">
                    {m.type === 'card' ? `Expires ${m.expiry}` : `Account ${m.account}`}
                  </p>
                </div>

                <button
                  onClick={() => removeMethod(m.id)}
                  aria-label="Remove payment method"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container/50 hover:text-error transition-colors"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>

              {!m.primary && (
                <button
                  onClick={() => setPrimary(m.id)}
                  className="mt-3 text-label-sm font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Set as primary
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        {adding ? (
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-primary/20 flex flex-col gap-3 anim-success">
            <div>
              <label className="text-label-sm text-on-surface-variant">Card number</label>
              <div className="mt-1 flex items-center gap-2.5 bg-surface-container rounded-xl px-3.5 py-3 border border-surface-container-highest focus-within:ring-2 focus-within:ring-primary/40">
                <Icon name="credit_card" className="text-[18px] text-on-surface-variant" />
                <input
                  placeholder="1234 5678 9012 3456"
                  className="w-full bg-transparent text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-bold text-label-lg transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={addCard}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold text-label-lg transition-all active:scale-[0.98] shadow-md shadow-primary/20"
              >
                Add Card
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full h-14 rounded-2xl border-2 border-dashed border-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-bold text-body-md"
          >
            <Icon name="add" className="text-[20px]" /> Add Payment Method
          </button>
        )}
      </main>
    </div>
  )
}
