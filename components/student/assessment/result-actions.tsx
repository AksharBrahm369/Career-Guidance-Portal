"use client";

/** Small client island: trigger the browser's print/save-as-PDF dialog. */
export function PrintResultButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border px-3 py-1.5 text-sm hover:border-primary print:hidden"
    >
      Download as PDF
    </button>
  );
}
