import { useState } from 'react';
import { X, Ruler, Check } from 'lucide-react';
export const SizeChartModal = ({
  isOpen,
  onClose,
  sizes,
  currentSize,
  onSelectSize,
}) => {
  const [unit, setUnit] = useState('cm');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 text-[#4A69E2] rounded-2xl">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-neutral-900 tracking-tight">
              Sizing & Fit Guide
            </h2>
            <p className="text-xs text-neutral-500">
              Adidas 4DFWD X Parley Standard Unisex Sizing
            </p>
          </div>
        </div>

        {/* Toggle Unit */}
        <div className="flex justify-between items-center mb-4 bg-neutral-100 p-1.5 rounded-xl text-xs font-bold">
          <span className="text-neutral-600 px-2">
            Foot Length Measurement:
          </span>
          <div className="flex gap-1 bg-white p-1 rounded-lg shadow-xs">
            <button
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${unit === 'cm' ? 'bg-[#232321] text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Centimeters (cm)
            </button>
            <button
              onClick={() => setUnit('in')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${unit === 'in' ? 'bg-[#232321] text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Inches (in)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 uppercase font-extrabold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">EU Size</th>
                <th className="py-3 px-4">US Men</th>
                <th className="py-3 px-4">UK Size</th>
                <th className="py-3 px-4">Foot Length</th>
                <th className="py-3 px-4 text-center">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
              {sizes.map((s) => {
                const isCurrent = s.value === currentSize.value;
                const footLength =
                  unit === 'cm'
                    ? `${s.cm} cm`
                    : `${(s.cm / 2.54).toFixed(1)} in`;
                return (
                  <tr
                    key={s.value}
                    className={`hover:bg-neutral-50 transition-colors ${isCurrent ? 'bg-blue-50/60 font-bold' : ''}`}
                  >
                    <td className="py-3 px-4 text-neutral-900 font-bold">
                      EU {s.eu}
                    </td>
                    <td className="py-3 px-4">US {s.us}</td>
                    <td className="py-3 px-4">UK {s.uk}</td>
                    <td className="py-3 px-4">{footLength}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          onSelectSize(s);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isCurrent ? 'bg-[#232321] text-white' : 'bg-neutral-100 text-neutral-800 hover:bg-[#4A69E2] hover:text-white'}`}
                      >
                        {isCurrent ? (
                          <Check className="w-3.5 h-3.5 inline" />
                        ) : (
                          'Select'
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Measurement Advice Box */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
          <p className="font-bold mb-1">💡 Pro Sizing Tip:</p>
          <p className="leading-relaxed">
            The adidas 4DFWD Primeknit upper offers a snug, sock-like
            compression fit. If you prefer extra wiggle room in the toe box or
            wear thicker running socks, we recommend sizing up by half a size.
          </p>
        </div>

        {/* Action button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#232321] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
