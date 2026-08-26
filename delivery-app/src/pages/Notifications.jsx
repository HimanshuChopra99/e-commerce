import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Switch from '../components/Switch';
import Icon from '../components/Icon';

const notifications = [
  {
    id: 1,
    icon: 'local_shipping',
    title: 'New order available',
    body: 'A delivery order is ready near you.',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    icon: 'payments',
    title: 'Payment received',
    body: '$12.50 was credited to your wallet.',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: 3,
    icon: 'campaign',
    title: 'High demand in your area',
    body: 'Earn up to 1.5x on orders in Downtown Core.',
    time: '3 hrs ago',
    unread: false,
  },
  {
    id: 4,
    icon: 'verified_user',
    title: 'Account verified',
    body: 'Your delivery partner profile is verified.',
    time: 'Yesterday',
    unread: false,
  },
];

export default function Notifications() {
  const [settings, setSettings] = useState({
    orderAlerts: true,
    earnings: true,
    promotions: true,
    sound: true,
  });

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const rows = [
    {
      key: 'orderAlerts',
      icon: 'local_shipping',
      title: 'Order Alerts',
      subtitle: 'New and nearby order notifications',
    },
    {
      key: 'earnings',
      icon: 'payments',
      title: 'Earnings',
      subtitle: 'Payout and wallet updates',
    },
    {
      key: 'promotions',
      icon: 'campaign',
      title: 'Promotions & Tips',
      subtitle: 'Demand surges and bonus offers',
    },
    {
      key: 'sound',
      icon: 'volume_up',
      title: 'Notification Sound',
      subtitle: 'Play a sound for new alerts',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-12">
      <PageHeader title="Notifications" subtitle="Alerts & preferences" />

      <main className="px-margin-mobile pt-4 pb-8 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Notification preferences */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Preferences
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 p-3.5">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0 border border-surface-container-high/40">
                  <Icon name={r.icon} fill className="text-[20px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-lg font-bold text-on-surface">
                    {r.title}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {r.subtitle}
                  </p>
                </div>
                <Switch
                  checked={settings[r.key]}
                  onChange={() => toggle(r.key)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Recent notifications */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Recent
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.unread
                      ? 'bg-primary-fixed text-primary'
                      : 'bg-surface-container-low text-on-surface-variant border border-surface-container-high/40'
                  }`}
                >
                  <Icon name={n.icon} fill className="text-[20px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body-md font-bold text-on-surface truncate">
                      {n.title}
                    </p>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    {n.body}
                  </p>
                  <p className="text-label-sm text-on-surface-variant/70 mt-0.5">
                    {n.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
