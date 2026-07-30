"use client";

import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import { Logo } from "@/components/logo";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "CLI", href: "#cli" },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Pricing", href: "#pricing" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "GitHub", href: "https://github.com/ayush844" },
    { label: "Changelog", href: "#" },
    { label: "API Reference", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Twitter", href: "https://x.com/ayushuprush" },
    { label: "Contact", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="relative bg-ink py-12 md:py-20">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo variant="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Securely expose localhost to the internet through a simple CLI.
              Built for developers who ship fast.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/ayush844"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/50 transition-colors hover:border-white/40 hover:text-white"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/ayushuprush"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/50 transition-colors hover:border-white/40 hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.04em] text-white/40">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/60 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/60 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Routiq. All rights reserved.
          </p>
          <p className="text-sm text-white/50">
            Made with ❤️ by Ayush Sharma
          </p>
        </div>
      </div>
    </footer>
  );
}
