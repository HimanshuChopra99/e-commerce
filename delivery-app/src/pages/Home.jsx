import { useDispatch, useSelector } from 'react-redux'
import Icon from '../components/Icon'
import MapBackground from '../components/MapBackground'
import { setOnline } from '../store/slices/appSlice'
import { recentActivity, earningsBars } from '../data/mockData'

function TopAppBar() {
  return (
    <header className="bg-surface dark:bg-on-background docked full-width top-0 sticky z-40 transition-all duration-200">
      <div className="flex justify-between items-center w-full px-margin-mobile h-14">
        <button className="text-on-surface dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-surface-variant rounded-full p-2 transition-all duration-200 active:opacity-70 flex items-center justify-center">
          <Icon name="menu" />
        </button>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-on-background">Live Tracking</h1>
        <button className="text-on-surface dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-surface-variant rounded-full p-2 transition-all duration-200 active:opacity-70 flex items-center justify-center relative">
          <Icon name="notifications" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
      </div>
    </header>
  )
}

function StatusToggle() {
  const online = useSelector((s) => s.app.online)
  const dispatch = useDispatch()

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-sm shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] flex flex-row items-center justify-between border border-surface-container-highest">
      <div className="flex items-center space-x-sm ml-xs">
        <div
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            online ? 'bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-surface-container-highest'
          }`}
        ></div>
        <span
          className={`text-body-lg font-semibold transition-colors duration-300 ${
            online ? 'text-primary' : 'text-on-surface'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      <button
        role="switch"
        aria-checked={online}
        onClick={() => dispatch(setOnline(!online))}
        className="relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 cursor-pointer shrink-0"
        style={{ backgroundColor: online ? '#8b5cf6' : '#e1e3e4' }}
      >
        <span
          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white border-4 shadow-sm transition-transform duration-300 ease-in-out"
          style={{
            borderColor: online ? '#8b5cf6' : '#e1e3e4',
            transform: online ? 'translateX(32px)' : 'translateX(0)',
          }}
        ></span>
      </button>
    </div>
  )
}

function StatsBento() {
  return (
    <section className="grid grid-cols-2 gap-sm">
      {/* Today's earnings with mini bar chart */}
      <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-md shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] flex flex-col justify-between border border-surface-container-highest relative overflow-hidden">
        <div className="flex flex-row items-center justify-between z-10 relative">
          <div className="flex items-center space-x-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="account_balance_wallet" fill />
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Today's Earnings</p>
              <p className="text-display-lg text-on-surface font-bold">$124.50</p>
            </div>
          </div>
          <Icon name="chevron_right" className="text-outline" />
        </div>
        <div className="flex items-end justify-between space-x-1 mt-md h-12 z-10 relative opacity-70">
          {earningsBars.map((h, i) => (
            <div
              key={i}
              className={`w-full rounded-t-sm ${
                i === earningsBars.length - 2
                  ? 'bg-primary h-full'
                  : i < earningsBars.length - 2
                  ? 'bg-primary/20'
                  : 'bg-surface-container'
              }`}
              style={{ height: `${h}%` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Deliveries */}
      <div className="bg-surface-container-lowest rounded-2xl p-md shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] flex flex-col justify-between border border-surface-container-highest">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-sm">
          <Icon name="local_shipping" fill />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Deliveries</p>
          <p className="text-headline-lg-mobile text-on-surface font-bold">14</p>
        </div>
      </div>

      {/* Hours online */}
      <div className="bg-surface-container-lowest rounded-2xl p-md shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] flex flex-col justify-between border border-surface-container-highest">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-sm">
          <Icon name="schedule" fill />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Hours Online</p>
          <p className="text-headline-lg-mobile text-on-surface font-bold">5.2</p>
        </div>
      </div>
    </section>
  )
}

function MapPreview() {
  return (
    <section className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] h-56 relative border border-surface-container-highest">
      <div className="absolute inset-0">
        <MapBackground showRoute={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent mix-blend-multiply"></div>
      <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-error/20 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute top-sm right-sm bg-surface-container-lowest/90 backdrop-blur-md px-sm py-1 rounded-full border border-surface-container-highest shadow-sm flex items-center space-x-1 text-xs font-semibold text-primary">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        <span>High Demand</span>
      </div>
      <div className="absolute bottom-md left-md right-md bg-surface-container-lowest/95 backdrop-blur-md p-sm rounded-xl flex items-center space-x-sm shadow-sm border border-surface-container-highest">
        <Icon name="my_location" className="text-primary" />
        <p className="text-body-md text-on-surface truncate font-semibold">Downtown Core, Zone A</p>
      </div>
    </section>
  )
}

function RecentActivity() {
  return (
    <section>
      <div className="flex justify-between items-end mb-sm">
        <h3 className="text-headline-md text-on-surface">Recent Activity</h3>
        <a className="text-label-sm text-primary hover:text-primary/80 transition-colors" href="#!">
          See All
        </a>
      </div>
      <div className="space-y-xs">
        {recentActivity.map((a) => (
          <div
            key={a.order}
            className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-container-highest flex justify-between items-center"
          >
            <div className="flex items-center space-x-sm">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <Icon name="check_circle" />
              </div>
              <div>
                <p className="text-body-lg text-on-surface font-semibold">Order {a.order}</p>
                <p className="text-body-md text-on-surface-variant text-sm">
                  {a.time} • {a.miles}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-body-lg text-on-surface font-bold">{a.amount}</p>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 tracking-wide uppercase mt-1">
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <TopAppBar />
      <main className="px-margin-mobile mt-lg max-w-2xl mx-auto space-y-lg">
        {/* Welcome */}
        <section className="flex flex-col space-y-md">
          <div>
            <h2 className="text-headline-lg-mobile text-on-surface">Good morning, Partner</h2>
            <p className="text-body-md text-on-surface-variant">Ready to hit the road?</p>
          </div>
          <StatusToggle />
        </section>

        <StatsBento />
        <MapPreview />
        <RecentActivity />
      </main>
    </div>
  )
}
