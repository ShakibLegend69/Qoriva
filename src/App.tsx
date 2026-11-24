import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  normalizePathname,
  parseRoute,
  resolveEquivalentLocalePath,
} from './lib/routing';
import { resolveSeoMetadata } from './lib/seo';
import { SEED_ARTICLES, SEED_AUTHORS, SEED_CATEGORIES } from './data/seedCatalog';
import {
  subscribeAdSlots,
  subscribeAllAdCampaigns,
  subscribeCategories,
  subscribeGlobalAdSettings,
  subscribePublishedArticles,
} from './lib/firestoreService';
import { DEFAULT_GLOBAL_AD_SETTINGS, mergeDefaultMonetagAds } from './lib/adsStore';
import type {
  AdSlotConfig,
  Article,
  Category,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
} from './types/qorvia';
import { UI_COPY } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { SearchOverlay } from './components/SearchOverlay';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { CollectionPage } from './pages/CollectionPage';
import { InstitutionalPage } from './pages/InstitutionalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const THEME_STORAGE_KEY = 'qorvia_theme_v1';

function getInitialLocation(): { pathname: string; search: string } {
  if (typeof window === 'undefined') {
    return { pathname: '/en/', search: '' };
  }
  const normalized = normalizePathname(window.location.pathname);
  if (window.location.pathname === '/' && normalized === '/en/') {
    window.history.replaceState(null, '', '/en/');
  }
  return { pathname: normalized, search: window.location.search };
}

function QorviaShell() {
  const { isAdminStaff } = useFirebase();
  const [locationState, setLocationState] = useState(getInitialLocation);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [articles, setArticles] = useState<Article[]>(SEED_ARTICLES);
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [monetagAds, setMonetagAds] = useState<MonetagAdEntry[]>([]);
  const [directBanners, setDirectBanners] = useState<DirectBannerCampaign[]>([]);
  const [adSlots, setAdSlots] = useState<AdSlotConfig[]>([]);
  const [globalAdSettings, setGlobalAdSettings] = useState<GlobalAdSettings>(
    DEFAULT_GLOBAL_AD_SETTINGS
  );
  const [liveScoreDeltas, setLiveScoreDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    fetch('/api/engagement/scores')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scores?: Record<string, number> } | null) => {
        if (active && data?.scores) {
          setLiveScoreDeltas(data.scores);
        }
      })
      .catch(() => {
        // Ignore network errors cleanly
      });
    return () => {
      active = false;
    };
  }, []);

  const articlesWithLiveEngagement = useMemo(
    () =>
      articles.map((art) => {
        const delta = liveScoreDeltas[art.articleId] || 0;
        return delta > 0 ? { ...art, engagementScore: art.engagementScore + delta } : art;
      }),
    [articles, liveScoreDeltas]
  );

  const effectiveMonetagAds = useMemo(
    () => mergeDefaultMonetagAds(monetagAds),
    [monetagAds]
  );

  const parsedRoute = useMemo(
    () => parseRoute(locationState.pathname),
    [locationState.pathname]
  );

  const activeLocale: Locale =
    parsedRoute.kind === 'admin' ? 'en' : parsedRoute.locale;

  // Subscribe to live published articles, active categories, and enabled ads from Cloud Firestore
  useEffect(() => {
    const unsubArticles = subscribePublishedArticles((items) => {
      setArticles(items);
    });
    const unsubCategories = subscribeCategories((cats) => {
      setCategories(cats);
    }, false);
    const unsubAds = subscribeAllAdCampaigns(({ monetagAds: mon, directBanners: banners }) => {
      setMonetagAds(mon);
      setDirectBanners(banners);
    }, false);
    const unsubSlots = subscribeAdSlots((slots) => {
      setAdSlots(slots);
    }, false);
    const unsubSettings = subscribeGlobalAdSettings((settings) => {
      setGlobalAdSettings(settings);
    });
    return () => {
      unsubArticles();
      unsubCategories();
      unsubAds();
      unsubSlots();
      unsubSettings();
    };
  }, []);

  const matchedArticle = useMemo(() => {
    if (parsedRoute.kind === 'article') {
      return articlesWithLiveEngagement.find(
        (a) =>
          a.locale === parsedRoute.locale &&
          a.slug === parsedRoute.slug &&
          a.status === 'published'
      );
    }
    return undefined;
  }, [parsedRoute, articlesWithLiveEngagement]);

  const equivalentOtherLocalePath = useMemo(() => {
    const otherLocale: Locale = activeLocale === 'en' ? 'bn' : 'en';
    return resolveEquivalentLocalePath(parsedRoute, otherLocale, articlesWithLiveEngagement);
  }, [parsedRoute, activeLocale, articlesWithLiveEngagement]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = activeLocale;

    const seo = resolveSeoMetadata({
      parsedRoute,
      matchedArticle,
      articles: articlesWithLiveEngagement,
      categories,
      authors: SEED_AUTHORS,
      origin: window.location.origin,
      isAdminStaff,
    });

    document.title = seo.title;

    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMetaTag('name', 'description', seo.description);
    setMetaTag('name', 'robots', seo.robots);
    setMetaTag('property', 'og:title', seo.title);
    setMetaTag('property', 'og:description', seo.description);
    setMetaTag('property', 'og:type', seo.ogType);
    setMetaTag('property', 'og:url', seo.canonicalUrl);
    setMetaTag('property', 'og:locale', seo.ogLocale);
    setMetaTag('property', 'og:image', seo.ogImage);
    setMetaTag('name', 'twitter:title', seo.title);
    setMetaTag('name', 'twitter:description', seo.description);
    setMetaTag('name', 'twitter:image', seo.ogImage);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', seo.canonicalUrl);

    document
      .querySelectorAll('link[data-qorvia-hreflang="true"]')
      .forEach((el) => el.remove());

    seo.hreflangs.forEach(({ hreflang, href }) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hreflang;
      link.href = href;
      link.setAttribute('data-qorvia-hreflang', 'true');
      document.head.appendChild(link);
    });

    document
      .querySelectorAll('script[data-qorvia-jsonld="true"]')
      .forEach((el) => el.remove());

    seo.jsonLdObjects.forEach((schemaObj) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-qorvia-jsonld', 'true');
      script.textContent = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    });
  }, [activeLocale, parsedRoute, matchedArticle, articlesWithLiveEngagement, categories, isAdminStaff]);

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: normalizePathname(window.location.pathname),
        search: window.location.search,
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((rawTarget: string) => {
    const [rawPath, rawSearch] = rawTarget.split('?');
    const pathname = normalizePathname(rawPath);
    const search = rawSearch ? `?${rawSearch}` : '';
    const fullUrl = `${pathname}${search}`;
    if (
      window.location.pathname !== pathname ||
      window.location.search !== search
    ) {
      window.history.pushState(null, '', fullUrl);
    }
    setLocationState({ pathname, search });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const searchQueryParam = useMemo(() => {
    const params = new URLSearchParams(locationState.search);
    return params.get('q') ?? '';
  }, [locationState.search]);

  const renderMainContent = () => {
    if (parsedRoute.kind === 'admin') {
      return <AdminDashboardPage onNavigate={navigate} />;
    }

    if (parsedRoute.kind === 'home') {
      return (
        <HomePage
          locale={parsedRoute.locale}
          articles={articlesWithLiveEngagement}
          categories={categories}
          authors={SEED_AUTHORS}
          monetagAds={effectiveMonetagAds}
          adSlots={adSlots}
          directBanners={directBanners}
          globalAdSettings={globalAdSettings}
          onNavigate={navigate}
        />
      );
    }

    if (parsedRoute.kind === 'category') {
      return (
        <CategoryPage
          locale={parsedRoute.locale}
          categorySlug={parsedRoute.categorySlug}
          subcategorySlug={parsedRoute.subcategorySlug}
          categories={categories}
          articles={articlesWithLiveEngagement}
          authors={SEED_AUTHORS}
          monetagAds={effectiveMonetagAds}
          adSlots={adSlots}
          directBanners={directBanners}
          globalAdSettings={globalAdSettings}
          onNavigate={navigate}
        />
      );
    }

    if (parsedRoute.kind === 'article') {
      if (!matchedArticle) {
        return (
          <CollectionPage
            mode="not_found"
            locale={parsedRoute.locale}
            articles={articlesWithLiveEngagement}
            categories={categories}
            authors={SEED_AUTHORS}
            onNavigate={navigate}
          />
        );
      }
      return (
        <ArticleDetailPage
          locale={parsedRoute.locale}
          article={matchedArticle}
          allArticles={articlesWithLiveEngagement}
          categories={categories}
          authors={SEED_AUTHORS}
          monetagAds={effectiveMonetagAds}
          adSlots={adSlots}
          directBanners={directBanners}
          globalAdSettings={globalAdSettings}
          onEngagementUpdated={(articleId, scoreDelta) => {
            setLiveScoreDeltas((prev) => ({
              ...prev,
              [articleId]: Math.max(prev[articleId] || 0, scoreDelta),
            }));
          }}
          onNavigate={navigate}
        />
      );
    }

    if (parsedRoute.kind === 'author') {
      return (
        <CollectionPage
          mode="author"
          locale={parsedRoute.locale}
          articles={articlesWithLiveEngagement}
          categories={categories}
          authors={SEED_AUTHORS}
          authorId={parsedRoute.authorId}
          onNavigate={navigate}
        />
      );
    }

    if (parsedRoute.kind === 'static') {
      const p = parsedRoute.page;
      if (
        p === 'latest' ||
        p === 'featured' ||
        p === 'trending' ||
        p === 'archive' ||
        p === 'search'
      ) {
        return (
          <CollectionPage
            mode={p}
            locale={parsedRoute.locale}
            articles={articlesWithLiveEngagement}
            categories={categories}
            authors={SEED_AUTHORS}
            initialQuery={searchQueryParam}
            onNavigate={navigate}
          />
        );
      }
      return (
        <InstitutionalPage
          page={p}
          locale={parsedRoute.locale}
          categories={categories}
          articles={articlesWithLiveEngagement}
          onNavigate={navigate}
        />
      );
    }

    return (
      <CollectionPage
        mode="not_found"
        locale={parsedRoute.locale}
        articles={articlesWithLiveEngagement}
        categories={categories}
        authors={SEED_AUTHORS}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#101827] dark:bg-[#0B111E] dark:text-[#F5F4EF] transition-colors duration-200">
      <SiteHeader
        locale={activeLocale}
        categories={categories}
        theme={theme}
        equivalentOtherLocalePath={equivalentOtherLocalePath}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onNavigate={navigate}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <main className="flex-1">{renderMainContent()}</main>

      <SiteFooter
        locale={activeLocale}
        categories={categories}
        onNavigate={navigate}
      />

      <SearchOverlay
        isOpen={searchOpen}
        locale={activeLocale}
        articles={articlesWithLiveEngagement}
        categories={categories}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <QorviaShell />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
