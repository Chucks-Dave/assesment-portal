"use client";

import Link from "next/link";
import { useRef, useState, type ReactElement } from "react";
import { Icon } from "@/components/ui/icon";

const navigation = [
  { label: "About UEMP", href: "/#about" },
  { label: "Student services", href: "/#services" },
  { label: "Getting started", href: "/#getting-started" },
  { label: "Help & support", href: "/#support" },
];

export function Brand(): ReactElement {
  return (
    <Link className="brand" href="/" aria-label="UEMP home">
      <span className="brand-symbol">
        <Icon name="book" />
      </span>
      <span>
        <span className="brand-name">
          UEMP<span className="brand-dot">.</span>
        </span>
        <span className="brand-caption">Your academic home</span>
      </span>
    </Link>
  );
}

export function Header(): ReactElement {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Announcement />
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <button
            ref={menuButton}
            className="menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={(): void => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
          <nav
            id="main-navigation"
            aria-label="Main navigation"
            className={`navigation ${open ? "is-open" : ""}`}
            onKeyDown={(event): void => {
              if (event.key === "Escape") {
                setOpen(false);
                menuButton.current?.focus();
              }
            }}
          >
            {navigation.map((item): ReactElement => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(): void => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="button button-green nav-login"
              href="/login"
              onClick={(): void => setOpen(false)}
            >
              Portal login <Icon name="arrow" />
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

function Announcement(): ReactElement {
  return (
    <div className="announcement">
      <span>Your academic journey. One connected place.</span>
      <Link href="/login">
        Access your portal <Icon name="arrow" />
      </Link>
    </div>
  );
}
