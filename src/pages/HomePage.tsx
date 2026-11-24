import { ArrowRight } from 'lucide-react';
import type {
  AdSlotConfig,
  Article,
  Author,
  Category,
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
import { NewsletterSection } from '../components/NewsletterSection';

interface HomePageProps {
  locale: Locale;
  articles: Article[];
  categories: Category[];
  authors: Author[];
  monetagAds: MonetagAdEntry[];
  adSlots?: AdSlotConfig[];
  directBanners?: DirectBannerCampaign[];
  globalAdSettings?: GlobalAdSettings;
  onNavigate: (path: string) => void;
}

export function HomePage({
  locale,
  articles,
  categories,
  authors,
  monetagAds,
  adSlots,
  directBanners,
  globalAdSettings,
  onNavigate,
}: HomePageProps) {
  const copy = UI_COPY[locale];

  const featuredResult = filterAndSortArticles(articles, {
    locale,
    sortBy: 'featured',
    pageSize: 6,
  });
  const latestResult = filterAndSortArticles(articles, {
    locale,
    sortBy: 'latest',
    pageSize: 6,
  });
  const popularResult = filterAndSortArticles(articles, {
    locale,
    sortBy: 'popular',
    pageSize: 4,
  });

  const leadArticle = featuredResult.items[0] ?? latestResult.items[0];
  const secondaryFeatured = featuredResult.items
    .filter((a) => a.articleId !== leadArticle?.articleId)
    .slice(0, 3);
  const recommendedArticles = articles
    .filter((a) => a.status === 'published' && a.locale === locale && a.isRecommended)
    .slice(0, 4);

  const findCategory = (id: string) => categories.find((c) => c.id === id);
  const findAuthor = (id: string) => authors.find((a) => a.id === id);

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Header Ad Placement */}
      <AdSlotBanner
        placement="header"
        locale={locale}
        monetagAds={monetagAds}
        adSlots={adSlots}
        directBanners={directBanners}
        globalAdSettings={globalAdSettings}
        onNavigate={onNavigate}
      />

      {/* Editorial Hero Section */}
      <section aria-labelledby="hero-headline" className="space-y-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4263EB] dark:text-[#748FFC] mb-3">
            {copy.hero.kicker}
          </p>
          <h1
            id="hero-headline"
            className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#101827] dark:text-[#F5F4EF] leading-[1.08]"
          >
            {copy.hero.headline}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-black/70 dark:text-white/75 leading-relaxed max-w-2xl">
            {copy.hero.subheadline}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={`/${locale}/latest`}
              onClick={handleLink(`/${locale}/latest`)}
              className="btn-transparent-black-solid inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap"
            >
              <span>{copy.hero.primaryCta}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href={locale === 'en' ? '/bn/' : '/en/'}
              onClick={handleLink(locale === 'en' ? '/bn/' : '/en/')}
              className="btn-transparent-black inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap"
            >
              {copy.hero.secondaryCta}
            </a>
          </div>
        </div>

        {/* Lead Story */}
        {leadArticle && (
          <ArticleCard
            article={leadArticle}
            category={findCategory(leadArticle.categoryId)}
            author={findAuthor(leadArticle.authorId)}
            locale={locale}
            variant="lead"
            onNavigate={onNavigate}
          />
        )}
      </section>

      {/* Featured & Latest Section */}
      <section aria-labelledby="latest-heading" className="space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
          <h2
            id="latest-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#101827] dark:text-[#F5F4EF]"
          >
            {copy.sections.latestHeading}
          </h2>
          <a
            href={`/${locale}/latest`}
            onClick={handleLink(`/${locale}/latest`)}
            className="btn-transparent-black px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
          >
            {copy.sections.viewAll}
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(secondaryFeatured.length > 0 ? secondaryFeatured : latestResult.items.slice(0, 3)).map(
            (article) => (
              <ArticleCard
                key={article.articleId}
                article={article}
                category={findCategory(article.categoryId)}
                author={findAuthor(article.authorId)}
                locale={locale}
                onNavigate={onNavigate}
              />
            )
          )}
        </div>
      </section>

      {/* Homepage Content Ad Slot */}
      <AdSlotBanner
        placement="homepage_content"
        locale={locale}
        monetagAds={monetagAds}
        adSlots={adSlots}
        directBanners={directBanners}
        globalAdSettings={globalAdSettings}
        onNavigate={onNavigate}
      />

      {/* Four Primary Editorial Category Sections */}
      <section aria-labelledby="categories-heading" className="space-y-8">
        <div className="border-b border-black/10 dark:border-white/10 pb-4">
          <h2
            id="categories-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#101827] dark:text-[#F5F4EF]"
          >
            {copy.sections.categoriesHeading}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const catPath = buildCategoryPath(locale, cat.slug);
            const catArticles = filterAndSortArticles(articles, {
              locale,
              categoryId: cat.slug,
              pageSize: 2,
            }).items;

            return (
              <div
                key={cat.id}
                className="border border-black/10 dark:border-white/10 bg-[#F5F4EF]/45 dark:bg-white/[0.02] rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                      <a
                        href={catPath}
                        onClick={handleLink(catPath)}
                        className="hover:text-[#4263EB] dark:hover:text-[#748FFC]"
                      >
                        {cat.name[locale]}
                      </a>
                    </h3>
                    <a
                      href={catPath}
                      onClick={handleLink(catPath)}
                      className="btn-transparent-black px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      {copy.sections.viewAll}
                    </a>
                  </div>
                  <p className="text-sm text-black/65 dark:text-[#A5AAB4] leading-relaxed mb-5">
                    {cat.description[locale]}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {cat.subcategories.map((sub) => {
                      const subPath = buildCategoryPath(locale, cat.slug, sub.slug);
                      return (
                        <a
                          key={sub.id}
                          href={subPath}
                          onClick={handleLink(subPath)}
                          className="btn-transparent-black px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap"
                        >
                          {sub.name[locale]}
                        </a>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-black/10 dark:border-white/10 pt-2">
                  {catArticles.map((art) => (
                    <ArticleCard
                      key={art.articleId}
                      article={art}
                      category={cat}
                      author={findAuthor(art.authorId)}
                      locale={locale}
                      variant="compact"
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular & Recommended Reading Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
            <h2 className="font-editorial text-2xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              {copy.sections.trendingHeading}
            </h2>
            <a
              href={`/${locale}/trending`}
              onClick={handleLink(`/${locale}/trending`)}
              className="text-xs font-semibold text-[#4263EB] dark:text-[#748FFC] hover:underline"
            >
              {copy.sections.viewAll}
            </a>
          </div>
          <div>
            {popularResult.items.map((art) => (
              <ArticleCard
                key={art.articleId}
                article={art}
                category={findCategory(art.categoryId)}
                author={findAuthor(art.authorId)}
                locale={locale}
                variant="compact"
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
            <h2 className="font-editorial text-2xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              {copy.sections.recommendedHeading}
            </h2>
            <a
              href={`/${locale}/featured`}
              onClick={handleLink(`/${locale}/featured`)}
              className="text-xs font-semibold text-[#4263EB] dark:text-[#748FFC] hover:underline"
            >
              {copy.sections.viewAll}
            </a>
          </div>
          <div>
            {recommendedArticles.map((art) => (
              <ArticleCard
                key={art.articleId}
                article={art}
                category={findCategory(art.categoryId)}
                author={findAuthor(art.authorId)}
                locale={locale}
                variant="compact"
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <NewsletterSection locale={locale} />
    </div>
  );
}
