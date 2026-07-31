"use client";

import React from "react";
import { Check } from "lucide-react";

export default function Toast({ isOpen, message = "Added to cart" }) {
  return (
    <div
      id="toast"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 bg-ink text-white pl-4 pr-6 py-3.5 rounded-full shadow-mega transition-transform duration-300 ${
        isOpen ? "show" : ""
      }`}
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand">
        <Check className="w-4 h-4 text-ink stroke-[3]" />
      </span>
      <span id="toast-msg" className="text-sm font-semibold whitespace-nowrap">
        {message}
      </span>
    </div>
  );
}
