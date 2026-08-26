import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

const faqs = [
  {
    q: 'How do I accept a delivery order?',
    a: 'Go online from the Home screen, then open the Orders tab. Available orders will appear — tap "Accept" to start a delivery and follow the on-screen navigation.',
  },
  {
    q: 'When will I get paid?',
    a: 'Earnings from delivered orders are credited to your wallet instantly. You can withdraw to your bank account anytime from Wallet & Payouts.',
  },
  {
    q: 'What do I do if the customer is unavailable?',
    a: "Call the customer from the tracking screen. If there's still no answer, follow the in-app instructions to return the order to the warehouse.",
  },
  {
    q: 'How is my payout calculated?',
    a: "Each order shows its payout before you accept it. It's a base rate plus distance and demand bonuses.",
  },
  {
    q: 'Can I change my vehicle type?',
    a: 'Yes — contact support from this page or update it in your profile details. Different vehicles can qualify for different order types.',
  },
];

const contactOptions = [
  {
    icon: 'chat',
    title: 'Live Chat',
    subtitle: 'Chat with support instantly',
    badge: 'Online',
  },
  { icon: 'call', title: 'Call Support', subtitle: '+1 (800) 555-0199' },
  { icon: 'mail', title: 'Email Us', subtitle: 'support@kick.com' },
];

export default function HelpCenter() {
  const [open, setOpen] = useState(0);

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-12">
      <PageHeader title="Help Center" subtitle="FAQs & 24/7 support" />

      <main className="px-margin-mobile pt-4 pb-8 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Contact options */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Contact Support
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {contactOptions.map((c) => (
              <button
                key={c.title}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-surface-container-low/60 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <Icon name={c.icon} fill className="text-[20px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-lg font-bold text-on-surface">
                    {c.title}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {c.subtitle}
                  </p>
                </div>
                {c.badge && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {c.badge}
                  </span>
                )}
                <Icon
                  name="chevron_right"
                  className="text-[18px] text-on-surface-variant/40 shrink-0"
                />
              </button>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="flex flex-col gap-2">
          <h3 className="text-label-sm font-bold text-on-surface-variant/70 uppercase tracking-wider px-2">
            Frequently Asked Questions
          </h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest overflow-hidden divide-y divide-surface-container-high/40">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-container-low/50 transition-colors"
                  >
                    <span className="text-body-md font-bold text-on-surface">
                      {f.q}
                    </span>
                    <Icon
                      name="expand_more"
                      className={`text-[20px] text-on-surface-variant shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-body-md text-on-surface-variant">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-center text-label-sm text-on-surface-variant/60 pt-2">
          Still need help? Our support team is available 24/7.
        </p>
      </main>
    </div>
  );
}
