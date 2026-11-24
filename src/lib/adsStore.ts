import type {
  AdPlacement,
  AdSenseFormat,
  AdSlotConfig,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
  MonetagFormat,
} from '../types/qorvia';

export interface MonetagValidationResult {
  valid: boolean;
  error?: string;
}

export const ALL_AD_PLACEMENTS: Array<{
  placement: AdPlacement;
  label: string;
  description: string;
  recommendedSize: string;
}> = [
  {
    placement: 'header',
    label: 'Header Leaderboard',
    description: 'Top banner above the editorial fold on English and Bengali homepages.',
    recommendedSize: '970×90 or 728×90 responsive',
  },
  {
    placement: 'homepage_content',
    label: 'Homepage Mid-Page',
    description: 'Between Latest Stories and Editorial Category sections.',
    recommendedSize: '970×250 or responsive fluid',
  },
  {
    placement: 'article_top',
    label: 'Article Top',
    description: 'Directly below the article headline & author byline.',
    recommendedSize: '728×90 responsive',
  },
  {
    placement: 'in_article',
    label: 'In-Article Midpoint',
    description: 'Injected smoothly at the midpoint of long-form article blocks.',
    recommendedSize: 'Fluid in-article or 336×280',
  },
  {
    placement: 'sidebar',
    label: 'Category & Article Sidebar',
    description: 'Sticky right-rail unit next to Table of Contents or Category feeds.',
    recommendedSize: '300×250 or 300×600',
  },
  {
    placement: 'article_bottom',
    label: 'Article Bottom',
    description: 'End-of-article sponsor slot above Related Articles.',
    recommendedSize: '728×90 or native rectangle',
  },
];

export const DEFAULT_GLOBAL_AD_SETTINGS: GlobalAdSettings = {
  adsEnabled: true,
  adsensePublisherId: '',
  adsenseAutoAds: false,
  monetagGlobalEnabled: true,
};

const STORAGE_KEY = 'qorvia_phase1_monetag_ads_v1';

export const DEFAULT_MONETAG_ADS: MonetagAdEntry[] = [
  {
    id: 'monetag-default-inpage',
    name: 'Global Editorial In-Page Push (Sample Slot)',
    zoneId: '',
    format: 'in_page_push',
    placement: 'article_bottom',
    locale: 'all',
    scriptDomain: 'alwingulla.com',
    enabled: false,
    createdAt: '2026-11-01T00:00:00Z',
  },
];

export function isSafeBannerDestinationUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeBannerImageUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  if (trimmed.startsWith('/src/assets/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidAdSensePublisherId(raw: string): boolean {
  return /^ca-pub-[0-9]{10,20}$/.test(raw.trim());
}

export function isValidAdSenseSlotId(raw: string): boolean {
  return /^[0-9]{6,16}$/.test(raw.trim());
}

export function validateMonetagInput(input: {
  name: string;
  zoneId: string;
  format: MonetagFormat;
  placement: AdPlacement;
  scriptDomain?: string;
  directLinkUrl?: string;
}): MonetagValidationResult {
  if (!input.name.trim() || input.name.trim().length < 2) {
    return { valid: false, error: 'Placement name must be at least 2 characters.' };
  }
  const zoneTrimmed = input.zoneId.trim();
  if (!zoneTrimmed) {
    return { valid: false, error: 'Monetag Zone ID is required.' };
  }
  if (!/^[0-9]{4,12}$/.test(zoneTrimmed)) {
    return {
      valid: false,
      error: 'Monetag Zone ID must be a 4 to 12 digit numeric identifier.',
    };
  }
  if (input.format === 'direct_link') {
    const url = (input.directLinkUrl ?? '').trim();
    if (!isSafeBannerDestinationUrl(url)) {
      return {
        valid: false,
        error: 'Direct Link format requires a valid https:// destination URL.',
      };
    }
  }
  return { valid: true };
}

export function validateDirectBannerInput(input: {
  title: string;
  imageUrl: string;
  destinationUrl: string;
  startAt?: string;
  endAt?: string;
}): MonetagValidationResult {
  const title = input.title.trim();
  if (title.length < 2 || title.length > 140) {
    return { valid: false, error: 'Campaign title must be 2 to 140 characters.' };
  }
  if (!isSafeBannerImageUrl(input.imageUrl)) {
    return {
      valid: false,
      error: 'Banner creative requires a valid https:// image URL or Firebase Storage upload.',
    };
  }
  if (!isSafeBannerDestinationUrl(input.destinationUrl)) {
    return {
      valid: false,
      error: 'Sponsor destination URL must be a valid https:// link.',
    };
  }
  if (input.startAt && input.endAt) {
    const startMs = Date.parse(input.startAt);
    const endMs = Date.parse(input.endAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
      return {
        valid: false,
        error: 'Campaign end date/time must be on or after the start date/time.',
      };
    }
  }
  return { valid: true };
}

export function validateAdSenseSlotInput(input: {
  name: string;
  adsenseClient: string;
  adsenseSlot: string;
  format?: AdSenseFormat;
}): MonetagValidationResult {
  if (input.name.trim().length < 2 || input.name.trim().length > 140) {
    return { valid: false, error: 'Slot label must be 2 to 140 characters.' };
  }
  if (!isValidAdSensePublisherId(input.adsenseClient)) {
    return {
      valid: false,
      error: 'AdSense Publisher ID must match ca-pub-XXXXXXXXXXXXXXXX (10 to 20 digits).',
    };
  }
  if (!isValidAdSenseSlotId(input.adsenseSlot)) {
    return {
      valid: false,
      error: 'AdSense Ad Unit Slot ID must be a 6 to 16 digit number.',
    };
  }
  return { valid: true };
}

export function validateGlobalAdSettings(
  settings: GlobalAdSettings
): MonetagValidationResult {
  const pubId = settings.adsensePublisherId.trim();
  if (pubId.length > 0 && !isValidAdSensePublisherId(pubId)) {
    return {
      valid: false,
      error: 'Global AdSense Publisher ID must look like ca-pub-1234567890123456.',
    };
  }
  return { valid: true };
}

export function isCampaignWithinSchedule(
  campaign: Pick<DirectBannerCampaign, 'enabled' | 'startAt' | 'endAt'>,
  nowMs: number = Date.now()
): boolean {
  if (!campaign.enabled) return false;
  if (campaign.startAt) {
    const startMs = Date.parse(campaign.startAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) return false;
  }
  if (campaign.endAt) {
    const endMs = Date.parse(campaign.endAt);
    if (!Number.isNaN(endMs) && nowMs > endMs) return false;
  }
  return true;
}

export type ResolvedPlacementAd =
  | { mode: 'disabled' }
  | { mode: 'unconfigured' }
  | { mode: 'direct_banner'; campaign: DirectBannerCampaign }
  | {
      mode: 'adsense';
      slotName: string;
      adsenseClient: string;
      adsenseSlot: string;
      adsenseFormat: AdSenseFormat;
    }
  | { mode: 'monetag'; entry: MonetagAdEntry };

function matchesLocale(itemLocale: Locale | 'all', activeLocale: Locale): boolean {
  return itemLocale === activeLocale || itemLocale === 'all';
}

function pickBestLocaleMatch<T extends { locale: Locale | 'all' }>(
  items: T[],
  activeLocale: Locale
): T | undefined {
  return (
    items.find((i) => i.locale === activeLocale) ??
    items.find((i) => i.locale === 'all')
  );
}

export function resolvePlacementAd(params: {
  placement: AdPlacement;
  locale: Locale;
  adSlots?: AdSlotConfig[];
  directBanners?: DirectBannerCampaign[];
  monetagAds?: MonetagAdEntry[];
  globalAdSettings?: GlobalAdSettings;
  nowMs?: number;
}): ResolvedPlacementAd {
  const {
    placement,
    locale,
    adSlots = [],
    directBanners = [],
    monetagAds = [],
    globalAdSettings = DEFAULT_GLOBAL_AD_SETTINGS,
    nowMs = Date.now(),
  } = params;

  if (!globalAdSettings.adsEnabled) {
    return { mode: 'disabled' };
  }

  // Check if an explicit placement slot record exists and controls this placement+locale
  const matchingSlots = adSlots.filter(
    (s) => s.placement === placement && matchesLocale(s.locale, locale)
  );
  const slot = pickBestLocaleMatch(matchingSlots, locale);

  if (slot && !slot.enabled) {
    return { mode: 'disabled' };
  }

  const activeBanners = directBanners.filter(
    (b) =>
      b.placement === placement &&
      matchesLocale(b.locale, locale) &&
      isCampaignWithinSchedule(b, nowMs)
  );
  const matchedBanner = pickBestLocaleMatch(activeBanners, locale);

  const activeMonetags = monetagAds.filter(
    (m) =>
      globalAdSettings.monetagGlobalEnabled &&
      m.enabled &&
      m.zoneId.trim().length > 0 &&
      m.placement === placement &&
      matchesLocale(m.locale, locale)
  );
  const matchedMonetag = pickBestLocaleMatch(activeMonetags, locale);

  const hasValidSlotAdSense =
    slot &&
    slot.provider === 'adsense' &&
    isValidAdSenseSlotId(slot.adsenseSlot || '') &&
    isValidAdSensePublisherId(
      (slot.adsenseClient || globalAdSettings.adsensePublisherId || '').trim()
    );

  // If the admin explicitly chose a preferred provider for this slot, honor it first
  if (slot) {
    if (slot.provider === 'direct_banner' && matchedBanner) {
      return { mode: 'direct_banner', campaign: matchedBanner };
    }
    if (slot.provider === 'adsense' && hasValidSlotAdSense) {
      return {
        mode: 'adsense',
        slotName: slot.name,
        adsenseClient: (slot.adsenseClient || globalAdSettings.adsensePublisherId).trim(),
        adsenseSlot: (slot.adsenseSlot || '').trim(),
        adsenseFormat: slot.adsenseFormat || 'auto',
      };
    }
    if (slot.provider === 'monetag' && matchedMonetag) {
      return { mode: 'monetag', entry: matchedMonetag };
    }
  }

  // Fallback priority across enabled campaigns when no strict slot override blocks it
  if (matchedBanner) {
    return { mode: 'direct_banner', campaign: matchedBanner };
  }
  if (hasValidSlotAdSense && slot) {
    return {
      mode: 'adsense',
      slotName: slot.name,
      adsenseClient: (slot.adsenseClient || globalAdSettings.adsensePublisherId).trim(),
      adsenseSlot: (slot.adsenseSlot || '').trim(),
      adsenseFormat: slot.adsenseFormat || 'auto',
    };
  }
  if (matchedMonetag) {
    return { mode: 'monetag', entry: matchedMonetag };
  }

  return { mode: 'unconfigured' };
}

export function loadMonetagAds(storage?: Pick<Storage, 'getItem'>): MonetagAdEntry[] {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return DEFAULT_MONETAG_ADS;
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MONETAG_ADS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_MONETAG_ADS;
  } catch {
    return DEFAULT_MONETAG_ADS;
  }
}

export function saveMonetagAds(
  entries: MonetagAdEntry[],
  storage?: Pick<Storage, 'setItem'>
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (store) {
      store.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function getActiveMonetagForSlot(
  entries: MonetagAdEntry[],
  placement: AdPlacement,
  locale: Locale
): MonetagAdEntry | undefined {
  return entries.find(
    (entry) =>
      entry.enabled &&
      entry.zoneId.trim().length > 0 &&
      entry.placement === placement &&
      (entry.locale === 'all' || entry.locale === locale)
  );
}
