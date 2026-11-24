import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type {
  AdPlacement,
  AdSlotConfig,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
} from '../types/qorvia';
import {
  DEFAULT_GLOBAL_AD_SETTINGS,
  isValidAdSensePublisherId,
  resolvePlacementAd,
} from '../lib/adsStore';
import { UI_COPY } from '../lib/i18n';

interface AdSlotBannerProps {
  placement: AdPlacement;
  locale: Locale;
  monetagAds: MonetagAdEntry[];
  adSlots?: AdSlotConfig[];
  directBanners?: DirectBannerCampaign[];
  globalAdSettings?: GlobalAdSettings;
  onNavigate?: (path: string) => void;
  variant?: 'horizontal' | 'sidebar';
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function ensureAdSenseScriptLoaded(publisherId: string): void {
  if (typeof document === 'undefined' || !isValidAdSensePublisherId(publisherId)) {
    return;
  }
  const existing = document.querySelector(
    'script[data-qorvia-adsense="true"]'
  ) as HTMLScriptElement | null;
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    publisherId.trim()
  )}`;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-qorvia-adsense', 'true');
  document.head.appendChild(script);
}

export function AdSlotBanner({
  placement,
  locale,
  monetagAds,
  adSlots = [],
  directBanners = [],
  globalAdSettings = DEFAULT_GLOBAL_AD_SETTINGS,
  onNavigate,
  variant = 'horizontal',
}: AdSlotBannerProps) {
  const copy = UI_COPY[locale];

  const resolved = resolvePlacementAd({
    placement,
    locale,
    adSlots,
    directBanners,
    monetagAds,
    globalAdSettings,
  });

  const adsenseClientToLoad =
    resolved.mode === 'adsense'
      ? resolved.adsenseClient
      : globalAdSettings.adsEnabled &&
        globalAdSettings.adsenseAutoAds &&
        isValidAdSensePublisherId(globalAdSettings.adsensePublisherId)
      ? globalAdSettings.adsensePublisherId
      : '';

  useEffect(() => {
    if (!adsenseClientToLoad) return;
    ensureAdSenseScriptLoaded(adsenseClientToLoad);
    if (resolved.mode === 'adsense') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ignore AdSense push errors when blocked by ad-blockers or unverified domains
      }
    }
  }, [adsenseClientToLoad, resolved.mode]);

  if (resolved.mode === 'disabled') {
    return null;
  }

  return (
    <aside
      aria-label={copy.sections.advertisementLabel}
      data-ad-placement={placement}
      data-ad-mode={resolved.mode}
      className={`border border-black/10 dark:border-white/10 bg-[#F5F4EF]/70 dark:bg-white/[0.03] px-5 py-4 ${
        variant === 'sidebar' ? 'rounded-xl' : 'rounded-lg'
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-[11px] font-medium tracking-wider uppercase text-black/50 dark:text-white/50">
          {copy.sections.advertisementLabel}
        </span>
        {onNavigate && (
          <a
            href={`/${locale}/advertise`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(`/${locale}/advertise`);
            }}
            className="text-[11px] text-black/55 dark:text-white/55 hover:text-[#4263EB] dark:hover:text-[#4263EB] underline-offset-4 hover:underline whitespace-nowrap"
          >
            {copy.footer.links.advertise}
          </a>
        )}
      </div>

      {resolved.mode === 'direct_banner' && (
        <a
          href={resolved.campaign.destinationUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block group pt-2 border-t border-black/10 dark:border-white/10 space-y-2.5"
        >
          <div
            className={`overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#0B111E] ${
              variant === 'sidebar' ? 'aspect-[4/3]' : 'max-h-40 sm:max-h-44'
            }`}
          >
            <img
              src={resolved.campaign.imageUrl}
              alt={resolved.campaign.title}
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#101827] dark:text-[#F5F4EF] group-hover:text-[#4263EB] dark:group-hover:text-[#748FFC] line-clamp-1">
              {resolved.campaign.title}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-black/60 dark:text-[#A5AAB4] shrink-0">
              <span>{locale === 'bn' ? 'ভিজিট করুন' : 'Visit Sponsor'}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </span>
          </div>
        </a>
      )}

      {resolved.mode === 'adsense' && (
        <div className="pt-2 border-t border-black/10 dark:border-white/10">
          <ins
            className="adsbygoogle block w-full min-h-[90px]"
            style={{ display: 'block' }}
            data-ad-client={resolved.adsenseClient}
            data-ad-slot={resolved.adsenseSlot}
            data-ad-format={resolved.adsenseFormat}
            data-full-width-responsive="true"
          />
          <p className="text-[11px] text-black/45 dark:text-[#A5AAB4] mt-1 font-mono-tabular">
            Google AdSense · {resolved.slotName}
          </p>
        </div>
      )}

      {resolved.mode === 'monetag' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-t border-black/10 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-[#101827] dark:text-[#F5F4EF]">
              {resolved.entry.name}
            </p>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5 font-mono-tabular">
              Monetag · Zone #{resolved.entry.zoneId} · {resolved.entry.format.replace(/_/g, ' ')}
            </p>
          </div>
          {resolved.entry.format === 'direct_link' && resolved.entry.directLinkUrl ? (
            <a
              href={resolved.entry.directLinkUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
            >
              <span>Sponsored Link</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-xs text-[#22A06B] font-medium whitespace-nowrap">
              Active Placement
            </span>
          )}
        </div>
      )}

      {resolved.mode === 'unconfigured' && (
        <div className="py-2 border-t border-black/10 dark:border-white/10">
          <p className="text-xs text-black/55 dark:text-[#A5AAB4] leading-relaxed">
            {copy.sections.adSlotUnconfigured}
          </p>
        </div>
      )}
    </aside>
  );
}
