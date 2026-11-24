import type { Category, Locale } from '../types/qorvia';
import { buildCategoryPath } from '../lib/routing';
import { UI_COPY } from '../lib/i18n';

interface SiteFooterProps {
  locale: Locale;
  categories: Category[];
  onNavigate: (path: string) => void;
}

export function SiteFooter({ locale, categories, onNavigate }: SiteFooterProps) {
  const copy = UI_COPY[locale];

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="mt-20 border-t border-black/10 dark:border-white/10 bg-[#F5F4EF]/65 dark:bg-[#0B111E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <a
              href={`/${locale}/`}
              onClick={handleLink(`/${locale}/`)}
              className="font-editorial text-2xl font-bold tracking-tight text-[#101827] dark:text-[#F5F4EF]"
            >
              {copy.brandName}
            </a>
            <p className="mt-2 text-xs font-semibold tracking-wide text-[#4263EB] dark:text-[#748FFC]">
              {copy.tagline}
            </p>
            <p className="mt-4 text-sm text-black/65 dark:text-[#A5AAB4] leading-relaxed max-w-md">
              {copy.footer.mission}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="/en/"
                onClick={handleLink('/en/')}
                className="btn-transparent-black px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                English Edition
              </a>
              <a
                href="/bn/"
                onClick={handleLink('/bn/')}
                className="btn-transparent-black px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                বাংলা সংস্করণ
              </a>
            </div>
          </div>

          {/* Departments */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/55 dark:text-white/60 mb-4">
              {copy.footer.sectionsHeading}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.map((cat) => {
                const path = buildCategoryPath(locale, cat.slug);
                return (
                  <li key={cat.id}>
                    <a
                      href={path}
                      onClick={handleLink(path)}
                      className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC] transition-colors"
                    >
                      {cat.shortName[locale]}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Publication */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/55 dark:text-white/60 mb-4">
              {copy.footer.publicationHeading}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={`/${locale}/latest`}
                  onClick={handleLink(`/${locale}/latest`)}
                  className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                >
                  {copy.nav.latest}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/featured`}
                  onClick={handleLink(`/${locale}/featured`)}
                  className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                >
                  {copy.nav.featured}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/trending`}
                  onClick={handleLink(`/${locale}/trending`)}
                  className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                >
                  {copy.nav.trending}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/archive`}
                  onClick={handleLink(`/${locale}/archive`)}
                  className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                >
                  {copy.nav.archive}
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  onClick={handleLink('/login')}
                  className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                >
                  {copy.nav.admin}
                </a>
              </li>
            </ul>
          </div>

          {/* Standards & Legal */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/55 dark:text-white/60 mb-4">
              {copy.footer.legalHeading}
            </h3>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-2.5 text-sm">
              {[
                { path: `/${locale}/about`, label: copy.footer.links.about },
                { path: `/${locale}/contact`, label: copy.footer.links.contact },
                { path: `/${locale}/editorial-policy`, label: copy.footer.links.editorialPolicy },
                { path: `/${locale}/corrections-policy`, label: copy.footer.links.correctionsPolicy },
                { path: `/${locale}/advertise`, label: copy.footer.links.advertise },
                { path: `/${locale}/privacy`, label: copy.footer.links.privacy },
                { path: `/${locale}/terms`, label: copy.footer.links.terms },
                { path: `/${locale}/sitemap`, label: copy.footer.links.sitemap },
              ].map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    onClick={handleLink(link.path)}
                    className="text-black/75 dark:text-white/75 hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-black/55 dark:text-[#A5AAB4]">
          <p>© {new Date().getFullYear()} {copy.footer.copyright}</p>
          <p className="font-semibold tracking-wider text-[#101827] dark:text-[#F5F4EF]">
            {copy.attributionBanner}
          </p>
        </div>
      </div>
    </footer>
  );
}
