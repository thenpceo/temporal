import type { SVGProps } from "react";

const baseProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 16,
  height: 16,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

export function IconSpark(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconRotate(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function IconBrain(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 2a3 3 0 00-3 3v.5A3.5 3.5 0 003 9c0 1 .4 1.9 1 2.5A3.5 3.5 0 003 15c0 1.7 1.3 3 3 3 .3 1.7 1.7 3 3.5 3a3.5 3.5 0 003-1.7 3.5 3.5 0 003 1.7c1.8 0 3.2-1.3 3.5-3 1.7 0 3-1.3 3-3 0-1-.4-1.9-1-2.5.6-.6 1-1.5 1-2.5a3.5 3.5 0 00-3-3.5V5a3 3 0 00-3-3 3 3 0 00-3 1.5A3 3 0 009 2z" />
    </svg>
  );
}

export function IconDatabase(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0018 0V5M3 12a9 3 0 0018 0" />
    </svg>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}

export function IconMessage(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconBookOpen(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
