import { useEffect, useState } from 'react';
import { Check, ChevronRight, ExternalLink, Globe, Link2, Share2 } from 'lucide-react';
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
import { buildArticlePath, buildCategoryPath } from '../lib/routing';
import { extractTableOfContents, getRelatedArticles } from '../lib/search';
import { isSafeExternalHttpUrl } from '../lib/seo';
import { formatLocalizedDate, UI_COPY } from '../lib/i18n';
import { EditorialImage } from '../components/EditorialImage';
import { AdSlotBanner } from '../components/AdSlotBanner';
import { ArticleCard } from '../components/ArticleCard';
import { NewsletterSection } from '../components/NewsletterSection';

interface ArticleDetailPageProps {
  locale: Locale;
  article: Article;
  allArticles: Article[];
  categories: Category[];
  authors: Author[];
  monetagAds: MonetagAdEntry[];
  adSlots?: AdSlotConfig[];
  directBanners?: DirectBannerCampaign[];
  globalAdSettings?: GlobalAdSettings;
  onEngagementUpdated?: (articleId: string, scoreDelta: number) => void;
  onNavigate: (path: string) => void;
}

export function ArticleDetailPage({
  locale,
  article,
  allArticles,
  categories,
  authors,
  monetagAds,
  adSlots,
  directBanners,
  globalAdSettings,
  onEngagementUpdated,
  onNavigate,
}: ArticleDetailPageProps) {
  const [copied, setCopied] = useState(false);
  const copy = UI_COPY[locale];

  useEffect(() => {
    let active = true;
    const ping = (event: 'view' | 'read') => {
      fetch('/api/engagement/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.articleId,
          locale: article.locale,
          event,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { scoreDelta?: number } | null) => {
          if (active && typeof data?.scoreDelta === 'number') {
            onEngagementUpdated?.(article.articleId, data.scoreDelta);
          }
        })
        .catch(() => {
          // Non-fatal
        });
    };

    ping('view');
    const readTimer = window.setTimeout(() => ping('read'), 8000);
    return () => {
      active = false;
      window.clearTimeout(readTimer);
    };
  }, [article.articleId, article.locale]);

  const category = categories.find((c) => c.id === article.categoryId);
  const subcategory = category?.subcategories.find((s) => s.slug === article.subcategorySlug);
  const author = authors.find((a) => a.id === article.authorId);
  const toc = extractTableOfContents(article);
  const related = getRelatedArticles(article, allArticles, 3);

  const otherLocale: Locale = locale === 'en' ? 'bn' : 'en';
  const siblingTranslation = allArticles.find(
    (a) =>
      a.translationGroupId === article.translationGroupId &&
      a.locale === otherLocale &&
      a.status === 'published'
  );

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(path);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        });
      } catch {
        // User cancelled share dialog
      }
    } else {
      await handleCopyLink();
    }
  };

  const midpointIndex = Math.max(1, Math.floor(article.contentBlocks.length / 2));

  return (
    <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-black/60 dark:text-[#A5AAB4] mb-8"
      >
        <a
          href={`/${locale}/`}
          onClick={handleLink(`/${locale}/`)}
          className="hover:text-[#101827] dark:hover:text-white"
        >
          QORVIA
        </a>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        {category && (
          <>
            <a
              href={buildCategoryPath(locale, category.slug)}
              onClick={handleLink(buildCategoryPath(locale, category.slug))}
              className="hover:text-[#101827] dark:hover:text-white"
            >
              {category.name[locale]}
            </a>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </>
        )}
        {subcategory && category && (
          <>
            <a
              href={buildCategoryPath(locale, category.slug, subcategory.slug)}
              onClick={handleLink(buildCategoryPath(locale, category.slug, subcategory.slug))}
              className="hover:text-[#101827] dark:hover:text-white"
            >
              {subcategory.name[locale]}
            </a>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </>
        )}
        <span className="truncate max-w-xs sm:max-w-md text-[#101827] dark:text-[#F5F4EF]">
          {article.title}
        </span>
      </nav>

      {/* Article Header */}
      <header className="max-w-4xl mb-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-[#A5AAB4] mb-4">
          <span className="font-semibold text-[#4263EB] dark:text-[#748FFC]">
            {category?.name[locale]}
          </span>
          {subcategory && (
            <>
              <span aria-hidden="true">/</span>
              <span>{subcategory.name[locale]}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {article.readingTimeMinutes} {copy.sections.minRead}
          </span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.12] text-[#101827] dark:text-[#F5F4EF] mb-5">
          {article.title}
        </h1>

        <p className="text-lg sm:text-xl text-black/70 dark:text-white/75 leading-relaxed mb-7">
          {article.excerpt}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            {author && (
              <a
                href={`/${locale}/author/${author.id}`}
                onClick={handleLink(`/${locale}/author/${author.id}`)}
                className="flex items-center gap-3 group"
              >
                <img
                  src={author.avatarUrl}
                  alt={author.name[locale]}
                  className="w-10 h-10 rounded-full object-cover border border-black/10 dark:border-white/10"
                />
                <div>
                  <div className="text-sm font-semibold text-[#101827] dark:text-[#F5F4EF] group-hover:text-[#4263EB]">
                    {author.name[locale]}
                  </div>
                  <div className="text-xs text-black/55 dark:text-[#A5AAB4]">
                    {author.role[locale]}
                  </div>
                </div>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-black/60 dark:text-[#A5AAB4]">
            <span>
              {copy.sections.publishedLabel}:{' '}
              <time dateTime={article.publishedAt}>
                {formatLocalizedDate(article.publishedAt, locale)}
              </time>
            </span>
            <span>
              {copy.sections.updatedLabel}:{' '}
              <time dateTime={article.updatedAt}>
                {formatLocalizedDate(article.updatedAt, locale)}
              </time>
            </span>
            {siblingTranslation && (
              <a
                href={buildArticlePath(otherLocale, siblingTranslation.slug)}
                onClick={handleLink(buildArticlePath(otherLocale, siblingTranslation.slug))}
                className="btn-transparent-black inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copy.sections.readInOtherLang}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Article Top Ad Slot */}
      <div className="mb-8">
        <AdSlotBanner
          placement="article_top"
          locale={locale}
          monetagAds={monetagAds}
          adSlots={adSlots}
          directBanners={directBanners}
          globalAdSettings={globalAdSettings}
          onNavigate={onNavigate}
        />
      </div>

      {/* Featured Image */}
      <div className="max-w-5xl mb-12">
        <EditorialImage
          src={article.featuredImage.src}
          alt={article.featuredImage.alt}
          caption={article.featuredImage.caption}
          aspectClass="aspect-[16/9]"
          className="[&>div]:rounded-2xl"
          priority
        />
      </div>

      {/* Asymmetric Reading Canvas: Body + Margin TOC/Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Essay Body */}
        <div className="lg:col-span-8 max-w-prose">
          <div className="space-y-6 text-base sm:text-[17px] leading-[1.8] text-[#101827]/90 dark:text-[#F5F4EF]/90">
            {article.contentBlocks.map((block, index) => {
              const showInArticleAd = index === midpointIndex;
              return (
                <div key={block.id} className="space-y-6">
                  {block.type === 'heading' &&
                    (block.level === 2 ? (
                      <h2
                        id={block.id}
                        className="font-editorial text-2xl sm:text-3xl font-semibold text-[#101827] dark:text-[#F5F4EF] pt-4 scroll-mt-24"
                      >
                        {block.text}
                      </h2>
                    ) : (
                      <h3
                        id={block.id}
                        className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF] pt-2 scroll-mt-24"
                      >
                        {block.text}
                      </h3>
                    ))}

                  {block.type === 'paragraph' && (
                    <p
                      className={
                        block.dropCap
                          ? 'first-letter:font-editorial first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-[#101827] dark:first-letter:text-[#F5F4EF]'
                          : ''
                      }
                    >
                      {block.text}
                    </p>
                  )}

                  {block.type === 'quote' && (
                    <blockquote className="my-8 py-6 border-y border-black/15 dark:border-white/15">
                      <p className="font-editorial italic text-xl sm:text-2xl text-[#101827] dark:text-[#F5F4EF] leading-relaxed">
                        “{block.text}”
                      </p>
                      {block.attribution && (
                        <footer className="mt-3 text-xs font-semibold tracking-wide text-black/55 dark:text-[#A5AAB4]">
                          — {block.attribution}
                        </footer>
                      )}
                    </blockquote>
                  )}

                  {block.type === 'list' &&
                    (block.ordered ? (
                      <ol className="list-decimal pl-6 space-y-3">
                        {block.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul className="list-disc pl-6 space-y-3">
                        {block.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ))}

                  {block.type === 'callout' && (
                    <div className="border border-black/15 dark:border-white/15 bg-[#F5F4EF] dark:bg-white/[0.04] rounded-xl p-6 my-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#22A06B] mb-2">
                        {block.title}
                      </div>
                      <p className="text-sm sm:text-base text-[#101827] dark:text-[#F5F4EF] leading-relaxed">
                        {block.text}
                      </p>
                    </div>
                  )}

                  {block.type === 'table' && (
                    <div className="overflow-x-auto border border-black/15 dark:border-white/15 rounded-xl my-6">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F5F4EF] dark:bg-white/[0.05] border-b border-black/10 dark:border-white/10">
                          <tr>
                            {block.headers.map((h) => (
                              <th key={h} className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10 dark:divide-white/10">
                          {block.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-4 py-3 text-sm">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {block.type === 'image' && (
                    <EditorialImage
                      src={block.src}
                      alt={block.alt}
                      caption={block.caption}
                      className="[&>div]:rounded-xl my-6"
                    />
                  )}

                  {showInArticleAd && (
                    <div className="my-8">
                      <AdSlotBanner
                        placement="in_article"
                        locale={locale}
                        monetagAds={monetagAds}
                        adSlots={adSlots}
                        directBanners={directBanners}
                        globalAdSettings={globalAdSettings}
                        onNavigate={onNavigate}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tags (Unboxed inline metadata) */}
          {article.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-black/60 dark:text-[#A5AAB4]">
              {article.tags.map((tag) => (
                <a
                  key={tag}
                  href={`/${locale}/search?q=${encodeURIComponent(tag)}`}
                  onClick={handleLink(`/${locale}/search?q=${encodeURIComponent(tag)}`)}
                  className="hover:text-[#4263EB] dark:hover:text-[#748FFC] underline-offset-4 hover:underline"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}

          {/* Verified Source References */}
          <section
            aria-labelledby="sources-heading"
            className="mt-10 border border-black/10 dark:border-white/10 bg-[#F5F4EF]/70 dark:bg-white/[0.03] rounded-2xl p-6"
          >
            <h2
              id="sources-heading"
              className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF] mb-2"
            >
              {copy.sections.sourcesHeading}
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mb-4 leading-relaxed">
              {copy.sections.sourcesNote}
            </p>
            <ol className="space-y-3 list-decimal pl-5 text-sm">
              {article.sources.map((src) => {
                const safeHref = isSafeExternalHttpUrl(src.url) ? src.url : undefined;
                return (
                  <li key={src.sourceId} className="leading-relaxed">
                    {safeHref ? (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#4263EB] dark:text-[#748FFC] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-semibold text-[#101827] dark:text-[#F5F4EF]">
                        {src.title}
                      </span>
                    )}
                    <div className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5 font-mono-tabular">
                      {src.publisher}
                      {src.publishedAt ? ` · ${src.publishedAt}` : ''} · {copy.sections.accessedLabel}:{' '}
                      {src.accessedAt}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Share Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 py-5 border-y border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#101827] dark:text-[#F5F4EF]">
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>{copy.sections.shareHeading}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{locale === 'bn' ? 'শেয়ার করুন' : 'Share'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#22A06B]" aria-hidden="true" />
                    <span>{copy.sections.copied}</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{copy.sections.copyLink}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Sidebar: TOC + Ad Slot */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="lg:sticky lg:top-24 space-y-8">
            {toc.length > 0 && (
              <nav
                aria-label={copy.sections.tableOfContents}
                className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]"
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-[#A5AAB4] mb-4">
                  {copy.sections.tableOfContents}
                </h2>
                <ul className="space-y-2.5 text-sm">
                  {toc.map((entry, idx) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="flex items-start gap-2.5 text-black/75 dark:text-white/80 hover:text-[#4263EB] dark:hover:text-[#748FFC] leading-snug"
                      >
                        <span className="font-mono-tabular text-xs text-black/45 dark:text-white/45 mt-0.5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span>{entry.text}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

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
          </div>
        </aside>
      </div>

      {/* Article Bottom Ad Slot */}
      <div className="mt-14">
        <AdSlotBanner
          placement="article_bottom"
          locale={locale}
          monetagAds={monetagAds}
          adSlots={adSlots}
          directBanners={directBanners}
          globalAdSettings={globalAdSettings}
          onNavigate={onNavigate}
        />
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16 space-y-6">
          <h2
            id="related-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#101827] dark:text-[#F5F4EF]"
          >
            {copy.sections.relatedHeading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((item) => (
              <ArticleCard
                key={item.articleId}
                article={item}
                category={categories.find((c) => c.id === item.categoryId)}
                author={authors.find((a) => a.id === item.authorId)}
                locale={locale}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <div className="mt-16">
        <NewsletterSection locale={locale} />
      </div>
    </article>
  );
}
