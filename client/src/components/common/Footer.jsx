// Footer.jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── tiny helpers ─── */
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* ─── inline styles / keyframes injected once ─── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');

  html, body { overflow-x: hidden; }
  body { font-family: 'Rubik', sans-serif; background: #ffffff; }
  ::selection { background: #FFA52F; color: #232321; }

  .footer-link {
    position: relative; display: inline-block;
    transition: color .25s ease, transform .25s ease;
  }
  .footer-link::after {
    content:''; position:absolute; left:0; bottom:-3px;
    height:2px; width:0; background:#FFA52F; transition: width .3s ease;
  }
  .footer-link:hover { color:#ffffff; transform: translateX(4px); }
  .footer-link:hover::after { width:100%; }

  .social-icon { transition: transform .35s cubic-bezier(.34,1.56,.64,1), color .3s ease; }
  .social-icon:hover { transform: translateY(-4px) scale(1.14); color:#FFA52F; }

  .reveal { opacity:0; transform: translateY(28px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1); }
  .reveal.in { opacity:1; transform:none; }
  @media (prefers-reduced-motion: reduce){ .reveal { opacity:1; transform:none; transition:none; } }

  .email-input { transition: border-color .25s ease, box-shadow .25s ease, background .25s ease; }
  .email-input:focus {
    border-color:#ffffff;
    box-shadow:0 0 0 3px rgba(255,255,255,.18);
    background:rgba(255,255,255,.06);
    outline: none;
  }

  .btn-submit { transition: transform .25s ease, box-shadow .25s ease, background .25s ease; }
  .btn-submit:hover { transform: translateY(-2px); box-shadow:0 10px 22px rgba(0,0,0,.35); background:#000000; }
  .btn-submit:active { transform: translateY(0) scale(.97); }

  @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
  .pop { animation: pop .45s cubic-bezier(.34,1.56,.64,1); }

  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
  .shake { animation: shake .45s ease; }

  .logo-badge { transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
  .logo-wrap:hover .logo-badge { transform: rotate(90deg) scale(1.1); }
`;

/* ════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════ */

/* Reveal wrapper — adds .in when it enters the viewport */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in');
          io.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* Social icons */
const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 sm:w-6 sm:h-6"
  >
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);
const InstagramIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 sm:w-6 sm:h-6"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1 0 18.162 12 6.162 6.162 0 0 0 12 5.838zm0 10.162A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.406-11.845a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
  </svg>
);
const TwitterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 sm:w-6 sm:h-6"
  >
    <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 0 0-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 0 0-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 0 1-2.228-.616v.06a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.212.085 4.936 4.936 0 0 0 4.604 3.417 9.867 9.867 0 0 1-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0 0 7.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0 0 24 4.59z" />
  </svg>
);
const TikTokIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 sm:w-6 sm:h-6"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

/* Newsletter section */
function NewsletterSection() {
  const emailRef = useRef(null);
  const msgRef = useRef(null);
  const [btnText, setBtnText] = useState('Submit');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [msg, setMsg] = useState({
    text: '',
    color: '#ffffff',
    visible: false,
  });
  const timerRef = useRef(null);

  const showMsg = (text, color) => setMsg({ text, color, visible: true });

  const handleSubmit = (e) => {
    e.preventDefault();
    clearTimeout(timerRef.current);
    const value = emailRef.current.value.trim();
    const valid = VALID_EMAIL.test(value);

    if (!valid) {
      showMsg('Please enter a valid email address.', '#FFC9C9');
      retrigger(emailRef.current, 'shake');
      emailRef.current.focus();
      return;
    }

    showMsg('Welcome to the club! Your 15% code is on its way.', '#ffffff');
    if (msgRef.current) retrigger(msgRef.current, 'pop');
    emailRef.current.value = '';
    setBtnText('Done');
    setBtnDisabled(true);

    timerRef.current = setTimeout(() => {
      setBtnText('Submit');
      setBtnDisabled(false);
      setMsg((m) => ({ ...m, visible: false }));
    }, 3400);
  };

  return (
    <section className="relative z-10 bg-[#4A69E2] rounded-t-[28px] sm:rounded-t-[36px] lg:rounded-t-[44px]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-[72px] pt-9 sm:pt-12 lg:pt-14 pb-16 sm:pb-20 lg:pb-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-9 lg:gap-8">
          {/* Left */}
          <Reveal className="max-w-xl" delay={0}>
            <h2 className="text-white font-bold uppercase leading-[1.14] tracking-tight text-[25px] sm:text-4xl lg:text-[40px] xl:text-[44px]">
              Join our KicksPlus
              <br className="hidden sm:block" /> Club &amp; Get 15% Off
            </h2>
            <p className="text-white/85 mt-3 sm:mt-4 text-[15px] sm:text-base lg:text-lg">
              Sign up for free! Join the community.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-md"
            >
              <input
                ref={emailRef}
                type="email"
                required
                autoComplete="email"
                aria-label="Email address"
                placeholder="Email address"
                className="email-input flex-1 min-w-0 bg-transparent border border-white/50 rounded-lg px-4 py-3 text-white text-sm placeholder-white/60"
              />
              <button
                type="submit"
                disabled={btnDisabled}
                className={`btn-submit bg-[#232321] text-white text-[13px] sm:text-sm font-semibold uppercase tracking-wider px-7 sm:px-8 py-3 rounded-lg whitespace-nowrap${btnDisabled ? ' opacity-80' : ''}`}
              >
                {btnText}
              </button>
            </form>

            <p
              ref={msgRef}
              role="status"
              aria-live="polite"
              className="mt-3 h-5 text-sm font-medium transition-opacity duration-300"
              style={{ color: msg.color, opacity: msg.visible ? 1 : 0 }}
            >
              {msg.text}
            </p>
          </Reveal>

          {/* Right — KICKS logo */}
          <Reveal
            className="self-start lg:self-center lg:pr-4 xl:pr-8"
            delay={70}
          >
            <div className="logo-wrap relative inline-block select-none cursor-default">
              <span className="text-white font-black leading-none tracking-[-0.02em] text-[54px] sm:text-7xl lg:text-8xl xl:text-[100px]">
                KICKS
              </span>
              <span className="logo-badge absolute -top-1.5 -right-4 sm:-right-5 lg:-right-6 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full bg-[#FFA52F] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                  fill="none"
                  stroke="#232321"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* Links section */
function LinksSection() {
  const categories = [
    'Runner',
    'Sneakers',
    'Basketball',
    'Outdoor',
    'Formal',
    'Casual shoes',
  ];
  const company = ['About', 'Contact', 'Blogs'];
  const socials = [
    {
      label: 'Facebook',
      Icon: FacebookIcon,
      href: 'https://www.facebook.com/',
    },
    {
      label: 'Instagram',
      Icon: InstagramIcon,
      href: 'https://www.instagram.com/',
    },
    { label: 'Twitter', Icon: TwitterIcon, href: 'https://x.com/' },
    { label: 'TikTok', Icon: TikTokIcon, href: 'https://www.tiktok.com/' },
  ];

  return (
    <section className="relative z-20 -mt-6 sm:-mt-8 lg:-mt-10 bg-[#232321] rounded-t-[28px] sm:rounded-t-[36px] lg:rounded-t-[44px] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-[72px] pt-10 sm:pt-12 lg:pt-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-10 lg:gap-x-6">
          {/* About */}
          <Reveal className="sm:col-span-2 lg:col-span-5" delay={0}>
            <h3 className="text-[#FFA52F] font-semibold text-lg lg:text-[22px] mb-3 lg:mb-4">
              About us
            </h3>
            <p className="text-white/85 text-[15px] lg:text-[17px] leading-relaxed max-w-sm">
              We are the biggest hyperstore in the universe. We got you all
              cover with our exclusive collections and latest drops.
            </p>
          </Reveal>

          {/* Categories */}
          <Reveal className="lg:col-span-3" delay={70}>
            <h3 className="text-[#FFA52F] font-semibold text-lg lg:text-[22px] mb-3 lg:mb-4">
              Categories
            </h3>
            <ul className="space-y-2 lg:space-y-2.5 text-[15px] lg:text-[17px]">
              {categories.map((c) => (
                <li key={c}>
                  <Link
                    to={`/products?category=${c.toLowerCase()}`}
                    className="footer-link text-white/85"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Company */}
          <Reveal className="lg:col-span-2" delay={140}>
            <h3 className="text-[#FFA52F] font-semibold text-lg lg:text-[22px] mb-3 lg:mb-4">
              Company
            </h3>
            <ul className="space-y-2 lg:space-y-2.5 text-[15px] lg:text-[17px]">
              {company.map((c) => (
                <li key={c}>
                  <Link
                    to={`/${c.toLowerCase()}`}
                    className="footer-link text-white/85"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Follow us */}
          <Reveal className="sm:col-span-2 lg:col-span-2" delay={210}>
            <h3 className="text-[#FFA52F] font-semibold text-lg lg:text-[22px] mb-3 lg:mb-4">
              Follow us
            </h3>
            <div className="flex items-center gap-5 sm:gap-6">
              {socials.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="social-icon text-white"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* Giant wordmark */}
      <Reveal
        className="mt-10 sm:mt-12 lg:mt-16 select-none pointer-events-none"
        delay={280}
      >
        <div aria-hidden="true">
          <svg
            viewBox="0 0 1000 150"
            className="w-full block"
            preserveAspectRatio="xMidYMin meet"
          >
            <text
              x="500"
              y="212"
              textAnchor="middle"
              fontFamily="Rubik, sans-serif"
              fontWeight="900"
              fontSize="292"
              fill="#ffffff"
              textLength="992"
              lengthAdjust="spacing"
            >
              KICKS
            </text>
          </svg>
        </div>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════ */
export default function Footer() {
  /* inject global styles once */
  useEffect(() => {
    const id = 'kicks-footer-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = GLOBAL_STYLES;
    document.head.appendChild(style);
    return () => {
      /* leave styles; safe for SPA reuse */
    };
  }, []);

  return (
    <footer className="w-full max-w-[1440px] m-auto">
      <NewsletterSection />
      <LinksSection />
    </footer>
  );
}
