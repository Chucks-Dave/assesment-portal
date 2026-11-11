import type { ReactElement } from "react";

const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  book: "M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  plus: "M12 5v14M5 12h14",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 18l9 5 9-5",
  chart: "M4 20V10m6 10V4m6 16v-7m5 7H2",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v6l4 2",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-13a3 3 0 1 1 4 2.8c-.8.4-1 1-1 2.2m0 4h.01",
  logout: "M10 17l5-5-5-5m5 5H3m12-8h5v16h-5",
  search: "m21 21-4.4-4.4m2.4-5.6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
  calendar: "M7 2v4m10-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z",
  graduation: "m2 9 10-5 10 5-10 5L2 9Zm4 3v5c3 2 9 2 12 0v-5m4-3v7",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v6l4 2",
  print: "M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6v-7Zm12-2h.01",
} as const;

export function Icon({
  name,
  className = "",
}: {
  name: keyof typeof paths;
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
