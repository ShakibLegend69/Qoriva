import { useState } from 'react';
import { LogIn, Menu, Moon, Search, Sun, User, X } from 'lucide-react';
import type { Category, Locale } from '../types/qorvia';
import { buildCategoryPath } from '../lib/routing';
import { UI_COPY } from '../lib/i18n';
import { useFirebase } from '../contexts/FirebaseContext';

interface SiteHeaderProps {
  locale: Locale;
  categories: Category[];
  theme: 'light' | 'dark';
  equivalentOtherLocalePath: string;
  onToggleTheme: () => void;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

export function SiteHeader({
  locale,
  categories,
  theme,
  equivalentOtherLocalePath,
  onToggleTheme,
  onNavigate,
  onOpenSearch,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { firebaseUser } = useFirebase();
  const copy = UI_COPY[locale];
  const accountLabel = firebaseUser
    ? locale === 'bn'
      ? 'অ্যাকাউন্ট'
      : 'Account'
    : copy.nav.admin;

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(path);
  };

  return (
    <>
      {/* Top Attribution & Utility Strip (non-sticky so mobile sticky cap remains <10%) */}
      <div className="w-full border-b border-black/10 dark:border-white/10 bg-[#F5F4EF] dark:bg-[#0E1627]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#101827] dark:text-[#F5F4EF]">
            {copy.attributionBanner}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bilingual Language Switcher (Transparent Black Toggle) */}
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center p-0.5 rounded-lg bg-black/[0.06] dark:bg-black/45 border border-black/15 dark:border-white/15"
            >
              <a
                href={locale === 'en' ? '/en/' : equivalentOtherLocalePath}
                onClick={handleLink(locale === 'en' ? '/en/' : equivalentOtherLocalePath)}
                aria-current={locale === 'en' ? 'true' : undefined}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  locale === 'en'
                    ? 'bg-black/85 text-white dark:bg-white dark:text-[#101827]'
                    : 'text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white'
                }`}
              >
                EN
              </a>
              <a
                href={locale === 'bn' ? '/bn/' : equivalentOtherLocalePath}
                onClick={handleLink(locale === 'bn' ? '/bn/' : equivalentOtherLocalePath)}
                aria-current={locale === 'bn' ? 'true' : undefined}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  locale === 'bn'
                    ? 'bg-black/85 text-white dark:bg-white dark:text-[#101827]'
                    : 'text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white'
                }`}
              >
                বাংলা
              </a>
            </div>

            {/* Light / Dark Theme Toggle (Transparent Black Button) */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="btn-transparent-black inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Zone Sticky Editorial Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0B111E]/95 backdrop-blur-md border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href={`/${locale}/`}
            onClick={handleLink(`/${locale}/`)}
            className="font-editorial text-2xl font-bold tracking-tight text-[#101827] dark:text-[#F5F4EF] whitespace-nowrap shrink-0"
          >
            {copy.brandName}
          </a>

          {/* Zone 2: 4 Single-line Category Navigation Links */}
          <nav
            aria-label="Primary categories"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-black/75 dark:text-white/80"
          >
            {categories.map((cat) => {
              const catPath = buildCategoryPath(locale, cat.slug);
              return (
                <a
                  key={cat.id}
                  href={catPath}
                  onClick={handleLink(catPath)}
                  className="hover:text-[#101827] dark:hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0"
                >
                  {cat.shortName[locale]}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label={copy.nav.searchButton}
              className="btn-transparent-black inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{copy.nav.searchButton}</span>
            </button>

            <a
              href="/login"
              onClick={handleLink('/login')}
              className="btn-transparent-black-solid hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {firebaseUser ? (
                <User className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{accountLabel}</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? copy.nav.closeMenu : copy.nav.menuLabel}
              className="btn-transparent-black lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg cursor-pointer"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#0B111E] px-4 py-4 space-y-1"
          >
            {categories.map((cat) => {
              const catPath = buildCategoryPath(locale, cat.slug);
              return (
                <a
                  key={cat.id}
                  href={catPath}
                  onClick={handleLink(catPath)}
                  className="block py-2.5 px-3 rounded-lg text-sm font-medium text-[#101827] dark:text-[#F5F4EF] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {cat.name[locale]}
                </a>
              );
            })}
            <div className="pt-3 mt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-2 gap-2">
              <a
                href={`/${locale}/latest`}
                onClick={handleLink(`/${locale}/latest`)}
                className="btn-transparent-black text-center py-2.5 px-3 rounded-lg text-xs font-semibold"
              >
                {copy.nav.latest}
              </a>
              <a
                href={`/${locale}/trending`}
                onClick={handleLink(`/${locale}/trending`)}
                className="btn-transparent-black text-center py-2.5 px-3 rounded-lg text-xs font-semibold"
              >
                {copy.nav.trending}
              </a>
              <a
                href={`/${locale}/about`}
                onClick={handleLink(`/${locale}/about`)}
                className="btn-transparent-black text-center py-2.5 px-3 rounded-lg text-xs font-semibold"
              >
                {copy.nav.about}
              </a>
              <a
                href="/login"
                onClick={handleLink('/login')}
                className="btn-transparent-black-solid inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold"
              >
                {firebaseUser ? (
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{accountLabel}</span>
              </a>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
