import { useState } from "react";

const products = [
  {
    title: "NIKE AIR MAX",
    desc: "Nike introducing the new air max for everyone's comfort.",
    bg: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "AIR MAX OCHRE",
    desc: "Designed with premium cushioning and premium materials.",
    bg: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=80",
  },
];

export default function Hero() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-[#EAE9E5] min-h-screen flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto w-full">

        {/* Heading */}
        <h1
          className="w-full text-center lg:text-left text-[16vw] sm:text-[14vw] md:text-[130px] lg:text-[160px] xl:text-[230px] font-[800] uppercase leading-none tracking-tighter mb-6 md:mb-8 select-none whitespace-nowrap"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          <span className="text-[#232321]">DO IT </span>
          <span className="text-[#4A69E2]">RIGHT</span>
        </h1>

        {/* Card */}
        <div
          className="relative rounded-[40px] overflow-hidden h-[650px] bg-cover bg-center transition-all duration-500"
          style={{
            backgroundImage: `linear-gradient(to top,rgba(0,0,0,.7),rgba(0,0,0,.15)),url(${products[active].bg})`,
          }}
        >
          {/* Vertical Badge */}
          <div className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 bg-black/80 text-white rounded-xl px-3 py-5">
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
              className="uppercase text-xs tracking-[0.3em]"
            >
              Nike Product Of The Year
            </span>
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-10 left-10 text-white max-w-md">
            <h2 className="text-5xl font-black">
              {products[active].title}
            </h2>

            <p className="mt-3 text-white/80">
              {products[active].desc}
            </p>

            <button
              className="mt-6 md:mt-8 bg-[#4A69E2] hover:bg-[#3b57c7] px-7 py-3.5 rounded-xl uppercase tracking-wider text-xs font-bold text-white transition-all shadow-md active:scale-95"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Shop Now
            </button>
          </div>

          {/* Thumbnails */}
          <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 flex flex-col gap-3 md:gap-4">
            {products.map((item, index) => (
              <button
                key={index}
                onClick={() => setActive(index)}
                className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 transition-all ${active === index
                    ? "border-[#4A69E2] scale-105 shadow-lg"
                    : "border-white/80 opacity-80 hover:opacity-100"
                  }`}
              >
                <img
                  src={item.thumb}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}