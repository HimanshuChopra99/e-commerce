import {
  CheckCircle2,
  CircleAlert,
  Heart,
  Info,
  PackageCheck,
  ShoppingCart,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'

const styles = {
  cart: {
    Icon: ShoppingCart,
    title: 'Cart updated',
    icon: 'bg-[#FFA52F] text-[#232321]',
    line: 'bg-[#FFA52F]',
  },
  favourite: {
    Icon: Heart,
    title: 'Favourites updated',
    icon: 'bg-rose-100 text-rose-600',
    line: 'bg-rose-500',
  },
  profile: {
    Icon: UserRound,
    title: 'Profile updated',
    icon: 'bg-[#4A69E2]/10 text-[#4A69E2]',
    line: 'bg-[#4A69E2]',
  },
  order: {
    Icon: PackageCheck,
    title: 'Order update',
    icon: 'bg-emerald-100 text-emerald-700',
    line: 'bg-emerald-500',
  },
  error: {
    Icon: CircleAlert,
    title: 'Something went wrong',
    icon: 'bg-red-100 text-red-600',
    line: 'bg-red-500',
  },
  warning: {
    Icon: TriangleAlert,
    title: 'Please note',
    icon: 'bg-amber-100 text-amber-700',
    line: 'bg-amber-500',
  },
  info: {
    Icon: Info,
    title: 'Information',
    icon: 'bg-sky-100 text-sky-700',
    line: 'bg-sky-500',
  },
  success: {
    Icon: CheckCircle2,
    title: 'Success',
    icon: 'bg-emerald-100 text-emerald-700',
    line: 'bg-emerald-500',
  },
}

export default function Toast({ toast, onDismiss }) {
  const config = styles[toast?.type] || styles.success
  const Icon = config.Icon
  const title = toast?.title || config.title

  return (
    <div
      role={toast?.type === 'error' ? 'alert' : 'status'}
      aria-live={toast?.type === 'error' ? 'assertive' : 'polite'}
      className='kick-toast-enter fixed bottom-5 left-4 right-4 z-[120] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#232321] shadow-[0_20px_55px_rgba(35,35,33,0.18)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm'
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${config.line}`} aria-hidden />
      <div className='flex items-center gap-3 p-3.5 pl-4'>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${config.icon}`}>
          <Icon className={`size-5 ${toast?.type === 'favourite' ? 'fill-current' : ''}`} strokeWidth={2.3} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-[11px] font-black uppercase tracking-[0.12em] text-neutral-400'>{title}</p>
          <p className='mt-0.5 text-sm font-bold leading-snug text-[#232321]'>{toast?.message}</p>
        </div>
        <button
          type='button'
          onClick={onDismiss}
          aria-label='Dismiss notification'
          className='grid size-8 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-[#232321]'
        >
          <X className='size-4' />
        </button>
      </div>
    </div>
  )
}
