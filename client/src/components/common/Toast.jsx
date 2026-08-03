"use client";

import React from "react";
import { Check, X } from "lucide-react";

export default function Toast({ isOpen, message = "Added to cart", onDismiss }) {
  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[120] flex items-center gap-3 bg-[#232321] text-white pl-3 pr-3 py-3 rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 ${
        isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#FFA52F] shrink-0">
        <Check className="w-4 h-4 text-[#232321] stroke-[3]" />
      </span>
      <span id="toast-msg" className="text-sm font-bold pr-1">
        {message}
      </span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="p-1 text-white/60 hover:text-white transition"><X className="w-4 h-4" /></button>
    </div>
  );
}
