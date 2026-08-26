import { useState } from 'react';
import { useSelector } from 'react-redux';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';

const VEHICLES = [
  { value: 'bike', label: 'Bicycle', icon: 'pedal_bike', desc: 'Eco & Agile' },
  {
    value: 'scooter',
    label: 'Scooter',
    icon: 'electric_scooter',
    desc: 'Fast City',
  },
  { value: 'car', label: 'Car', icon: 'directions_car', desc: 'Large Load' },
];

export default function PersonalDetails() {
  const partner = useSelector((s) => s.app.partner) || {};
  const statsData = useSelector((s) => s.app.stats) || {};

  const fullName =
    partner.fullName ||
    `${partner.firstName || ''} ${partner.lastName || ''}`.trim() ||
    'Delivery Partner';

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    firstName: partner.firstName || '',
    lastName: partner.lastName || '',
    email: partner.email || '',
    phone: partner.phone || '',
    vehicleType: partner.vehicleType || 'bike',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setForm({
      firstName: partner.firstName || '',
      lastName: partner.lastName || '',
      email: partner.email || '',
      phone: partner.phone || '',
      vehicleType: partner.vehicleType || 'bike',
    });
    setEditing(false);
  };

  const handleSave = () => {
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  const handleCopyId = () => {
    const id = partner.publicId || partner.id || 'DP-8834';
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-28 select-none">
      {/* Top App Bar */}
      <PageHeader
        title="Profile"
        subtitle="Account & vehicle preferences"
        right={
          <button
            onClick={() => (editing ? resetForm() : setEditing(true))}
            className={`h-9 px-4 rounded-full text-label-md font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
              editing
                ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                : 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm shadow-primary/20'
            }`}
          >
            <Icon name={editing ? 'close' : 'edit'} className="text-[15px]" />
            <span>{editing ? 'Cancel' : 'Edit'}</span>
          </button>
        }
      />

      <main className="px-4 pt-3 max-w-lg mx-auto flex flex-col gap-4">
        {/* ===== 1. HERO IDENTITY BENTO CARD ===== */}
        <section className="relative overflow-hidden bg-surface-container-lowest dark:bg-surface-container-low rounded-[28px] p-6 border border-surface-container-high/60 dark:border-outline-variant/15 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          {/* Ambient Lighting Accent */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Layered Avatar with Glow */}
            <div className="relative mb-3.5">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-b from-primary/20 to-transparent blur-xs opacity-75" />
              <Avatar
                name={fullName}
                className="relative w-20 h-20 rounded-full text-3xl font-bold bg-primary/10 text-white border-2 border-surface-container-lowest shadow-md ring-1 ring-primary/15"
              />
              {/* Online Radar Status Badge */}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-[3px] border-surface-container-lowest flex items-center justify-center shadow-xs">
                <Icon
                  name="check"
                  className="text-[11px] text-white font-black"
                />
              </span>
            </div>

            {/* Name + Verification */}
            <div className="flex items-center gap-1.5">
              <h2 className="text-title-lg font-bold text-on-surface tracking-tight">
                {fullName}
              </h2>
              <Icon name="verified" fill className="text-[18px] text-primary" />
            </div>

            {/* Copyable Partner ID Pill */}
            <button
              type="button"
              onClick={handleCopyId}
              title="Click to copy ID"
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container-high/40 hover:bg-surface-container-high dark:bg-surface-variant/30 text-on-surface-variant text-[11px] font-mono font-medium transition-all active:scale-95"
            >
              <span>ID: {partner.publicId || partner.id || 'DP-8834'}</span>
              <Icon
                name={copied ? 'done' : 'content_copy'}
                className={`text-[12px] ${copied ? 'text-emerald-600' : 'opacity-60'}`}
              />
              {copied && (
                <span className="text-emerald-600 font-sans font-semibold">
                  Copied
                </span>
              )}
            </button>

            {/* Badges Strip */}
            <div className="mt-4 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold tracking-wide border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Partner</span>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-[11px] font-semibold border border-surface-container-high/60">
                <Icon name="star" fill className="text-[13px] text-amber-500" />
                <span>4.95 Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 2. METRIC SUMMARY CAPSULES ===== */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl p-4 border border-surface-container-high/60 dark:border-outline-variant/15 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name="local_shipping" className="text-[20px]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant/75 uppercase tracking-wider block">
                Deliveries
              </span>
              <span className="text-title-md font-bold text-on-surface tabular-nums">
                {statsData.deliveredCount ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl p-4 border border-surface-container-high/60 dark:border-outline-variant/15 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Icon name="schedule" className="text-[20px]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant/75 uppercase tracking-wider block">
                In Transit
              </span>
              <span className="text-title-md font-bold text-on-surface tabular-nums">
                {statsData.inTransitCount ?? 0}
              </span>
            </div>
          </div>
        </section>

        {/* ===== 3. CONTACT INFORMATION GROUP ===== */}
        <section className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[26px] p-5 border border-surface-container-high/60 dark:border-outline-variant/15 shadow-2xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/40 dark:border-outline-variant/10">
            <div className="flex items-center gap-2">
              <Icon name="badge" className="text-[18px] text-primary" />
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Personal Information
              </h3>
            </div>
            {editing && (
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Editing
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Field
                label="First Name"
                icon="person"
                value={form.firstName}
                editing={editing}
                onChange={set('firstName')}
                placeholder="First name"
              />
              <Field
                label="Last Name"
                icon="person"
                value={form.lastName}
                editing={editing}
                onChange={set('lastName')}
                placeholder="Last name"
              />
            </div>
            <Field
              label="Email Address"
              icon="mail"
              value={form.email}
              editing={editing}
              onChange={set('email')}
              placeholder="name@example.com"
              type="email"
            />
            <Field
              label="Phone Number"
              icon="phone"
              value={form.phone}
              editing={editing}
              onChange={set('phone')}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
        </section>

        {/* ===== 4. VEHICLE TYPE SELECTOR ===== */}
        <section className="bg-surface-container-lowest dark:bg-surface-container-low rounded-[26px] p-5 border border-surface-container-high/60 dark:border-outline-variant/15 shadow-2xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="two_wheeler" className="text-[18px] text-primary" />
              <h3 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Assigned Vehicle
              </h3>
            </div>
            {!editing && (
              <span className="text-[11px] text-on-surface-variant/80 font-medium">
                Locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {VEHICLES.map((v) => {
              const active = form.vehicleType === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  disabled={!editing}
                  onClick={() =>
                    setForm((f) => ({ ...f, vehicleType: v.value }))
                  }
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 px-2 border transition-all duration-200 ${
                    active
                      ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/20'
                      : 'bg-surface dark:bg-surface-container border-surface-container-high/60 text-on-surface-variant hover:border-outline-variant/50'
                  } ${editing ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-90'}`}
                >
                  <Icon
                    name={v.icon}
                    className={`text-[22px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                  />
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-label-sm font-bold ${active ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {v.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/70 font-medium leading-none mt-0.5">
                      {v.desc}
                    </span>
                  </div>
                  {active && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== 5. FLOATING BOTTOM SAVE BAR ===== */}
        {editing ? (
          <div className="fixed bottom-5 left-0 right-0 max-w-lg mx-auto px-4 z-40">
            <div className="bg-surface-container-lowest/90 dark:bg-surface-container-low/90 backdrop-blur-xl p-2 rounded-2xl border border-surface-container-high/80 shadow-xl flex gap-2">
              <button
                onClick={resetForm}
                className="flex-1 h-11 rounded-xl bg-surface-container-high text-on-surface font-semibold text-label-md hover:bg-surface-container-highest transition-all active:scale-[0.98]"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] h-11 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-label-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-primary/25"
              >
                <Icon name="check" className="text-[18px]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        ) : (
          saved && (
            <div className="fixed bottom-5 left-0 right-0 max-w-sm mx-auto px-4 z-40">
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 text-white rounded-full text-label-md font-semibold shadow-lg shadow-emerald-500/25 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <Icon name="check_circle" className="text-[18px]" />
                <span>Profile updated successfully</span>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}

/* Sub-component: Inset modern metadata / input field */
function Field({
  label,
  icon,
  value,
  editing,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-on-surface-variant/75 uppercase tracking-wider pl-1">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-2xl px-3.5 h-11 border transition-all duration-200 ${
          editing
            ? 'bg-surface dark:bg-surface-container border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs'
            : 'bg-surface/50 dark:bg-surface-container/40 border-surface-container-high/40 text-on-surface'
        }`}
      >
        <Icon
          name={icon}
          className={`text-[17px] shrink-0 ${editing ? 'text-primary' : 'text-on-surface-variant/60'}`}
        />
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          disabled={!editing}
          className="w-full bg-transparent text-body-md font-medium text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 disabled:text-on-surface"
        />
        {editing && value && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: '' } })}
            className="text-on-surface-variant/40 hover:text-on-surface transition-colors p-1"
          >
            <Icon name="cancel" className="text-[15px]" />
          </button>
        )}
      </div>
    </div>
  );
}
