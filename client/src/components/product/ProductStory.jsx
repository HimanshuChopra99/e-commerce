import { Waves, Cpu, Zap, ShieldCheck } from 'lucide-react';
export const ProductStory = ({ product }) => {
  return (
    <section className="my-12 space-y-12">
      {/* Narrative Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#4A69E2] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> Next-Gen Innovation
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-neutral-900 tracking-tight">
            Engineered for Forward Motion & Ocean Preservation
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-normal">
            The Adidas 4DFWD X Parley represents a milestone in sustainable
            high-performance footwear. Every step compresses the 3D-printed
            lattice midsole, transforming vertical impact forces into forward
            movement, while yarn in the upper is made from recycled ocean
            plastic.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-neutral-100">
          <div className="p-5 rounded-2xl bg-[#EAEAE8]/60 border border-neutral-200/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#4A69E2] shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase text-neutral-900">
              3D Lattice Midsole
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Printed using light and oxygen through digital light synthesis for
              targeted cushioning and effortless forward glide.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#EAEAE8]/60 border border-neutral-200/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-teal-600 shadow-xs">
              <Waves className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase text-neutral-900">
              Parley Ocean Plastic
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Contains at least 50% Parley Ocean Plastic intercepted from
              coastal communities to reduce marine plastic pollution.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#EAEAE8]/60 border border-neutral-200/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase text-neutral-900">
              Continental™ Traction
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Engineered Continental™ Rubber outsole provides maximum
              multi-surface grip in both wet and dry conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black uppercase text-neutral-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4A69E2]" />
            Technical Specifications
          </h3>
          <span className="text-xs text-neutral-400 font-bold uppercase">
            Official Adidas Spec
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 divide-y md:divide-y-0 text-xs">
          {product.specs.map((spec, i) => (
            <div
              key={i}
              className="py-2.5 flex justify-between border-b border-neutral-100 gap-4"
            >
              <span className="font-bold text-neutral-500 uppercase tracking-wider">
                {spec.label}
              </span>
              <span className="font-semibold text-neutral-900 text-right">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
