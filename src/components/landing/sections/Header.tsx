'use client';

import Link from 'next/link';
import { ChevronDown, FileText, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from '../ProfessionalLandingPage.module.css';

const PRODUCT_GROUPS = [
  {
    label: 'Build',
    links: [
      { label: 'Resume builder', href: '/builder' },
      { label: 'Templates', href: '/builder' },
    ],
  },
  {
    label: 'Check',
    links: [
      { label: 'ATS score', href: '/ats-score' },
      { label: 'Analyzer', href: '/analyzer' },
      { label: 'Improver', href: '/improver' },
    ],
  },
  {
    label: 'Grow',
    links: [
      { label: 'Jobs', href: '/jobs' },
      { label: 'Roadmap', href: '/guidance' },
      { label: 'Skills', href: '/skills' },
      { label: 'Interview prep', href: '/interview-prep' },
      { label: 'Assistant', href: '/dashboard' },
    ],
  },
] as const;

export function LandingHeader() {
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const productButtonRef = useRef<HTMLButtonElement>(null);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (productOpen) {
        setProductOpen(false);
        productButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const mainContent = document.getElementById('main-content');
    const previousMainInert = mainContent?.inert ?? false;
    const mobileOpener = mobileButtonRef.current;
    document.body.style.overflow = 'hidden';
    if (mainContent) mainContent.inert = true;

    const focusFrame = window.requestAnimationFrame(() => mobileCloseButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        mobileDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !mobileDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (mainContent) mainContent.inert = previousMainInert;
      mobileOpener?.focus();
    };
  }, [mobileOpen]);

  const focusProductLink = (direction: 1 | -1) => {
    const links = productMenuRef.current?.querySelectorAll<HTMLAnchorElement>('a');
    if (!links?.length) return;
    const activeIndex = Array.from(links).indexOf(document.activeElement as HTMLAnchorElement);
    const nextIndex = activeIndex < 0
      ? direction === 1 ? 0 : links.length - 1
      : (activeIndex + direction + links.length) % links.length;
    links[nextIndex]?.focus();
  };

  return (
    <>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <header className={styles.landingHeader} aria-hidden={mobileOpen || undefined}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.landingBrand} aria-label="Smart Resume AI home">
            <span className={styles.brandIcon} aria-hidden="true"><FileText /></span>
            <span>Smart Resume <strong>AI</strong></span>
          </Link>

          <nav className={styles.headerNav} aria-label="Main navigation">
            <div className={styles.productMenuWrap}>
              <button
                ref={productButtonRef}
                type="button"
                className={styles.productMenuButton}
                aria-expanded={productOpen}
                aria-controls="landing-product-menu"
                onClick={() => setProductOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setProductOpen(true);
                    requestAnimationFrame(() => focusProductLink(1));
                  }
                }}
              >
                Product
                <ChevronDown aria-hidden="true" />
              </button>

              {productOpen && (
                <div
                  ref={productMenuRef}
                  id="landing-product-menu"
                  className={styles.productMenu}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      focusProductLink(event.key === 'ArrowDown' ? 1 : -1);
                    }
                  }}
                >
                  {PRODUCT_GROUPS.map((group) => (
                    <div key={group.label} className={styles.productGroup}>
                      <span>{group.label}</span>
                      {group.links.map((link) => (
                        <Link key={`${group.label}-${link.label}`} href={link.href} onClick={() => setProductOpen(false)}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link href="/faq">FAQ</Link>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/login" className={styles.headerSignIn}>Sign in</Link>
            <Link href="/builder" className={styles.headerPrimary}>Create your resume</Link>
          </div>

          <button
            ref={mobileButtonRef}
            type="button"
            className={`${styles.mobileMenuButton} ${mobileOpen ? styles.mobileMenuButtonHidden : ''}`}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-drawer"
            tabIndex={mobileOpen ? -1 : 0}
            onClick={() => {
              setProductOpen(false);
              setMobileOpen(true);
            }}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className={styles.mobileDrawerLayer}>
          <div
            className={styles.mobileDrawerBackdrop}
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={mobileDialogRef}
            id="landing-mobile-drawer"
            className={styles.mobileDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-mobile-drawer-title"
          >
            <div className={styles.mobileDrawerHeader}>
              <span id="landing-mobile-drawer-title">Product</span>
              <button
                ref={mobileCloseButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.mobileDrawerNav} aria-label="Mobile navigation">
              <div className={styles.mobileProductGroups}>
                {PRODUCT_GROUPS.map((group) => (
                  <div key={group.label} className={styles.mobileProductGroup}>
                    <span>{group.label}</span>
                    {group.links.map((link) => (
                      <Link key={`${group.label}-${link.label}`} href={link.href} onClick={() => setMobileOpen(false)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <Link href="/faq" className={styles.mobileFaqLink} onClick={() => setMobileOpen(false)}>FAQ</Link>
              <div className={styles.mobileDrawerActions}>
                <Link href="/login" className={styles.heroSecondaryButton} onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link href="/builder" className={styles.heroPrimaryButton} onClick={() => setMobileOpen(false)}>Create your resume</Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
