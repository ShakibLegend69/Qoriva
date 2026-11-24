import { ArrowUpRight } from 'lucide-react';
import type { Article, Author, Category, Locale } from '../types/qorvia';
import { buildArticlePath } from '../lib/routing';
import { formatLocalizedDate, UI_COPY } from '../lib/i18n';
import { EditorialImage } from './EditorialImage';

interface ArticleCardProps {
  article: Article;
  category?: Category;
  author?: Author;
  locale: Locale;
  variant?: 'lead' | 'standard' | 'compact';
  onNavigate: (path: string) => void;
}

export function ArticleCard({
  article,
  category,
  author,
  locale,
  variant = 'standard',
  onNavigate,
}: ArticleCardProps) {
  const copy = UI_COPY[locale];
  const href = buildArticlePath(locale, article.slug);
  const categoryName = category?.shortName[locale] ?? article.categoryId;
  const formattedDate = formatLocalizedDate(article.publishedAt, locale);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(href);
  };

  if (variant === 'compact') {
    return (
      <article className="group py-4 border-b border-black/10 dark:border-white/10 last:border-b-0">
        <div className="flex items-center gap-2 text-xs text-black/55 dark:text-[#A5AAB4] mb-1.5">
          <span className="font-medium text-[#4263EB] dark:text-[#748FFC]">{categoryName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {article.readingTimeMinutes} {copy.sections.minRead}
          </span>
        </div>
        <h3 className="text-base font-semibold leading-snug text-[#101827] dark:text-[#F5F4EF]">
          <a
            href={href}
            onClick={handleClick}
            className="hover:text-[#4263EB] dark:hover:text-[#748FFC] transition-colors inline-flex items-start gap-1.5"
          >
            <span>{article.title}</span>
            <ArrowUpRight
              className="w-4 h-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          </a>
        </h3>
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <article className="group grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border border-black/10 dark:border-white/10 bg-[#F5F4EF]/55 dark:bg-white/[0.03] rounded-2xl p-5 sm:p-7">
        <div className="lg:col-span-7 flex flex-col">
          <a href={href} onClick={handleClick} className="block h-full">
            <EditorialImage
              src={article.featuredImage.src}
              alt={article.featuredImage.alt}
              aspectClass="aspect-[16/10] lg:h-full"
              className="h-full [&>div]:rounded-xl"
              priority
            />
          </a>
        </div>
        <div className="lg:col-span-5 flex flex-col justify-between py-1">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-[#A5AAB4] mb-4">
              <span className="font-semibold text-[#4263EB] dark:text-[#748FFC]">
                {copy.hero.leadStoryLabel}
              </span>
              <span aria-hidden="true">/</span>
              <span>{categoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {article.readingTimeMinutes} {copy.sections.minRead}
              </span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold leading-tight text-[#101827] dark:text-[#F5F4EF] mb-4">
              <a
                href={href}
                onClick={handleClick}
                className="hover:text-[#4263EB] dark:hover:text-[#748FFC] transition-colors"
              >
                {article.title}
              </a>
            </h2>
            <p className="text-sm sm:text-base text-black/70 dark:text-white/75 leading-relaxed mb-6">
              {article.excerpt}
            </p>
          </div>
          <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
            <div className="text-xs text-black/60 dark:text-[#A5AAB4]">
              <span className="font-medium text-[#101827] dark:text-[#F5F4EF]">
                {author?.name[locale] ?? 'QORVIA Desk'}
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <time dateTime={article.publishedAt}>{formattedDate}</time>
            </div>
            <a
              href={href}
              onClick={handleClick}
              className="btn-transparent-black inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span>{copy.sections.readArticle}</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col justify-between border border-black/10 dark:border-white/10 bg-white dark:bg-[#11192B] rounded-xl p-5 transition-colors hover:border-black/25 dark:hover:border-white/25">
      <div>
        <a href={href} onClick={handleClick} className="block mb-4">
          <EditorialImage
            src={article.featuredImage.src}
            alt={article.featuredImage.alt}
            aspectClass="aspect-[4/3]"
            className="[&>div]:rounded-lg"
          />
        </a>
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/55 dark:text-[#A5AAB4] mb-2">
          <span className="font-semibold text-[#4263EB] dark:text-[#748FFC]">{categoryName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {article.readingTimeMinutes} {copy.sections.minRead}
          </span>
        </div>
        <h3 className="font-editorial text-lg sm:text-xl font-semibold leading-snug text-[#101827] dark:text-[#F5F4EF] mb-2.5">
          <a
            href={href}
            onClick={handleClick}
            className="hover:text-[#4263EB] dark:hover:text-[#748FFC] transition-colors"
          >
            {article.title}
          </a>
        </h3>
        <p className="text-sm text-black/65 dark:text-white/70 leading-relaxed line-clamp-3 mb-4">
          {article.excerpt}
        </p>
      </div>
      <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-black/60 dark:text-[#A5AAB4]">
        <span>{author?.name[locale] ?? 'QORVIA Desk'}</span>
        <span className="font-mono-tabular">
          {article.engagementScore.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US')}{' '}
          {copy.sections.viewsLabel}
        </span>
      </div>
    </article>
  );
}
