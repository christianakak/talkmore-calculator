"use client";

import type { ReactNode } from "react";

interface ToggleProps {
  label: ReactNode;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

/** A switch row used for U30, "Første måned gratis", VAS and samlerabatt. */
export default function Toggle({ label, hint, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left text-[14px] font-semibold transition ${
        checked ? "border-teal bg-teal-bg text-ink" : "border-line bg-card text-ink"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-[12.5px] text-muted">{hint}</span>}
      </span>
      <span
        className={`relative ml-auto h-[26px] w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-teal" : "bg-[#dcdcdc]"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}
