import Icon from '../components/Icon'
import Avatar from '../components/Avatar'

function TopAppBar() {
  return (
    <header className="sticky top-0 z-40 bg-surface/80 dark:bg-on-background/80 backdrop-blur-md border-b border-surface-container-high/40 transition-all">
      <div className="flex justify-between items-center w-full px-margin-mobile h-14 max-w-2xl mx-auto">
        <button
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant active:scale-95 transition-all text-on-surface-variant dark:text-outline-variant"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
        <h1 className="text-body-lg font-bold text-on-surface dark:text-on-background tracking-tight">
          Profile
        </h1>
        <button
          aria-label="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant active:scale-95 transition-all text-on-surface-variant dark:text-outline-variant"
        >
          <Icon name="settings" className="text-[20px]" />
        </button>
      </div>
    </header>
  )
}

const stats = [
  { label: 'Rating', value: '4.9', icon: 'star', accent: true },
  { label: 'Deliveries', value: '1,284', icon: 'local_shipping' },
  { label: 'Hours', value: '212', icon: 'schedule' },
]

const menuSections = [
  {
    title: 'Account Settings',
    items: [
      { label: 'Personal Details', icon: 'badge', subtitle: 'Name, Phone, Email & Address' },
      { label: 'Payment Methods', icon: 'credit_card', subtitle: 'Cards, Direct Deposit' },
      { label: 'Wallet & Payouts', icon: 'account_balance_wallet', subtitle: '$428.50 Available balance' },
    ],
  },
  {
    title: 'Support & Safety',
    items: [
      { label: 'Help Center', icon: 'help', subtitle: 'FAQs, 24/7 Live Support' },
      { label: 'Notifications', icon: 'notifications', subtitle: 'Order alerts, Sound settings' },
      { label: 'Privacy & Safety', icon: 'verified_user', subtitle: 'Security, Account permissions' },
    ],
  },
]

export default function Profile() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-28 select-none">
      <TopAppBar />

      <main className="px-margin-mobile pt-4 pb-12 max-w-2xl mx-auto flex flex-col gap-5">
        {/* ===== Hero Profile Card ===== */}
        <section className="bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col items-center relative overflow-hidden">
          {/* Subtle Background Radial Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

          {/* Avatar with Ring */}
          <div className="relative mb-3 mt-1">
            <Avatar
              name="Rakib Hossain"
              className="w-20 h-20 rounded-full border-4 border-surface-container-lowest shadow-md text-2xl font-bold ring-2 ring-primary/20"
            />
          </div>

          {/* Driver Name & ID */}
          <div className="text-center flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-headline-md font-extrabold text-on-surface tracking-tight">
                Rakib Hossain
              </h2>
              <Icon name="verified" fill className="text-primary text-[18px]" />
            </div>
            <p className="text-body-md text-on-surface-variant font-medium">
              Delivery Partner · <span className="font-bold text-on-surface">ID #DP-2847</span>
            </p>
          </div>

          {/* Verified Status Pill */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-label-sm font-bold">Active & Verified</span>
          </div>

          {/* Stats Bar */}
          <div className="w-full grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-surface-container-high/40">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-surface-container-low/60 rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center gap-0.5 border border-surface-container-high/30"
              >
                <div className="flex items-center gap-1">
                  <Icon
                    name={s.icon}
                    fill
                    className={`text-[15px] ${s.accent ? 'text-amber-500' : 'text-primary'}`}
                  />
                  <span className="text-body-lg font-extrabold text-on-surface tracking-tight tabular-nums">
                    {s.value}
                  </span>
                </div>
                <span className="text-label-sm text-on-surface-variant/80 font-semibold">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Menu Sections ===== */}
        {menuSections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
              {section.title}
            </h3>

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="divide-y divide-surface-container-high/40">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-surface-container-low/60 active:bg-surface-container-low transition-all duration-150 group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0 border border-surface-container-high/40 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon name={item.icon} fill className="text-[20px]" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-body-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                          {item.label}
                        </span>
                        {item.subtitle && (
                          <span className="text-label-sm text-on-surface-variant/70 font-medium truncate">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <Icon
                      name="chevron_right"
                      className="text-[18px] text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* ===== Logout Button ===== */}
        <div className="pt-2 flex flex-col gap-3">
          <button className="w-full h-12 bg-error-container/40 hover:bg-error-container/70 active:bg-error-container text-error rounded-2xl border border-error/10 font-bold text-body-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            <Icon name="logout" fill className="text-[18px]" />
            <span>Log Out Account</span>
          </button>

          {/* App Build Version Footer */}
          <p className="text-[11px] text-center text-on-surface-variant/50 font-medium">
            Delivery Partner App · Version 2.14.0 (Build 8924)
          </p>
        </div>
      </main>
    </div>
  )
}