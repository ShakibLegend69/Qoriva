import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { Article, Author, Category, CategorySlug, Locale } from '../types/qorvia';
import { filterAndSortArticles } from '../lib/search';
import { UI_COPY } from '../lib/i18n';
import { ArticleCard } from '../components/ArticleCard';

interface CollectionPageProps {
  mode: 'latest' | 'featured' | 'trending' | 'archive' | 'search' | 'author' | 'not_found';
  locale: Locale;
  articles: Article[];
  categories: Category[];
  authors: Author[];
  initialQuery?: string;
  authorId?: string;
  onNavigate: (path: string) => void;
}

export function CollectionPage({
  mode,
  locale,
  articles,
  categories,
  authors,
  initialQuery = '',
  authorId,
  onNavigate,
}: CollectionPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>('all');
  const copy = UI_COPY[locale];

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const findCategory = (id: string) => categories.find((c) => c.id === id);
  const findAuthor = (id: string) => authors.find((a) => a.id === id);

  if (mode === 'not_found') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="font-mono-tabular text-xs font-semibold uppercase tracking-widest text-[#4263EB] mb-3">
          404
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF] mb-4">
          {copy.pages.notFoundTitle}
        </h1>
        <p className="text-base text-black/65 dark:text-[#A5AAB4] mb-8">
          {copy.pages.notFoundBody}
        </p>
        <a
          href={`/${locale}/`}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(`/${locale}/`);
          }}
          className="btn-transparent-black-solid inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          {copy.pages.backHome}
        </a>
      </div>
    );
  }

  const authorProfile = mode === 'author' && authorId ? findAuthor(authorId) : undefined;

  if (mode === 'author' && !authorProfile) {
    return (
      <CollectionPage
        mode="not_found"
        locale={locale}
        articles={articles}
        categories={categories}
        authors={authors}
        onNavigate={onNavigate}
      />
    );
  }

  const sortBy =
    mode === 'trending' ? 'popular' : mode === 'featured' ? 'featured' : 'latest';

  const baseResult = filterAndSortArticles(articles, {
    locale,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    query: mode === 'search' ? query : undefined,
    sortBy,
    pageSize: 24,
  });

  const displayArticles =
    mode === 'author' && authorProfile
      ? baseResult.items.filter((a) => a.authorId === authorProfile.id)
      : baseResult.items;

  const heading =
    mode === 'latest'
      ? copy.pages.latestTitle
      : mode === 'featured'
        ? copy.pages.featuredTitle
        : mode === 'trending'
          ? copy.pages.trendingTitle
          : mode === 'archive'
            ? copy.pages.archiveTitle
            : mode === 'search'
              ? copy.pages.searchTitle
              : authorProfile?.name[locale] ?? '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      <header className="border-b border-black/10 dark:border-white/10 pb-8">
        {mode === 'author' && authorProfile ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <img
              src={authorProfile.avatarUrl}
              alt={authorProfile.name[locale]}
              className="w-20 h-20 rounded-full object-cover border border-black/15 dark:border-white/15 shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-[#4263EB] dark:text-[#748FFC] mb-1">
                {authorProfile.role[locale]} · {authorProfile.location[locale]}
              </p>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF]">
                {authorProfile.name[locale]}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-black/70 dark:text-white/75 max-w-2xl leading-relaxed">
                {authorProfile.bio[locale]}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF]">
              {heading}
            </h1>
            {mode === 'search' && (
              <p className="mt-2 text-sm sm:text-base text-black/65 dark:text-[#A5AAB4]">
                {copy.pages.searchSubtitle}
              </p>
            )}
          </>
        )}

        {/* Interactive Search & Category Filter Controls */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {mode === 'search' && (
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-black/45 dark:text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="collection-search-input" className="sr-only">
                {copy.nav.searchPlaceholder}
              </label>
              <input
                id="collection-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.nav.searchPlaceholder}
                className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#11192B] border border-black/15 dark:border-white/15 text-sm text-[#101827] dark:text-[#F5F4EF]"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Category filter">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedCategory === 'all' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
              }`}
            >
              {copy.sections.allSubcategories}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'btn-transparent-black-solid'
                    : 'btn-transparent-black'
                }`}
              >
                {cat.shortName[locale]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {displayArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayArticles.map((art) => (
            <ArticleCard
              key={art.articleId}
              article={art}
              category={findCategory(art.categoryId)}
              author={findAuthor(art.authorId)}
              locale={locale}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div className="border border-black/10 dark:border-white/10 rounded-2xl p-12 text-center">
          <p className="text-sm text-black/65 dark:text-[#A5AAB4] mb-4">
            {copy.sections.noArticlesFound}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
            }}
            className="btn-transparent-black px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            {copy.sections.resetFilters}
          </button>
        </div>
      )}
    </div>
  );
}
