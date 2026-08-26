import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Switch from '../components/Switch';
import Icon from '../components/Icon';

export default function PrivacySafety() {
  const [twoFA, setTwoFA] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [location, setLocation] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const securityRows = [
    {
      key: 'twoFA',
      icon: 'verified_user',
      title: 'Two-Factor Authentication',
      subtitle: 'Extra security when signing in',
      value: twoFA,
      set: setTwoFA,
    },
    {
      key: 'biometric',
      icon: 'fingerprint',
      title: 'Biometric Unlock',
      subtitle: 'Use fingerprint or face unlock',
      value: biometric,
      set: setBiometric,
    },
  ];

  const privacyRows = [
    {
      key: 'location',
      icon: 'my_location',
      title: 'Location Access',
      subtitle: 'Required for live order tracking',
      value: location,
      set: setLocation,
    },
    {
      key: 'dataSharing',
      icon: 'share',
      title: 'Data Sharing',
      subtitle: 'Share analytics to improve the app',
      value: dataSharing,
      set: setDataSharing,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-12">
      <PageHeader title="Privacy & Safety" subtitle="Security & permissions" />

      <main className="px-margin-mobile pt-4 pb-8 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Security */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Security
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {securityRows.map((r) => (
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
                <Switch checked={r.value} onChange={r.set} />
              </div>
            ))}

            <button className="w-full flex items-center gap-3 p-3.5 hover:bg-surface-container-low/60 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0 border border-surface-container-high/40">
                <Icon name="lock" fill className="text-[20px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-bold text-on-surface">
                  Change Password
                </p>
                <p className="text-label-sm text-on-surface-variant truncate">
                  Update your account password
                </p>
              </div>
              <Icon
                name="chevron_right"
                className="text-[18px] text-on-surface-variant/40 shrink-0"
              />
            </button>
          </div>
        </section>

        {/* Privacy */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Privacy
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {privacyRows.map((r) => (
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
                <Switch checked={r.value} onChange={r.set} />
              </div>
            ))}
          </div>
        </section>

        {/* Account actions */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Account
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            <button className="w-full flex items-center gap-3 p-3.5 hover:bg-surface-container-low/60 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0 border border-surface-container-high/40">
                <Icon name="download" fill className="text-[20px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-bold text-on-surface">
                  Download My Data
                </p>
                <p className="text-label-sm text-on-surface-variant truncate">
                  Get a copy of your account data
                </p>
              </div>
              <Icon
                name="chevron_right"
                className="text-[18px] text-on-surface-variant/40 shrink-0"
              />
            </button>

            <button className="w-full flex items-center gap-3 p-3.5 hover:bg-error-container/40 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                <Icon name="delete_forever" fill className="text-[20px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-bold text-error">
                  Delete Account
                </p>
                <p className="text-label-sm text-on-surface-variant truncate">
                  Permanently remove your account
                </p>
              </div>
              <Icon
                name="chevron_right"
                className="text-[18px] text-on-surface-variant/40 shrink-0"
              />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
