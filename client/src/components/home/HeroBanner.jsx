import { Link } from 'react-router-dom';

export default function HeroBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
      <div
        className="relative w-full rounded-[20px] sm:rounded-[28px] overflow-hidden bg-[#1A1A1A]"
        style={{ minHeight: '200px' }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/31381390/pexels-photo-31381390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')",
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-7 sm:px-12 py-10 sm:py-14">
          {/* Left text */}
          <div className="flex-1 text-left">
            <p
              className="text-white/70 text-[12px] sm:text-[13px] uppercase tracking-widest font-medium mb-2"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Limited time only
            </p>
            <h1
              className="text-white font-black text-[36px] sm:text-[52px] lg:text-[64px] leading-none mb-3 sm:mb-4"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Get 30% off
            </h1>
            <p
              className="text-white/60 text-[13px] sm:text-[14px] max-w-[280px] sm:max-w-[320px] leading-relaxed"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Sneakers made with your comfort in mind so you can put all of your
              focus into your next session.
            </p>
            <Link
              to="/products?sort=price_asc"
              className="inline-block mt-5 sm:mt-7 bg-[#4C64F4] hover:bg-[#3a52e0] text-white text-[12px] sm:text-[13px] font-bold uppercase tracking-widest px-6 sm:px-8 py-3 sm:py-3.5 rounded-[10px] transition-colors duration-300"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Shop Now
            </Link>
          </div>

          {/* Right shoe image */}
          <div className="hidden sm:flex flex-1 justify-end items-center">
            <img
              src="https://images.pexels.com/photos/1456733/pexels-photo-1456733.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=700"
              alt="Hero Sneaker"
              className="w-[300px] lg:w-[400px] object-cover rounded-xl opacity-90 drop-shadow-2xl"
              style={{ transform: 'rotate(-8deg) translateY(10px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
