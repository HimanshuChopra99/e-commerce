import Icon from '../components/Icon'
import { metrics, deliveryHistory } from '../data/mockData'

function TopAppBar() {
  return (
    <header className="bg-surface dark:bg-on-background docked full-width top-0 sticky z-40">
      <div className="flex justify-between items-center w-full px-margin-mobile h-14">
        <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant">
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-on-background">Earnings</h1>
        <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant">
          <Icon name="more_horiz" />
        </button>
      </div>
    </header>
  )
}

function DashboardGrid() {
  return (
    <section className="flex flex-col gap-md">
      {/* ===== Total Earnings hero card ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#7b46e0] to-[#9a6bff] text-white shadow-lg shadow-primary/25 p-md">
        {/* Decorative background elements */}
        <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10"></div>
        <div className="absolute right-16 -bottom-12 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="absolute right-24 top-10 opacity-10">
          <Icon name="account_balance_wallet" fill className="text-[90px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs opacity-90">
              <Icon name="account_balance_wallet" fill className="text-label-lg" />
              <h2 className="text-label-sm uppercase tracking-wider">Total Earnings</h2>
            </div>
            <span className="text-label-sm bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-semibold">
              This Month
            </span>
          </div>

          <div className="flex items-baseline gap-xs">
            <span className="text-[34px] leading-none font-bold tracking-tight">{metrics.totalEarnings}</span>
            <span className="text-label-sm opacity-80">/ mo</span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-label-sm mb-1 opacity-90">
              <span>Monthly Goal</span>
              <span className="font-semibold">{metrics.monthlyGoal}</span>
            </div>
            <div className="w-full bg-white/25 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full rounded-full w-[85%] shadow-[0_0_8px_rgba(255,255,255,0.6)]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tips, Deliveries, Incentive - clean aligned row ===== */}
<div className="grid grid-cols-2 gap-2.5">
  {/* Primary metric — full width */}
  <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
        <Icon name="local_atm" fill className="text-[22px]" />
      </div>
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">
          Tips Earned
        </span>
        <span className="block text-2xl font-bold text-on-surface tracking-tight tabular-nums">
          {metrics.tips}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full shrink-0">
      <Icon name="trending_up" className="text-[14px]" />
      <span className="text-[11px] font-bold">+12%</span>
    </div>
  </div>

  {/* Deliveries */}
  <div className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container-highest shadow-sm flex flex-col">
    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
      <Icon name="pedal_bike" fill className="text-[18px]" />
    </div>
    <span className="mt-2.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">
      Deliveries
    </span>
    <span className="mt-1 text-xl font-bold text-on-surface tabular-nums">
      {metrics.deliveries}
    </span>
    <span className="mt-1.5 text-[11px] text-on-surface-variant">Active 4 days</span>
  </div>

  {/* Incentive */}
  <div className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container-highest shadow-sm flex flex-col">
    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
      <Icon name="stars" fill className="text-[18px]" />
    </div>
    <span className="mt-2.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">
      Incentive
    </span>
    <span className="mt-1 text-xl font-bold text-on-surface tabular-nums">
      {metrics.incentive}
    </span>
    <div className="mt-auto pt-2 w-full">
      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
        <div className="bg-amber-500 h-full rounded-full w-[60%]" />
      </div>
      <span className="mt-1 block text-[10px] text-on-surface-variant truncate">
        {metrics.incentiveNote}
      </span>
    </div>
  </div>
</div>
    </section>
  )
}

function DeliveryHistory() {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex justify-between items-center">
        <h3 className="text-headline-md text-on-surface">Delivery History</h3>
        <button className="text-label-sm text-primary hover:underline">View All</button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] overflow-hidden">
        <ul className="divide-surface-variant">
          {deliveryHistory.map((d) => (
            <li
              key={d.name}
              className="p-md hover:bg-surface-container-low transition-colors duration-150 cursor-pointer flex items-center justify-between border-b border-surface-container last:border-0"
            >
              <div className="flex items-center gap-md">
                <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <Icon name={d.icon} fill />
                </div>
                <div className="flex flex-col">
                  <span className="text-body-lg font-bold text-on-surface">{d.name}</span>
                  <span className="text-label-sm text-on-surface-variant">{d.time}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-body-lg font-bold text-on-surface">{d.amount}</span>
                <span
                  className={`text-label-sm font-medium ${
                    d.hasTip ? 'text-[rgb(34,197,94)]' : 'text-on-surface-variant'
                  }`}
                >
                  {d.tip}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function Earnings() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-28">
      <TopAppBar />
      <main className="px-margin-mobile pt-md pb-xl max-w-7xl mx-auto flex flex-col gap-lg">
        <DashboardGrid />
        <DeliveryHistory />
      </main>
    </div>
  )
}
