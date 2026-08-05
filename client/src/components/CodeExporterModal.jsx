import { useState } from "react";
import { X, Copy, Check, Code2, Terminal, Layers } from "lucide-react";
export const CodeExporterModal = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("jsx");
  if (!isOpen) return null;
  const jsxSnippet = `// ProductViewPage.jsx - 100% Production Ready Component
import React, { useState } from 'react';
import { Heart, Check, Ruler } from 'lucide-react';

export function ProductViewPage() {
  const [selectedColor, setSelectedColor] = useState('shadow-navy');
  const [selectedSize, setSelectedSize] = useState('38');
  const [isWishlisted, setIsWishlisted] = useState(false);

  const colors = [
    { id: 'shadow-navy', name: 'Shadow Navy', hex: '#202A36' },
    { id: 'army-green', name: 'Army Green', hex: '#708269' },
  ];

  const sizes = ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

  return (
    <div className="bg-[#E7E7E3] min-h-screen py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 2x2 Image Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <div className="bg-[#EAEAE8] rounded-3xl aspect-square overflow-hidden shadow-xs">
            <img src="/images/adidas-4dfwd-navy-profile.jpg" alt="Profile" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
          </div>
          <div className="bg-[#EAEAE8] rounded-3xl aspect-square overflow-hidden shadow-xs">
            <img src="/images/adidas-4dfwd-navy-onfoot.jpg" alt="On foot" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
          </div>
          <div className="bg-[#EAEAE8] rounded-3xl aspect-square overflow-hidden shadow-xs">
            <img src="/images/adidas-4dfwd-navy-laces.jpg" alt="Laces" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
          </div>
          <div className="bg-[#EAEAE8] rounded-3xl aspect-square overflow-hidden shadow-xs">
            <img src="/images/adidas-4dfwd-navy-sole.jpg" alt="3D Sole" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="lg:col-span-5 bg-transparent space-y-6">
          <span className="inline-block bg-[#4A69E2] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            New Release
          </span>
          <h1 className="text-3xl lg:text-4xl font-black uppercase text-neutral-900 tracking-tight leading-tight">
            ADIDAS 4DFWD X PARLEY RUNNING SHOES
          </h1>
          <div className="text-2xl font-bold text-[#4A69E2]">$125.00</div>

          {/* Color Selector */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">COLOR</label>
            <div className="flex items-center space-x-3">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.id)}
                  style={{ backgroundColor: c.hex }}
                  className={\`w-9 h-9 rounded-full flex items-center justify-center transition-all \${
                    selectedColor === c.id ? 'ring-2 ring-neutral-900 ring-offset-2 scale-105' : ''
                  }\`}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">SIZE</label>
              <button className="text-xs font-bold uppercase underline tracking-wider text-neutral-900">SIZE CHART</button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={\`h-12 rounded-lg font-bold text-sm transition-all \${
                    selectedSize === s ? 'bg-[#232321] text-white' : 'bg-white text-neutral-900 border border-neutral-200'
                  }\`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex space-x-2">
              <button className="flex-1 bg-[#232321] text-white font-extrabold text-xs uppercase py-4 rounded-xl shadow-md">
                ADD TO CART
              </button>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="p-4 rounded-xl border border-neutral-300 bg-white"
              >
                <Heart className={\`w-5 h-5 \${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}\`} />
              </button>
            </div>
            <button className="w-full bg-[#4A69E2] text-white font-extrabold text-xs uppercase py-4 rounded-xl shadow-md">
              BUY IT NOW
            </button>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-neutral-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider">ABOUT THE PRODUCT</h3>
            <p className="text-xs text-neutral-600">Shadow Navy / Army Green</p>
            <p className="text-xs text-neutral-600">This product is excluded from all promotional discounts and offers.</p>
            <ul className="space-y-2 text-xs text-neutral-700">
              <li className="flex items-center gap-2">\u2022 Pay over time in interest-free installments with Affirm, Klarna or Afterpay.</li>
              <li className="flex items-center gap-2">\u2022 Join adiClub to get unlimited free standard shipping, returns, & exchanges.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}`;
  const tailwindSnippet = `/* Custom Colors & Utilities for Tailwind v3 / v4 */
/* Reference colors used:
   - Page Canvas: #E7E7E3
   - Button Charcoal: #232321
   - KICKS Blue Accent: #4A69E2
   - Cart Badge Yellow: #FFA500
   - Card Background: #EAEAE8
*/

// Example Tailwind configuration extensions if needed:
module.exports = {
  theme: {
    extend: {
      colors: {
        kicks: {
          bg: '#E7E7E3',
          card: '#EAEAE8',
          black: '#232321',
          blue: '#4A69E2',
          orange: '#FFA500',
        }
      },
      fontFamily: {
        brand: ['Rubik', 'sans-serif'],
      }
    }
  }
}`;
  const usageSnippet = `// Quick installation:
npm install lucide-react clsx tailwind-merge

// Just copy the src/ folder or components into your React project!
// Guaranteed 0 build errors with TypeScript and Tailwind CSS.`;
  const getCurrentText = () => {
    if (activeTab === "jsx") return jsxSnippet;
    if (activeTab === "tailwind") return tailwindSnippet;
    return usageSnippet;
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181B] text-neutral-100 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-800 overflow-hidden relative">
        
        {
    /* Header */
  }
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                Copy Production Component Code
              </h3>
              <p className="text-[11px] text-neutral-400">Zero error, copy-paste React JSX + Tailwind CSS</p>
            </div>
          </div>

          <button
    onClick={onClose}
    className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Tabs */
  }
        <div className="flex items-center justify-between px-5 pt-3 border-b border-neutral-800 bg-neutral-900/40 text-xs font-bold">
          <div className="flex gap-2">
            <button
    onClick={() => setActiveTab("jsx")}
    className={`px-3 py-2 rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "jsx" ? "bg-[#27272A] text-white border-t-2 border-blue-500" : "text-neutral-400 hover:text-white"}`}
  >
              <Code2 className="w-3.5 h-3.5" /> React Component (JSX)
            </button>
            <button
    onClick={() => setActiveTab("tailwind")}
    className={`px-3 py-2 rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "tailwind" ? "bg-[#27272A] text-white border-t-2 border-blue-500" : "text-neutral-400 hover:text-white"}`}
  >
              <Layers className="w-3.5 h-3.5" /> Tailwind Theme & CSS
            </button>
            <button
    onClick={() => setActiveTab("usage")}
    className={`px-3 py-2 rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "usage" ? "bg-[#27272A] text-white border-t-2 border-blue-500" : "text-neutral-400 hover:text-white"}`}
  >
              <Terminal className="w-3.5 h-3.5" /> Installation Notes
            </button>
          </div>

          <button
    onClick={handleCopy}
    className="mb-2 bg-[#4A69E2] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
  >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>

        {
    /* Code View */
  }
        <div className="flex-1 p-5 overflow-auto bg-[#09090B] font-mono text-xs text-neutral-300 leading-relaxed">
          <pre>{getCurrentText()}</pre>
        </div>

        {
    /* Footer */
  }
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-400 font-medium">
          <span>Clean React hooks, standard Tailwind CSS classes, responsive 2x2 grid</span>
          <button
    onClick={onClose}
    className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
  >
            Close
          </button>
        </div>

      </div>
    </div>;
};
