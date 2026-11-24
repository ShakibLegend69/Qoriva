import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import type { Article, Category, Locale } from '../types/qorvia';
import { filterAndSortArticles } from '../lib/search';
import { buildArticlePath } from '../lib/routing';
import { UI_COPY } from '../lib/i18n';

interface SearchOverlayProps {
  isOpen: boolean;
  locale: Locale;
  articles: Article[];
  categories: Category[];
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function SearchOverlay({
  isOpen,
  locale,
  articles,
  categories,
  onClose,
  onNavigate,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = UI_COPY[locale];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = filterAndSortArticles(articles, {
    locale,
    query,
    sortBy: query.trim() ? 'latest' : 'popular',
    pageSize: 6,
  });

  const handleSearchPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    const encoded = encodeURIComponent(query.trim());
    onNavigate(encoded ? `/${locale}/search?q=${encoded}` : `/${locale}/search`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.nav.searchButton}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#101827] border border-black/15 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSearchPageSubmit}
          className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-black/10 dark:border-white/10"
        >
          <Search className="w-5 h-5 text-black/50 dark:text-white/50 shrink-0" aria-hidden="true" />
          <label htmlFor="qorvia-overlay-search" className="sr-only">
            {copy.nav.searchPlaceholder}
          </label>
          <input
            ref={inputRef}
            id="qorvia-overlay-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.nav.searchPlaceholder}
            className="flex-1 bg-transparent text-sm sm:text-base text-[#101827] dark:text-[#F5F4EF] placeholder:text-black/45 dark:placeholder:text-white/45 focus:outline-none"
          />
          <button
            type="submit"
            className="btn-transparent-black px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.nav.searchButton}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.nav.closeMenu}
            className="btn-transparent-black p-2 rounded-lg shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 space-y-2">
          {results.items.length > 0 ? (
            results.items.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const path = buildArticlePath(locale, item.slug);
              return (
                <a
                  key={item.articleId}
                  href={path}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    onNavigate(path);
                  }}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                >
                  <div>
                    <div className="text-xs text-[#4263EB] dark:text-[#748FFC] font-medium mb-0.5">
                      {cat?.shortName[locale]} · {item.readingTimeMinutes} {copy.sections.minRead}
                    </div>
                    <div className="text-sm font-semibold text-[#101827] dark:text-[#F5F4EF]">
                      {item.title}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-black/40 dark:text-white/40 mt-1 shrink-0" aria-hidden="true" />
                </a>
              );
            })
          ) : (
            <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-6 text-center">
              {copy.sections.noArticlesFound}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
