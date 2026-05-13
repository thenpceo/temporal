"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  IconBrain,
  IconActivity,
  IconUsers,
  IconShield,
  IconBuilding,
  IconMessage,
  IconBookOpen,
} from "./icons";

interface SystemStatus {
  llmMode: "live" | "mock";
  model: string;
  temporalReachable: boolean;
  workerConnected: boolean;
  taskQueue: string;
}

const NAV = [
  { href: "/", label: "Ops", icon: IconActivity },
  { href: "/csm", label: "CSM", icon: IconUsers },
  { href: "/exec", label: "Exec", icon: IconShield },
  { href: "/signals", label: "Signals", icon: IconBookOpen },
  { href: "/pylon", label: "Pylon", icon: IconMessage },
  { href: "/status", label: "Customer", icon: IconBuilding },
];

export function Topbar() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/system/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SystemStatus;
        if (!cancelled) setStatus(data);
      } catch {
        // ignore
      }
    };
    refresh();
    const t = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <header className="topbar">
      <Link href="/" className="topbar-brand" style={{ color: "inherit" }}>
        <span className="brand-mark">
          <Image src="/temporal-logo.svg" alt="Temporal" width={20} height={20} priority />
        </span>
        <span className="brand-text">
          <span className="name">Service Ops</span>
          <span className="sub">Temporal · Acme AI</span>
        </span>
      </Link>

      <nav className="topbar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-link${active ? " active" : ""}`}
            >
              <Icon width={13} height={13} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="topbar-status">
        <span
          className={`status-pill ${status?.workerConnected ? "live" : status?.temporalReachable ? "warn" : "danger"}`}
          title={status?.workerConnected ? "Worker polling task queue" : status?.temporalReachable ? "No worker connected" : "Temporal unreachable"}
        >
          <span className="dot" />
          {status?.workerConnected ? "worker.live" : status?.temporalReachable ? "no.worker" : "off"}
        </span>
        <span
          className={`status-pill ${status?.llmMode === "live" ? "live" : ""}`}
          title={status?.model ? `Calling ${status.model}` : "Anthropic SDK"}
        >
          <IconBrain width={12} height={12} />
          {status?.model ?? "claude.opus-4-7"}
        </span>
      </div>
    </header>
  );
}
