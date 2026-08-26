import React, { useState } from 'react';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <section className="bg-brand-blue py-14 px-6" id="newsletter">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Left Content */}
          <div className="flex-1">
            <p className="text-white/70 text-xs font-bold tracking-[0.3em] uppercase mb-2">
              Exclusive Members
            </p>
            <h2
              className="text-display font-black text-white uppercase leading-none mb-3"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)' }}
            >
              JOIN OUR KICKSPLUS
              <br />
              <span className="text-white">CLUB &amp; GET</span>{' '}
              <span
                className="text-white"
                style={{
                  WebkitTextStroke: '2px rgba(255,255,255,0.4)',
                  color: 'transparent',
                }}
              >
                15% OFF
              </span>
            </h2>
            <p className="text-white/70 text-sm mb-6 max-w-sm leading-relaxed">
              Sign up to find out about our exclusive collections and latest
              drops.
            </p>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-5 py-3 text-white text-sm placeholder-white/50 focus:outline-none focus:border-white/60 transition-all duration-200"
                required
              />
              <button
                type="submit"
                className="bg-white text-brand-blue font-black text-xs tracking-widest uppercase px-6 py-3 rounded-full hover:bg-gray-100 transition-all duration-300 hover:shadow-lg whitespace-nowrap"
              >
                {submitted ? '✓ Done!' : 'Submit'}
              </button>
            </form>
          </div>

          {/* Right: KICKS Logo */}
          <div className="shrink-0 text-right">
            <div className="relative inline-block">
              {/* Orange dot */}
              <span className="absolute -top-2 right-6 w-5 h-5 bg-brand-orange rounded-full z-10" />
              <span
                className="text-kicks block text-white"
                style={{
                  fontSize: 'clamp(4rem, 10vw, 8rem)',
                  lineHeight: '1',
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.15)',
                  WebkitTextStroke: '2px rgba(255,255,255,0.5)',
                }}
              >
                KICKS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
