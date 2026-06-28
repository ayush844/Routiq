"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { AnimatedButton } from "@/components/animated-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "CLI", href: "#cli" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 right-0 top-6 z-50 px-4 md:px-6"
      >
        <motion.nav
          animate={{
            paddingTop: scrolled ? 10 : 16,
            paddingBottom: scrolled ? 10 : 16,
            paddingLeft: scrolled ? 24 : 32,
            paddingRight: scrolled ? 24 : 32,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "mx-auto flex max-w-5xl items-center justify-between rounded-full border border-ink/10 bg-white shadow-nav",
            scrolled && "shadow-card"
          )}
        >
          <Link href="/" className="shrink-0">
            <Logo size="sm" />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium tracking-[-0.02em] text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://github.com/ayush844/Routiq"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
            <AnimatedButton size="sm" asChild>
              <Link href="#cta">Get Started</Link>
            </AnimatedButton>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-4 mt-24 rounded-[40px] border border-ink/10 bg-white p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-charcoal transition-colors hover:text-ink"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="border-ink/10" />
                <a
                  href="https://github.com/ayush844/Routiq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-charcoal hover:text-ink"
                >
                  <Github className="h-5 w-5" />
                  GitHub
                </a>
                <AnimatedButton asChild>
                  <Link href="#cta" onClick={() => setMobileOpen(false)}>
                    Get Started
                  </Link>
                </AnimatedButton>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
