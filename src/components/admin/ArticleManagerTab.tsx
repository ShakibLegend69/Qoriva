import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Globe,
  Languages,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Article,
  ArticleStatus,
  Author,
  Category,
  CategorySlug,
  ContentBlock,
  Locale,
  SourceReference,
} from '../../types/qorvia';
import {
  estimateReadingTimeMinutes,
  slugifyTitle,
  validateArticleDraftInput,
} from '../../lib/editorialValidation';
import {
  type MediaAssetRecord,
  deleteArticleInFirestore,
  saveArticleInFirestore,
  updateArticleStatusInFirestore,
} from '../../lib/firestoreService';

interface ArticleManagerTabProps {
  actorUid: string;
  actorEmail?: string | null;
  articles: Article[];
  categories: Category[];
  authors: Author[];
  mediaAssets: MediaAssetRecord[];
  hasPublishPermission: boolean;
  hasRoleAdminPermission: boolean;
  editingArticleRequest: Article | null;
  translationSeedRequest: { source: Article; targetLocale: Locale } | null;
  onClearExternalRequests: () => void;
}

const BUILTIN_EDITORIAL_IMAGES = [
  {
    label: 'AI Architecture Library',
    src: '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
  },
  {
    label: 'Education & Study Method',
    src: '/src/assets/images/article_education_study_1795449988371.jpg',
  },
  {
    label: 'Digital Skills Engineering',
    src: '/src/assets/images/article_digital_skills_1795449988507.jpg',
  },
  {
    label: 'Science & General Knowledge',
    src: '/src/assets/images/article_science_knowledge_1795449988615.jpg',
  },
];

interface DraftFormState {
  articleId: string;
  isNew: boolean;
  translationGroupId: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: CategorySlug;
  subcategorySlug: string;
  tagsInput: string;
  authorId: string;
  status: ArticleStatus;
  scheduledAt: string;
  isFeatured: boolean;
  isRecommended: boolean;
  featuredImageSrc: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  contentBlocks: ContentBlock[];
  sources: SourceReference[];
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
  publishedAt: string;
  engagementScore: number;
}

function buildEmptyDraft(
  categories: Category[],
  authors: Author[],
  overrides?: Partial<DraftFormState>
): DraftFormState {
  const defaultCategory = categories[0]?.id ?? 'technology';
  const defaultSub = categories[0]?.subcategories[0]?.slug ?? '';
  const defaultAuthor = authors[0]?.id ?? 'ananya-rahman';
  const locale: Locale = overrides?.locale ?? 'en';
  const slug = overrides?.slug ?? '';
  const ts = Date.now().toString(36);

  return {
    articleId: overrides?.articleId ?? `art-${locale}-${ts}`,
    isNew: overrides?.isNew ?? true,
    translationGroupId: overrides?.translationGroupId ?? `grp-${ts}`,
    locale,
    title: overrides?.title ?? '',
    slug,
    excerpt: overrides?.excerpt ?? '',
    categoryId: overrides?.categoryId ?? defaultCategory,
    subcategorySlug: overrides?.subcategorySlug ?? defaultSub,
    tagsInput: overrides?.tagsInput ?? '',
    authorId: overrides?.authorId ?? defaultAuthor,
    status: overrides?.status ?? 'draft',
    scheduledAt: overrides?.scheduledAt ?? '',
    isFeatured: overrides?.isFeatured ?? false,
    isRecommended: overrides?.isRecommended ?? false,
    featuredImageSrc:
      overrides?.featuredImageSrc ?? BUILTIN_EDITORIAL_IMAGES[0].src,
    featuredImageAlt: overrides?.featuredImageAlt ?? '',
    featuredImageCaption: overrides?.featuredImageCaption ?? '',
    contentBlocks: overrides?.contentBlocks ?? [
      {
        id: `blk-${ts}`,
        type: 'paragraph',
        text: '',
        dropCap: true,
      },
    ],
    sources: overrides?.sources ?? [],
    metaTitle: overrides?.metaTitle ?? '',
    metaDescription: overrides?.metaDescription ?? '',
    canonicalPath:
      overrides?.canonicalPath ?? (slug ? `/${locale}/article/${slug}` : ''),
    publishedAt: overrides?.publishedAt ?? new Date().toISOString(),
    engagementScore: overrides?.engagementScore ?? 0,
  };
}

function articleToFormState(article: Article): DraftFormState {
  return {
    articleId: article.articleId,
    isNew: false,
    translationGroupId: article.translationGroupId,
    locale: article.locale,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    categoryId: article.categoryId,
    subcategorySlug: article.subcategorySlug,
    tagsInput: article.tags.join(', '),
    authorId: article.authorId,
    status: article.status,
    scheduledAt: article.scheduledAt ?? '',
    isFeatured: article.isFeatured,
    isRecommended: article.isRecommended,
    featuredImageSrc: article.featuredImage.src,
    featuredImageAlt: article.featuredImage.alt,
    featuredImageCaption: article.featuredImage.caption,
    contentBlocks:
      article.contentBlocks.length > 0
        ? article.contentBlocks
        : [{ id: `blk-${Date.now()}`, type: 'paragraph', text: '', dropCap: true }],
    sources: article.sources ?? [],
    metaTitle: article.seo.metaTitle,
    metaDescription: article.seo.metaDescription,
    canonicalPath: article.seo.canonicalPath,
    publishedAt: article.publishedAt,
    engagementScore: article.engagementScore,
  };
}

export function ArticleManagerTab({
  actorUid,
  actorEmail,
  articles,
  categories,
  authors,
  mediaAssets,
  hasPublishPermission,
  hasRoleAdminPermission,
  editingArticleRequest,
  translationSeedRequest,
  onClearExternalRequests,
}: ArticleManagerTabProps) {
  const [filterLocale, setFilterLocale] = useState<'all' | Locale>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ArticleStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editorForm, setEditorForm] = useState<DraftFormState | null>(() => {
    if (editingArticleRequest) return articleToFormState(editingArticleRequest);
    if (translationSeedRequest) {
      const { source, targetLocale } = translationSeedRequest;
      return buildEmptyDraft(categories, authors, {
        locale: targetLocale,
        translationGroupId: source.translationGroupId,
        categoryId: source.categoryId,
        subcategorySlug: source.subcategorySlug,
        tagsInput: source.tags.join(', '),
        featuredImageSrc: source.featuredImage.src,
        featuredImageAlt: source.featuredImage.alt,
        featuredImageCaption: source.featuredImage.caption,
        authorId: source.authorId,
        sources: source.sources,
      });
    }
    return null;
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === editorForm?.categoryId) ?? categories[0],
    [categories, editorForm?.categoryId]
  );

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((a) => {
      if (filterLocale !== 'all' && a.locale !== filterLocale) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.slug.toLowerCase().includes(q) &&
        !a.translationGroupId.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [articles, filterLocale, filterStatus, searchQuery]);

  // Helper to check if paired translation exists
  const groupMap = useMemo(() => {
    const map = new Map<string, { en?: Article; bn?: Article }>();
    for (const art of articles) {
      const pair = map.get(art.translationGroupId) ?? {};
      if (art.locale === 'en') pair.en = art;
      if (art.locale === 'bn') pair.bn = art;
      map.set(art.translationGroupId, pair);
    }
    return map;
  }, [articles]);

  const startNewArticle = () => {
    setFeedback(null);
    onClearExternalRequests();
    setEditorForm(buildEmptyDraft(categories, authors));
  };

  const startEditing = (art: Article) => {
    setFeedback(null);
    onClearExternalRequests();
    setEditorForm(articleToFormState(art));
  };

  const startTranslationPair = (source: Article, targetLocale: Locale) => {
    setFeedback(null);
    onClearExternalRequests();
    setEditorForm(
      buildEmptyDraft(categories, authors, {
        locale: targetLocale,
        translationGroupId: source.translationGroupId,
        categoryId: source.categoryId,
        subcategorySlug: source.subcategorySlug,
        tagsInput: source.tags.join(', '),
        featuredImageSrc: source.featuredImage.src,
        featuredImageAlt: source.featuredImage.alt,
        featuredImageCaption: source.featuredImage.caption,
        authorId: source.authorId,
        sources: source.sources,
      })
    );
  };

  const updateBlock = (index: number, nextBlock: ContentBlock) => {
    if (!editorForm) return;
    const copy = [...editorForm.contentBlocks];
    copy[index] = nextBlock;
    setEditorForm({ ...editorForm, contentBlocks: copy });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    if (!editorForm) return;
    const target = index + dir;
    if (target < 0 || target >= editorForm.contentBlocks.length) return;
    const copy = [...editorForm.contentBlocks];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setEditorForm({ ...editorForm, contentBlocks: copy });
  };

  const removeBlock = (index: number) => {
    if (!editorForm || editorForm.contentBlocks.length <= 1) return;
    setEditorForm({
      ...editorForm,
      contentBlocks: editorForm.contentBlocks.filter((_, i) => i !== index),
    });
  };

  const addBlock = (type: ContentBlock['type']) => {
    if (!editorForm) return;
    const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let block: ContentBlock;
    if (type === 'heading') {
      block = { id, type: 'heading', level: 2, text: '' };
    } else if (type === 'quote') {
      block = { id, type: 'quote', text: '', attribution: '' };
    } else if (type === 'list') {
      block = { id, type: 'list', ordered: false, items: [''] };
    } else if (type === 'callout') {
      block = { id, type: 'callout', title: 'Verification Note', text: '', tone: 'verification' };
    } else if (type === 'image') {
      block = {
        id,
        type: 'image',
        src: mediaAssets[0]?.url || BUILTIN_EDITORIAL_IMAGES[0].src,
        alt: '',
        caption: '',
      };
    } else {
      block = { id, type: 'paragraph', text: '', dropCap: false };
    }
    setEditorForm({
      ...editorForm,
      contentBlocks: [...editorForm.contentBlocks, block],
    });
  };

  const addSource = () => {
    if (!editorForm) return;
    setEditorForm({
      ...editorForm,
      sources: [
        ...editorForm.sources,
        {
          sourceId: `src-${Date.now().toString(36)}`,
          title: '',
          publisher: '',
          url: 'https://',
          publishedAt: null,
          accessedAt: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  };

  const handleSave = async (targetStatus: ArticleStatus) => {
    if (!editorForm) return;
    setFeedback(null);

    if (
      (targetStatus === 'published' || targetStatus === 'scheduled') &&
      !hasPublishPermission
    ) {
      setFeedback({
        type: 'error',
        message: 'Only reviewers or superAdmin can publish or schedule articles.',
      });
      return;
    }

    const tags = editorForm.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 15);

    const effectiveSlug =
      editorForm.slug.trim() ||
      slugifyTitle(editorForm.title, `${editorForm.locale}-article`);

    const check = validateArticleDraftInput({
      title: editorForm.title,
      slug: effectiveSlug,
      excerpt: editorForm.excerpt,
      tags,
      contentBlocks: editorForm.contentBlocks,
      scheduledAt: editorForm.scheduledAt,
      status: targetStatus,
    });

    if (!check.valid) {
      setFeedback({ type: 'error', message: check.error || 'Invalid article fields.' });
      return;
    }

    const cleanSources = editorForm.sources.filter(
      (s) => s.title.trim() && s.publisher.trim() && s.url.trim()
    );

    const readingTimeMinutes = estimateReadingTimeMinutes(editorForm.contentBlocks);
    const canonicalPath =
      editorForm.canonicalPath.trim() || `/${editorForm.locale}/article/${effectiveSlug}`;

    const articlePayload: Article = {
      articleId: editorForm.articleId,
      translationGroupId: editorForm.translationGroupId.trim() || `grp-${Date.now().toString(36)}`,
      locale: editorForm.locale,
      title: editorForm.title.trim(),
      slug: effectiveSlug,
      excerpt: editorForm.excerpt.trim(),
      contentBlocks: editorForm.contentBlocks,
      categoryId: editorForm.categoryId,
      subcategorySlug: editorForm.subcategorySlug || (activeCategory?.subcategories[0]?.slug ?? ''),
      tags,
      featuredImage: {
        src: editorForm.featuredImageSrc.trim() || BUILTIN_EDITORIAL_IMAGES[0].src,
        alt: editorForm.featuredImageAlt.trim() || editorForm.title.trim(),
        caption: editorForm.featuredImageCaption.trim(),
      },
      authorId: editorForm.authorId,
      status: targetStatus,
      scheduledAt: targetStatus === 'scheduled' ? editorForm.scheduledAt.trim() : undefined,
      isFeatured: editorForm.isFeatured,
      isRecommended: editorForm.isRecommended,
      engagementScore: editorForm.engagementScore,
      readingTimeMinutes,
      sources: cleanSources,
      seo: {
        metaTitle: editorForm.metaTitle.trim() || `${editorForm.title.trim()} | QORVIA`,
        metaDescription: editorForm.metaDescription.trim() || editorForm.excerpt.trim(),
        canonicalPath,
      },
      publishedAt:
        targetStatus === 'published'
          ? editorForm.isNew
            ? new Date().toISOString()
            : editorForm.publishedAt || new Date().toISOString()
          : editorForm.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveArticleInFirestore({
        actorUid,
        actorEmail,
        article: articlePayload,
        isNew: editorForm.isNew,
        canPublishOrFeature: hasPublishPermission,
      });
      setFeedback({
        type: 'success',
        message: `Article "${articlePayload.title}" saved as ${targetStatus}.`,
      });
      setEditorForm({
        ...editorForm,
        isNew: false,
        slug: effectiveSlug,
        status: targetStatus,
        canonicalPath,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save article.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (articleId: string, nextStatus: ArticleStatus) => {
    setFeedback(null);
    try {
      await updateArticleStatusInFirestore({
        actorUid,
        actorEmail,
        articleId,
        nextStatus,
      });
      setFeedback({
        type: 'success',
        message: `Updated article status to ${nextStatus}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update status.',
      });
    }
  };

  const handleDelete = async (articleId: string) => {
    setFeedback(null);
    try {
      await deleteArticleInFirestore({
        actorUid,
        actorEmail,
        articleId,
      });
      setConfirmDeleteId(null);
      setFeedback({ type: 'success', message: 'Article deleted from Cloud Firestore.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete article.',
      });
    }
  };

  if (editorForm) {
    const readingTime = estimateReadingTimeMinutes(editorForm.contentBlocks);
    return (
      <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
              {editorForm.isNew ? 'New Editorial Draft' : `Editing ${editorForm.articleId}`} · Est. {readingTime} min read
            </p>
            <h2 className="font-editorial text-2xl font-bold text-[#101827] dark:text-[#F5F4EF] mt-0.5">
              {editorForm.title.trim() || 'Untitled Bilingual Article'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditorForm(null);
              onClearExternalRequests();
            }}
            className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer self-start"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Back to Articles List</span>
          </button>
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-3 text-xs font-medium border ${
              feedback.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Core Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="art-locale" className="block text-xs font-semibold mb-1.5">
              Language Edition
            </label>
            <select
              id="art-locale"
              value={editorForm.locale}
              disabled={!editorForm.isNew}
              onChange={(e) => {
                const nextLocale = e.target.value as Locale;
                setEditorForm({
                  ...editorForm,
                  locale: nextLocale,
                  canonicalPath: editorForm.slug ? `/${nextLocale}/article/${editorForm.slug}` : '',
                });
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm disabled:opacity-60"
            >
              <option value="en">English (/en/)</option>
              <option value="bn">Bengali Unicode (/bn/)</option>
            </select>
          </div>
          <div>
            <label htmlFor="art-group-id" className="block text-xs font-semibold mb-1.5">
              Bilingual Translation Group ID
            </label>
            <input
              id="art-group-id"
              type="text"
              value={editorForm.translationGroupId}
              disabled={!editorForm.isNew}
              onChange={(e) =>
                setEditorForm({ ...editorForm, translationGroupId: e.target.value })
              }
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm font-mono-tabular disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="art-author" className="block text-xs font-semibold mb-1.5">
              Author Profile
            </label>
            <select
              id="art-author"
              value={editorForm.authorId}
              onChange={(e) => setEditorForm({ ...editorForm, authorId: e.target.value })}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            >
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name[editorForm.locale]} ({a.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label htmlFor="art-title" className="block text-xs font-semibold mb-1.5">
              Headline ({editorForm.locale === 'bn' ? 'Bengali Unicode' : 'English'})
            </label>
            <input
              id="art-title"
              type="text"
              value={editorForm.title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                const autoSlug = editorForm.isNew
                  ? slugifyTitle(nextTitle, `${editorForm.locale}-article`)
                  : editorForm.slug;
                setEditorForm({
                  ...editorForm,
                  title: nextTitle,
                  slug: autoSlug,
                  canonicalPath: `/${editorForm.locale}/article/${autoSlug}`,
                });
              }}
              placeholder={
                editorForm.locale === 'bn'
                  ? 'বাংলায় স্পষ্ট ও তথ্যসমৃদ্ধ শিরোনাম লিখুন...'
                  : 'Write a clear, factual editorial headline...'
              }
              className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            />
          </div>
          <div className="md:col-span-5">
            <label htmlFor="art-slug" className="block text-xs font-semibold mb-1.5">
              URL Slug (ASCII lowercase & hyphens)
            </label>
            <div className="flex gap-2">
              <input
                id="art-slug"
                type="text"
                value={editorForm.slug}
                onChange={(e) =>
                  setEditorForm({
                    ...editorForm,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    canonicalPath: `/${editorForm.locale}/article/${e.target.value}`,
                  })
                }
                placeholder="url-friendly-slug"
                className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm font-mono-tabular"
              />
              <button
                type="button"
                onClick={() => {
                  const s = slugifyTitle(editorForm.title, `${editorForm.locale}-article`);
                  setEditorForm({
                    ...editorForm,
                    slug: s,
                    canonicalPath: `/${editorForm.locale}/article/${s}`,
                  });
                }}
                className="btn-transparent-black px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Auto
              </button>
            </div>
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label htmlFor="art-excerpt" className="block text-xs font-semibold mb-1.5">
            Editorial Excerpt / Standfirst (10–600 chars)
          </label>
          <textarea
            id="art-excerpt"
            rows={2}
            value={editorForm.excerpt}
            onChange={(e) => setEditorForm({ ...editorForm, excerpt: e.target.value })}
            placeholder="Concise summary of the core insight and reader takeaway..."
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
          />
        </div>

        {/* Category, Subcategory, Tags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="art-cat" className="block text-xs font-semibold mb-1.5">
              Primary Category
            </label>
            <select
              id="art-cat"
              value={editorForm.categoryId}
              onChange={(e) => {
                const catId = e.target.value as CategorySlug;
                const matchedCat = categories.find((c) => c.id === catId);
                setEditorForm({
                  ...editorForm,
                  categoryId: catId,
                  subcategorySlug: matchedCat?.subcategories[0]?.slug ?? '',
                });
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[editorForm.locale]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="art-subcat" className="block text-xs font-semibold mb-1.5">
              Subcategory
            </label>
            <select
              id="art-subcat"
              value={editorForm.subcategorySlug}
              onChange={(e) =>
                setEditorForm({ ...editorForm, subcategorySlug: e.target.value })
              }
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            >
              {(activeCategory?.subcategories ?? []).map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name[editorForm.locale]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="art-tags" className="block text-xs font-semibold mb-1.5">
              Tags (comma-separated, max 15)
            </label>
            <input
              id="art-tags"
              type="text"
              value={editorForm.tagsInput}
              onChange={(e) => setEditorForm({ ...editorForm, tagsInput: e.target.value })}
              placeholder="AI Systems, Web Performance, Verification"
              className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            />
          </div>
        </div>

        {/* Featured Image */}
        <div className="border border-black/10 dark:border-white/10 rounded-xl p-4 bg-[#F5F4EF]/50 dark:bg-white/[0.02] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-[#A5AAB4]">
              Featured Image
            </h3>
            <select
              aria-label="Choose from Media Library or built-in images"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const foundMedia = mediaAssets.find((m) => m.url === e.target.value);
                setEditorForm({
                  ...editorForm,
                  featuredImageSrc: e.target.value,
                  featuredImageAlt: foundMedia?.alt || editorForm.featuredImageAlt,
                });
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
            >
              <option value="">Select from Library...</option>
              {mediaAssets.map((m) => (
                <option key={m.mediaId} value={m.url}>
                  Storage: {m.title || m.alt}
                </option>
              ))}
              {BUILTIN_EDITORIAL_IMAGES.map((img) => (
                <option key={img.src} value={img.src}>
                  Editorial: {img.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="art-img-src" className="block text-xs font-semibold mb-1">
                Image URL
              </label>
              <input
                id="art-img-src"
                type="text"
                value={editorForm.featuredImageSrc}
                onChange={(e) =>
                  setEditorForm({ ...editorForm, featuredImageSrc: e.target.value })
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="art-img-alt" className="block text-xs font-semibold mb-1">
                Alt Text (Accessibility & SEO)
              </label>
              <input
                id="art-img-alt"
                type="text"
                value={editorForm.featuredImageAlt}
                onChange={(e) =>
                  setEditorForm({ ...editorForm, featuredImageAlt: e.target.value })
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
            </div>
            <div>
              <label htmlFor="art-img-cap" className="block text-xs font-semibold mb-1">
                Editorial Caption
              </label>
              <input
                id="art-img-cap"
                type="text"
                value={editorForm.featuredImageCaption}
                onChange={(e) =>
                  setEditorForm({ ...editorForm, featuredImageCaption: e.target.value })
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Rich Content Blocks Editor */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-[#A5AAB4]">
              Structured Content Blocks ({editorForm.contentBlocks.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(['heading', 'paragraph', 'quote', 'list', 'callout', 'image'] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="btn-transparent-black px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer capitalize"
                  >
                    + {type}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            {editorForm.contentBlocks.map((block, idx) => (
              <div
                key={block.id}
                className="border border-black/10 dark:border-white/10 rounded-xl p-4 bg-[#F5F4EF]/40 dark:bg-white/[0.02] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-tabular font-semibold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
                    Block #{idx + 1} · {block.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move block ${idx + 1} up`}
                      onClick={() => moveBlock(idx, -1)}
                      disabled={idx === 0}
                      className="btn-transparent-black p-1 rounded disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move block ${idx + 1} down`}
                      onClick={() => moveBlock(idx, 1)}
                      disabled={idx === editorForm.contentBlocks.length - 1}
                      className="btn-transparent-black p-1 rounded disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove block ${idx + 1}`}
                      onClick={() => removeBlock(idx)}
                      disabled={editorForm.contentBlocks.length <= 1}
                      className="btn-transparent-black p-1 rounded disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {block.type === 'heading' && (
                  <div className="flex gap-2">
                    <select
                      aria-label={`Heading level for block ${idx + 1}`}
                      value={block.level}
                      onChange={(e) =>
                        updateBlock(idx, { ...block, level: Number(e.target.value) as 2 | 3 })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                    >
                      <option value={2}>H2 Section</option>
                      <option value={3}>H3 Subsection</option>
                    </select>
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlock(idx, { ...block, text: e.target.value })}
                      placeholder="Section heading..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                  </div>
                )}

                {block.type === 'paragraph' && (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={block.text}
                      onChange={(e) => updateBlock(idx, { ...block, text: e.target.value })}
                      placeholder="Write factual editorial paragraph..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                    <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(block.dropCap)}
                        onChange={(e) =>
                          updateBlock(idx, { ...block, dropCap: e.target.checked })
                        }
                      />
                      <span>Enable editorial drop-cap styling</span>
                    </label>
                  </div>
                )}

                {block.type === 'quote' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlock(idx, { ...block, text: e.target.value })}
                      placeholder="Pull quote text..."
                      className="md:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                    <input
                      type="text"
                      value={block.attribution ?? ''}
                      onChange={(e) =>
                        updateBlock(idx, { ...block, attribution: e.target.value })
                      }
                      placeholder="Attribution..."
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                  </div>
                )}

                {block.type === 'list' && (
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={block.ordered}
                        onChange={(e) =>
                          updateBlock(idx, { ...block, ordered: e.target.checked })
                        }
                      />
                      <span>Numbered ordered list</span>
                    </label>
                    <textarea
                      rows={3}
                      value={block.items.join('\n')}
                      onChange={(e) =>
                        updateBlock(idx, {
                          ...block,
                          items: e.target.value.split('\n'),
                        })
                      }
                      placeholder="One list item per line..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                  </div>
                )}

                {block.type === 'callout' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => updateBlock(idx, { ...block, title: e.target.value })}
                      placeholder="Callout title..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                    <textarea
                      rows={2}
                      value={block.text}
                      onChange={(e) => updateBlock(idx, { ...block, text: e.target.value })}
                      placeholder="Callout body..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                    />
                  </div>
                )}

                {block.type === 'image' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={block.src}
                      onChange={(e) => updateBlock(idx, { ...block, src: e.target.value })}
                      placeholder="Image URL..."
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                    />
                    <input
                      type="text"
                      value={block.alt}
                      onChange={(e) => updateBlock(idx, { ...block, alt: e.target.value })}
                      placeholder="Alt text..."
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                    />
                    <input
                      type="text"
                      value={block.caption}
                      onChange={(e) => updateBlock(idx, { ...block, caption: e.target.value })}
                      placeholder="Caption..."
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cited Sources */}
        <div className="space-y-3 border-t border-black/10 dark:border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-[#A5AAB4]">
              Primary Source References ({editorForm.sources.length})
            </h3>
            <button
              type="button"
              onClick={addSource}
              className="btn-transparent-black inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Source Citation</span>
            </button>
          </div>
          {editorForm.sources.map((src, sIdx) => (
            <div key={src.sourceId} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={src.title}
                onChange={(e) => {
                  const next = [...editorForm.sources];
                  next[sIdx] = { ...src, title: e.target.value };
                  setEditorForm({ ...editorForm, sources: next });
                }}
                placeholder="Document title"
                className="md:col-span-4 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
              <input
                type="text"
                value={src.publisher}
                onChange={(e) => {
                  const next = [...editorForm.sources];
                  next[sIdx] = { ...src, publisher: e.target.value };
                  setEditorForm({ ...editorForm, sources: next });
                }}
                placeholder="Publisher"
                className="md:col-span-3 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
              <input
                type="url"
                value={src.url}
                onChange={(e) => {
                  const next = [...editorForm.sources];
                  next[sIdx] = { ...src, url: e.target.value };
                  setEditorForm({ ...editorForm, sources: next });
                }}
                placeholder="https://..."
                className="md:col-span-4 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
              />
              <button
                type="button"
                aria-label={`Remove source ${sIdx + 1}`}
                onClick={() =>
                  setEditorForm({
                    ...editorForm,
                    sources: editorForm.sources.filter((_, i) => i !== sIdx),
                  })
                }
                className="btn-transparent-black p-1.5 rounded-lg cursor-pointer justify-self-end"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {/* SEO & Scheduling Settings */}
        <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-[#A5AAB4]">
            SEO Metadata, Flags & Scheduling
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="art-seo-title" className="block text-xs font-semibold mb-1.5">
                SEO Meta Title
              </label>
              <input
                id="art-seo-title"
                type="text"
                value={editorForm.metaTitle}
                onChange={(e) => setEditorForm({ ...editorForm, metaTitle: e.target.value })}
                placeholder={`${editorForm.title || 'Article Title'} | QORVIA`}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
            </div>
            <div>
              <label htmlFor="art-schedule" className="block text-xs font-semibold mb-1.5">
                Scheduled Publication Time (for Scheduled status)
              </label>
              <input
                id="art-schedule"
                type="datetime-local"
                value={editorForm.scheduledAt}
                onChange={(e) => setEditorForm({ ...editorForm, scheduledAt: e.target.value })}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label htmlFor="art-seo-desc" className="block text-xs font-semibold mb-1.5">
              SEO Meta Description
            </label>
            <textarea
              id="art-seo-desc"
              rows={2}
              value={editorForm.metaDescription}
              onChange={(e) =>
                setEditorForm({ ...editorForm, metaDescription: e.target.value })
              }
              placeholder="Search snippet description..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
            />
          </div>

          {hasPublishPermission && (
            <div className="flex flex-wrap gap-6 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editorForm.isFeatured}
                  onChange={(e) =>
                    setEditorForm({ ...editorForm, isFeatured: e.target.checked })
                  }
                />
                <span>Feature in Homepage Hero / Featured Section</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editorForm.isRecommended}
                  onChange={(e) =>
                    setEditorForm({ ...editorForm, isRecommended: e.target.checked })
                  }
                />
                <span>Include in Recommended Reading</span>
              </label>
            </div>
          )}
        </div>

        {/* Save Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/10 dark:border-white/10 pt-5">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="btn-transparent-black px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('pending_review')}
            className="btn-transparent-black px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Submit for Review
          </button>
          {hasPublishPermission && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('scheduled')}
                className="btn-transparent-black px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Schedule Publication
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('published')}
                className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Publish Article'}</span>
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
            Editorial Article Manager ({articles.length})
          </h2>
          <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5">
            Create, edit, pair EN/BN editions, schedule publication, or unpublish articles in Cloud Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewArticle}
          className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Article</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search
            className="w-4 h-4 text-black/45 dark:text-[#A5AAB4] absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search articles by title, slug, or group ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline, slug, or translationGroupId..."
            className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
          />
        </div>
        <div className="sm:col-span-3">
          <select
            aria-label="Filter by language"
            value={filterLocale}
            onChange={(e) => setFilterLocale(e.target.value as 'all' | Locale)}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
          >
            <option value="all">All Languages</option>
            <option value="en">English (/en/)</option>
            <option value="bn">Bengali (/bn/)</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <select
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | ArticleStatus)}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="pending_review">Pending Review</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            feedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {filteredArticles.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-10 text-center">
          No articles match your current filter. Click “New Article” or “Sync Seed Catalog to Firestore”.
        </p>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {filteredArticles.map((art) => {
            const pair = groupMap.get(art.translationGroupId);
            const missingLocale: Locale | null =
              art.locale === 'en' && !pair?.bn
                ? 'bn'
                : art.locale === 'bn' && !pair?.en
                ? 'en'
                : null;

            return (
              <div
                key={art.articleId}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                    <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-semibold uppercase">
                      {art.locale}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        art.status === 'published'
                          ? 'bg-[#22A06B]/15 text-[#22A06B]'
                          : art.status === 'pending_review'
                          ? 'bg-[#4263EB]/15 text-[#4263EB] dark:text-[#748FFC]'
                          : 'bg-black/5 dark:bg-white/10 text-black/70 dark:text-[#A5AAB4]'
                      }`}
                    >
                      {art.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-black/50 dark:text-[#A5AAB4]">
                      {art.categoryId} · {art.readingTimeMinutes}m · Group: {art.translationGroupId}
                    </span>
                  </div>
                  <h3
                    className={`font-semibold text-base text-[#101827] dark:text-[#F5F4EF] ${
                      art.locale === 'bn' ? 'font-bn' : ''
                    }`}
                  >
                    {art.title}
                  </h3>
                  <p className="text-xs text-black/60 dark:text-[#A5AAB4] line-clamp-1">
                    /{art.locale}/article/{art.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {missingLocale && (
                    <button
                      type="button"
                      onClick={() => startTranslationPair(art, missingLocale)}
                      className="btn-transparent-black inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Pair {missingLocale.toUpperCase()}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit "${art.title}"`}
                    onClick={() => startEditing(art)}
                    className="btn-transparent-black inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>

                  {hasPublishPermission && art.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(art.articleId, 'draft')}
                      className="btn-transparent-black inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unpublish</span>
                    </button>
                  )}

                  {hasPublishPermission && art.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(art.articleId, 'published')}
                      className="btn-transparent-black-solid inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Publish</span>
                    </button>
                  )}

                  {hasRoleAdminPermission && (
                    confirmDeleteId === art.articleId ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(art.articleId)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn-transparent-black px-2 py-1.5 rounded-lg text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete "${art.title}"`}
                        onClick={() => setConfirmDeleteId(art.articleId)}
                        className="btn-transparent-black p-1.5 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
