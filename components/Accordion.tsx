import type { ReactNode } from "react";

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A collapsible explainer panel (native <details>). */
export default function Accordion({ title, defaultOpen, children }: AccordionProps) {
  return (
    <details
      open={defaultOpen}
      className="mb-3 overflow-hidden rounded-[16px] border border-line bg-card shadow-[var(--shadow)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-[18px] py-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span className="chev ml-auto grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-line text-[11px] text-muted">
          ▼
        </span>
      </summary>
      <div className="px-[18px] pb-[18px] pt-0.5 text-[14px] text-ink-soft">{children}</div>
    </details>
  );
}
