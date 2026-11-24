import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type {
  AdSlotConfig,
  Article,
  Author,
  Category,
  CategorySlug,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
} from '../types/qorvia';
import { buildCategoryPath } from '../lib/routing';
import { filterAndSortArticles } from '../lib/search';
import { UI_COPY } from '../lib/i18n';
import { ArticleCard } from '../components/ArticleCard';
import { AdSlotBanner } from '../components/AdSlotBanner';

interface CategoryPageProps {
  locale: Locale;
  categorySlug: CategorySlug;
  subcategorySlug?: string;
  categories: Category[];
  articles: Article[];
  authors: Author[];
  monetagAds: MonetagAdEntry[];
  adSlots?: AdSlotConfig[];
  directBanners?: DirectBannerCampaign[];
  globalAdSettings?: GlobalAdSettings;
  onNavigate: (path: string) => void;
}

export function CategoryPage({
  locale,
  categorySlug,
  subcategorySlug,
  categories,
  articles,
  authors,
  monetagAds,
  adSlots,
  directBanners,
  globalAdSettings,
  onNavigate,
}: CategoryPageProps) {
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [page, setPage] = useState(1);

  const copy = UI_COPY[locale];
  const category = categories.find((c) => c.slug === categorySlug);
  const activeSub = category?.subcategories.find((s) => s.slug === subcategorySlug);

  if (!category) {
    return null;
  }

  const result = filterAndSortArticles(articles, {
    locale,
    categoryId: category.slug,
    subcategorySlug,
    sortBy,
    page,
    pageSize: 6,
  });

  const popularInCategory = filterAndSortArticles(articles, {
    locale,
    categoryId: category.slug,
    sortBy: 'popular',
    pageSize: 4,
  }).items;

  const findAuthor = (id: string) => authors.find((a) => a.id === id);

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setPage(1);
    onNavigate(path);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-black/60 dark:text-[#A5AAB4]">
        <a
          href={`/${locale}/`}
          onClick={handleLink(`/${locale}/`)}
          className="hover:text-[#101827] dark:hover:text-white"
        >
          QORVIA
        </a>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <a
          href={buildCategoryPath(locale, category.slug)}
          onClick={handleLink(buildCategoryPath(locale, category.slug))}
          className="hover:text-[#101827] dark:hover:text-white"
        >
          {category.name[locale]}
        </a>
        {activeSub && (
          <>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-medium text-[#101827] dark:text-[#F5F4EF]">
              {activeSub.name[locale]}
            </span>
          </>
        )}
      </nav>

      {/* Category Header */}
      <header className="border-b border-black/10 dark:border-white/10 pb-8">
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF]">
          {activeSub ? activeSub.name[locale] : category.name[locale]}
        </h1>
        <p className="mt-3 text-base text-black/70 dark:text-white/75 max-w-2xl leading-relaxed">
          {activeSub ? activeSub.description[locale] : category.description[locale]}
        </p>

        {/* Subcategory Filter Controls + Sort Toggle */}
        <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.sections.subcategoriesLabel}>
            <a
              href={buildCategoryPath(locale, category.slug)}
              onClick={handleLink(buildCategoryPath(locale, category.slug))}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                !subcategorySlug
                  ? 'btn-transparent-black-solid'
                  : 'btn-transparent-black'
              }`}
            >
              {copy.sections.allSubcategories}
            </a>
            {category.subcategories.map((sub) => {
              const isSelected = sub.slug === subcategorySlug;
              return (
                <a
                  key={sub.id}
                  href={buildCategoryPath(locale, category.slug, sub.slug)}
                  onClick={handleLink(buildCategoryPath(locale, category.slug, sub.slug))}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected ? 'btn-transparent-black-solid' : 'btn-transparent-black'
                  }`}
                >
                  {sub.name[locale]}
                </a>
              );
            })}
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-black/[0.06] dark:bg-black/45 border border-black/15 dark:border-white/15 self-start">
            <button
              type="button"
              onClick={() => setSortBy('latest')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                sortBy === 'latest'
                  ? 'bg-black/85 text-white dark:bg-white dark:text-[#101827]'
                  : 'text-black/70 dark:text-white/70'
              }`}
            >
              {copy.nav.latest}
            </button>
            <button
              type="button"
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                sortBy === 'popular'
                  ? 'bg-black/85 text-white dark:bg-white dark:text-[#101827]'
                  : 'text-black/70 dark:text-white/70'
              }`}
            >
              {copy.nav.trending}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          {result.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.items.map((art) => (
                <ArticleCard
                  key={art.articleId}
                  article={art}
                  category={category}
                  author={findAuthor(art.authorId)}
                  locale={locale}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="border border-black/10 dark:border-white/10 rounded-2xl p-10 text-center">
              <p className="text-sm text-black/65 dark:text-[#A5AAB4] mb-4">
                {copy.sections.noArticlesFound}
              </p>
              <a
                href={buildCategoryPath(locale, category.slug)}
                onClick={handleLink(buildCategoryPath(locale, category.slug))}
                className="btn-transparent-black inline-flex px-4 py-2 rounded-lg text-xs font-semibold"
              >
                {copy.sections.resetFilters}
              </a>
            </div>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: result.totalPages }).map((_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`min-w-[40px] min-h-[40px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                      p === result.page ? 'btn-transparent-black-solid' : 'btn-transparent-black'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <AdSlotBanner
            placement="sidebar"
            locale={locale}
            monetagAds={monetagAds}
            adSlots={adSlots}
            directBanners={directBanners}
            globalAdSettings={globalAdSettings}
            onNavigate={onNavigate}
            variant="sidebar"
          />

          <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6">
            <h2 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF] mb-2">
              {copy.sections.trendingHeading}
            </h2>
            <div>
              {popularInCategory.map((art) => (
                <ArticleCard
                  key={art.articleId}
                  article={art}
                  category={category}
                  author={findAuthor(art.authorId)}
                  locale={locale}
                  variant="compact"
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
